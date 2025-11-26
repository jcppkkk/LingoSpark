import { GoogleGenAI, Type, Schema } from "@google/genai";
import { WordAnalysis, MnemonicOption } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for structured word analysis
const wordAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: "The target word in English" },
    definition: { type: Type.STRING, description: "Definition in Traditional Chinese (繁體中文)" },
    ipa: { type: Type.STRING, description: "IPA phonetic transcription, e.g. /kəmˈpjuːtər/" },
    syllables: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Array of syllables, e.g. ['com', 'pu', 'ter']"
    },
    stressIndex: { type: Type.INTEGER, description: "Index of the stressed syllable (0-based)" },
    roots: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          part: { type: Type.STRING, description: "The morpheme (prefix/root/suffix)" },
          meaning: { type: Type.STRING, description: "Meaning of the part in Traditional Chinese" },
          type: { type: Type.STRING, enum: ["prefix", "root", "suffix"] }
        }
      },
      description: "Etymology breakdown"
    },
    sentence: { type: Type.STRING, description: "A practical, simple English example sentence using the word." },
    sentenceTranslation: { type: Type.STRING, description: "Traditional Chinese translation of the sentence." },
    mnemonicHint: { type: Type.STRING, description: "A creative visual memory association hint in Traditional Chinese. Describe a scene to help remember the word." },
    imagePrompt: { type: Type.STRING, description: "An English prompt describing the visual scene from the mnemonic hint to generate an image." }
  },
  required: ["word", "definition", "ipa", "syllables", "stressIndex", "roots", "sentence", "sentenceTranslation", "mnemonicHint", "imagePrompt"]
};

// Schema for generating alternative mnemonics
const mnemonicOptionsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          mnemonicHint: { type: Type.STRING, description: "A NEW, creative visual memory association hint in Traditional Chinese. Must be different from standard definitions." },
          imagePrompt: { type: Type.STRING, description: "English prompt for generating the image for this hint." }
        },
        required: ["mnemonicHint", "imagePrompt"]
      }
    }
  }
};

// Schema for word extraction from image
const extractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    words: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of simple English vocabulary words identified in the image"
    }
  }
};

export const analyzeWord = async (word: string): Promise<WordAnalysis> => {
  const prompt = `
    Act as an expert English teacher for kids. Analyze the word: "${word}".
    
    1. Break it down by syllables and mark phonics.
    2. Analyze etymology (roots/prefixes).
    3. Create a "Mnemonic Association" (聯想法). Connect the word's sound (homophones) or spelling to a fun, visual image.
    4. Provide a practical sentence.
    
    Output strictly in JSON. Use Traditional Chinese for meanings and hints. Make it fun and easy to remember!
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: wordAnalysisSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as WordAnalysis;
  } catch (error) {
    console.error("Error analyzing word:", error);
    throw error;
  }
};

export const generateMnemonicOptions = async (word: string): Promise<MnemonicOption[]> => {
  // 1. Generate text options first
  const prompt = `
    For the English word "${word}", create 2 DISTINCT and CREATIVE mnemonic visualization strategies to help a child remember it.
    Use puns, sound-alikes, or funny situations.
    
    Example for 'Sausage': 
    1. Visualize a SAW cutting a SAGE plant. (Saw-Sage)
    
    Output JSON with 'mnemonicHint' (Traditional Chinese) and 'imagePrompt' (English).
  `;

  try {
    const textResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: mnemonicOptionsSchema,
      },
    });

    const data = JSON.parse(textResponse.text || "{}");
    if (!data.options || !Array.isArray(data.options)) throw new Error("Invalid format");

    const options = data.options.slice(0, 2);

    // 2. Generate images for these options in parallel
    const imagePromises = options.map(async (opt: any) => {
      try {
        const url = await generateMnemonicImage(word, opt.imagePrompt);
        return {
          imageUrl: url,
          mnemonicHint: opt.mnemonicHint,
          imagePrompt: opt.imagePrompt
        } as MnemonicOption;
      } catch (e) {
        console.error("Failed to generate image for option", e);
        return null;
      }
    });

    const results = await Promise.all(imagePromises);
    return results.filter(r => r !== null) as MnemonicOption[];

  } catch (error) {
    console.error("Error generating mnemonic options:", error);
    throw error;
  }
};

export const generateMnemonicImage = async (word: string, imagePrompt: string): Promise<string> => {
  // Explicitly command to generate an image
  const prompt = `Generate an image.
    Subject: ${imagePrompt}
    Context: A cute, cartoon-style memory aid for the word "${word}".
    Style: 3D cartoon, vibrant colors, clear outlines, stickers style, no text inside the image.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      } 
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const content = candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
             return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }
    
    const textPart = candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
    if (textPart) {
        console.warn("Model returned text instead of image:", textPart);
        throw new Error("AI returned text explanation instead of image");
    }

    throw new Error("No image data returned");

  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const extractWordsFromImage = async (base64Data: string): Promise<string[]> => {
  // Clean base64 string
  const parts = base64Data.split(',');
  const mimeMatch = base64Data.match(/:(.*?);/);
  
  if (parts.length !== 2 || !mimeMatch) {
     throw new Error("Invalid image data");
  }

  const base64 = parts[1];
  const mimeType = mimeMatch[1];

  const prompt = `
    Analyze this image for a language learning app.
    Identify ALL distinct English vocabulary words visible or depicted in the image.
    Do not limit the number of words.
    Return them as a list of simple, single English vocabulary words.
    Return strictly JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
      },
    });

    const text = response.text;
    if (!text) return [];
    const data = JSON.parse(text);
    return data.words || [];
  } catch (error) {
    console.error("Error extracting words from image:", error);
    return [];
  }
};