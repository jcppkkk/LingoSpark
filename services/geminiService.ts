import { GoogleGenAI, Type, Schema } from "@google/genai";
import { WordAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: (import.meta.env.API_KEY || import.meta.env.GEMINI_API_KEY) as string });

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
    sentence: { type: Type.STRING, description: "A simple, practical English example sentence suitable for third-grade elementary students. Use simple vocabulary and clear structure." },
    sentenceTranslation: { type: Type.STRING, description: "Traditional Chinese translation of the sentence, suitable for third-grade students." },
    imagePrompt: { type: Type.STRING, description: "An English prompt describing a visual scene to help remember the word. Create a fun, cartoon-style image description suitable for children." }
  },
  required: ["word", "definition", "ipa", "syllables", "stressIndex", "roots", "sentence", "sentenceTranslation", "imagePrompt"]
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

// @ARCH: geminiService - FEAT: 分析單字
export const analyzeWord = async (word: string): Promise<WordAnalysis> => {
  const isPhrase = word.includes(' ') || word.includes('...');
  
  const prompt = isPhrase ? `
    Act as an expert English teacher for third-grade elementary students. Analyze the English phrase: "${word}".
    
    1. Provide a clear, simple definition in Traditional Chinese suitable for third-grade students.
    2. For phrases with variable parts (like "as ... as"), explain the pattern and usage in simple terms.
    3. Break down the phrase into its key components if applicable.
    4. Provide a simple, practical example sentence using this phrase. The sentence should use vocabulary appropriate for third-grade students.
    5. Create a visual image prompt in English that describes a fun, cartoon-style scene to help remember the phrase. The description should be suitable for generating a children's illustration.
    
    For phrases:
    - Use the full phrase as the "word" field
    - For syllables, break down the main words in the phrase
    - For IPA, provide pronunciation for the key words
    - For roots, analyze the main words if applicable
    
    Output strictly in JSON. Use Traditional Chinese for meanings. Keep everything simple and suitable for third-grade students!
  ` : `
    Act as an expert English teacher for third-grade elementary students. Analyze the word: "${word}".
    
    1. Break it down by syllables and mark phonics.
    2. Analyze etymology (roots/prefixes) in simple terms.
    3. Provide a simple, practical sentence using this word. The sentence should use vocabulary appropriate for third-grade students.
    4. Create a visual image prompt in English that describes a fun, cartoon-style scene to help remember the word. The description should be suitable for generating a children's illustration.
    
    Output strictly in JSON. Use Traditional Chinese for meanings. Keep everything simple and suitable for third-grade students!
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

/**
 * 生成單字記憶圖片
 * @param word 單字
 * @param imagePrompt 圖像生成提示
 * @returns Base64 編碼的圖片數據
 */
// @ARCH: geminiService - FEAT: 生成記憶圖片
export const generateMnemonicImage = async (word: string, imagePrompt: string): Promise<string> => {
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

// @ARCH: geminiService - FEAT: 從圖片提取單字
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
