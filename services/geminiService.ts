
import { GoogleGenAI } from "@google/genai";

export async function getSafetyAdvice(routeDescription: string): Promise<string> {
  // Always create a new instance right before use to ensure updated key usage
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `As a Women's Safety Advisor, give a concise, reassuring, and practical safety advice (2-3 sentences) for a trip from ${routeDescription}. Mention why street lights and police stations are important for the current time of day.`,
    });
    return response.text || "Stay alert and keep your emergency contacts informed. Follow the primary route for maximum safety.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ensure your phone is charged and share your live location with a trusted contact.";
  }
}
