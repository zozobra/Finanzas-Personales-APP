import { GoogleGenAI, Type } from "@google/genai";
import { AiParsedResult } from '../types';

// Lazy initialization singleton
let aiInstance: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI | null => {
  if (aiInstance) return aiInstance;
  
  try {
    // @ts-ignore
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return aiInstance;
  } catch (error) {
    console.error("Failed to initialize Gemini Client:", error);
    return null;
  }
};

// Helper to convert Blob to Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (base64String && base64String.includes(',')) {
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
      } else {
          resolve('');
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetches the current Dolar MEP rate using Google Search Grounding.
 */
export const fetchDolarMep = async (): Promise<number> => {
  const ai = getAiClient();
  if (!ai) return 1180; // Default fallback

  try {
    // Very specific prompt to avoid formatting issues
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Busca la cotización actual del 'Dolar MEP' (Bolsa) venta en Argentina hoy. Responde ÚNICAMENTE con el número usando punto (.) como separador decimal y SIN separadores de miles. Ejemplo: 1185.50",
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0,
      },
    });

    const text = response.text || "";
    // Regex to find a number like 1180.50 or 1180
    // We look for a number between 800 and 2000 to be safe and avoid millions
    const match = text.match(/(\d{3,4}(?:\.\d{1,2})?)/);
    
    if (match) {
        let val = parseFloat(match[0]);
        
        // Sanity check: MEP should be roughly between 800 and 2500 ARS currently.
        // If we get something like 148185, it's likely a parsing error (1481.85 read as integer) or crazy data.
        if (val > 100000) {
            val = val / 100; // Attempt to fix missing decimal
        }

        if (val > 800 && val < 2500) {
           return val;
        }
    }
    return 1180; // Fallback safe value
  } catch (error) {
    console.error("Error fetching MEP:", error);
    return 1180; // Fallback
  }
};

/**
 * Fetches the current price of a specific asset (stock/ticker) in USD.
 */
export const fetchAssetPrice = async (assetName: string): Promise<number> => {
  const ai = getAiClient();
  if (!ai) return 0;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `What is the current market price of ${assetName} (ticker) in USD? Return only the number.`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0,
      },
    });

    const text = response.text || "";
    const match = text.match(/(\d+[.,]?\d*)/);
    if (match) {
        const val = parseFloat(match[0].replace(/,/g, ''));
        return isNaN(val) ? 0 : val;
    }
    return 0;
  } catch (error) {
    console.error(`Error fetching price for ${assetName}:`, error);
    return 0;
  }
};

/**
 * Processes natural language (text) or audio to extract transaction details.
 */
export const processFinancialInput = async (
  input: string | Blob, 
  currentMep: number
): Promise<AiParsedResult | null> => {
  const ai = getAiClient();
  if (!ai) {
      alert("API Key missing. Cannot process AI request.");
      return null;
  }
  try {
    const model = "gemini-2.5-flash";
    
    let parts: any[] = [];
    
    if (typeof input === 'string') {
        parts.push({ text: input });
    } else {
        // Convert Blob to Base64
        const base64Data = await blobToBase64(input);
        parts.push({
            inlineData: {
                mimeType: input.type,
                data: base64Data
            }
        });
    }

    const prompt = `
    You are a financial assistant. Analyze the user input (audio or text) to extract financial transaction details.
    The user is likely speaking in Spanish about expenses, income, or investments in Argentina.
    Current Dolar MEP rate is ${currentMep} ARS.
    
    Identify the TYPE: 'expense', 'income', 'investment', or 'saving'.
    
    If it's an EXPENSE: 
    - Extract category (Food, Rent, Utilities, Entertainment, etc.).
    - Extract concept and amount in ARS.
    - ANALYZE SENTIMENT: Detect the emotional tone of the input (positive, negative, or neutral).
    - SUGGEST TAGS: Based on the content and sentiment, suggest 1-3 short tags.
    
    If it's an INVESTMENT: 
    - Extract the Asset Name (e.g., SPY500, Apple, Bitcoin).
    - Classify 'investmentType' as 'crypto' (if BTC, ETH, SOL, Crypto) or 'traditional' (Stocks, Bonds, CEDEARs).
    - Extract amount invested in ARS.
    
    If it's SAVING (Ahorro):
    - Extract concept (e.g., 'Compra dolares', 'Ahorro mes')
    - Extract amount in ARS.

    If it's INCOME: extract source and amount.
    
    Return JSON.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
            ...parts,
            { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: ["expense", "investment", "income", "saving", "unknown"] },
                concept: { type: Type.STRING },
                amountARS: { type: Type.NUMBER },
                assetName: { type: Type.STRING },
                category: { type: Type.STRING },
                sentiment: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                investmentType: { type: Type.STRING, enum: ["traditional", "crypto"] }
            },
            required: ["type", "amountARS"]
        }
      }
    });

    let jsonString = response.text || "";
    // Clean markdown code blocks if present
    if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    if (jsonString) {
        return JSON.parse(jsonString) as AiParsedResult;
    }
    return null;

  } catch (error) {
    console.error("Error processing financial input:", error);
    return null;
  }
};