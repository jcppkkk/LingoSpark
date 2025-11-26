import { GoogleGenAI, Type, Schema } from "@google/genai";
import { WordAnalysis, MnemonicOption } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for structured word analysis
const wordAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: "The target word or phrase in English (e.g., 'cat' or 'at the moment' or 'as ... as')" },
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
    mnemonicHint: { type: Type.STRING, description: "A creative visual memory association hint in Traditional Chinese. Describe a scene to help remember the word. If you use English word sounds/homophones in the association, mark them with format: 「中文詞」(英文單字), e.g., 「叫」(call) or 「馴鹿」(reindeer)." },
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
          mnemonicHint: { type: Type.STRING, description: "A NEW, creative visual memory association hint in Traditional Chinese. Must be different from standard definitions. If you use English word sounds/homophones in the association, mark them with format: 「中文詞」(英文單字), e.g., 「叫」(call) or 「馴鹿」(reindeer)." },
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
      description: "List of English vocabulary words and phrases identified in the image. Include both single words (e.g., 'cat', 'dog') and common phrases (e.g., 'at the moment', 'as ... as', 'in the end', 'by the way'). Each item can be a single word or a multi-word phrase."
    }
  }
};

export const analyzeWord = async (word: string): Promise<WordAnalysis> => {
  const isPhrase = word.includes(' ') || word.includes('...');
  
  const prompt = isPhrase ? `
    Act as an expert English teacher for kids. Analyze the English phrase: "${word}".
    
    1. Provide the definition and meaning in Traditional Chinese.
    2. For phrases with variable parts (like "as ... as"), explain the pattern and usage.
    3. Break down the phrase into its key components if applicable.
    4. Create a "Mnemonic Association" (聯想法). Connect the phrase to a fun, visual image or situation. If you use English word sounds/homophones in the association, mark them with format: 「中文詞」(英文單字), e.g., 「叫」(call) or 「馴鹿」(reindeer).
    5. Provide a practical example sentence using this phrase.
    
    For phrases:
    - Use the full phrase as the "word" field
    - For syllables, break down the main words in the phrase
    - For IPA, provide pronunciation for the key words
    - For roots, analyze the main words if applicable
    - Focus on the phrase as a whole unit for the mnemonic
    
    Output strictly in JSON. Use Traditional Chinese for meanings and hints. Make it fun and easy to remember!
  ` : `
    Act as an expert English teacher for kids. Analyze the word: "${word}".
    
    1. Break it down by syllables and mark phonics.
    2. Analyze etymology (roots/prefixes).
    3. Create a "Mnemonic Association" (聯想法). Connect the word's sound (homophones) or spelling to a fun, visual image. If you use English word sounds/homophones in the association, mark them with format: 「中文詞」(英文單字), e.g., 「叫」(call) or 「馴鹿」(reindeer).
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
    
    If you use English word sounds/homophones in the mnemonicHint, mark them with format: 「中文詞」(英文單字), e.g., 「叫」(call) or 「馴鹿」(reindeer).
    
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

// Generate alternative style images with the same mnemonic content
const styleVariations = [
  "watercolor painting style, soft brush strokes, pastel colors",
  "pixel art style, 8-bit retro game aesthetic, pixelated",
  "minimalist line art, simple geometric shapes, clean design",
  "vintage illustration style, classic children's book art",
  "claymation style, 3D clay figures, tactile texture",
  "anime style, Japanese animation aesthetic, vibrant and expressive",
  "sketch style, hand-drawn pencil sketch, artistic shading",
  "pop art style, bold colors, comic book aesthetic"
];

export const generateAlternativeStyleImage = async (word: string, imagePrompt: string): Promise<string> => {
  // Randomly select a style variation
  const randomStyle = styleVariations[Math.floor(Math.random() * styleVariations.length)];
  
  // Generate image with same content but different style
  const prompt = `Generate an image.
    Subject: ${imagePrompt}
    Context: A memory aid for the word "${word}" using the same visual concept but in a different artistic style.
    Style: ${randomStyle}, vibrant colors, clear composition, no text inside the image.`;

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
    console.error("Error generating alternative style image:", error);
    throw error;
  }
};

// Generate 2 alternative style images with the same mnemonic content
export const generateAlternativeStyleOptions = async (word: string, imagePrompt: string, currentImageUrl: string, currentMnemonicHint: string): Promise<MnemonicOption[]> => {
  // Randomly select 2 different style variations
  const shuffledStyles = [...styleVariations].sort(() => Math.random() - 0.5);
  const selectedStyles = shuffledStyles.slice(0, 2);
  
  // Generate images for these styles in parallel
  const imagePromises = selectedStyles.map(async (style) => {
    try {
      const prompt = `Generate an image.
        Subject: ${imagePrompt}
        Context: A memory aid for the word "${word}" using the same visual concept but in a different artistic style.
        Style: ${style}, vibrant colors, clear composition, no text inside the image.`;

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
              const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              return {
                imageUrl,
                mnemonicHint: currentMnemonicHint,
                imagePrompt: imagePrompt
              } as MnemonicOption;
            }
          }
        }
      }
      return null;
    } catch (e) {
      console.error("Failed to generate alternative style image", e);
      return null;
    }
  });

  const results = await Promise.all(imagePromises);
  const validOptions = results.filter(r => r !== null) as MnemonicOption[];
  
  // Add current option as the first option
  const currentOption: MnemonicOption = {
    imageUrl: currentImageUrl,
    mnemonicHint: currentMnemonicHint,
    imagePrompt: imagePrompt
  };
  
  return [currentOption, ...validOptions];
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
    Identify ALL distinct English vocabulary items visible or depicted in the image.
    
    Include BOTH:
    1. Single vocabulary words (e.g., "cat", "dog", "happy")
    2. Common English phrases and idioms (e.g., "at the moment", "as ... as", "in the end", "by the way", "once upon a time", "how are you")
    
    For phrases with variable parts (like "as ... as"), include the full phrase format with ellipsis.
    Do not limit the number of items.
    Return them as a list where each item can be either a single word or a phrase.
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