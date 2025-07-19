import OpenAI from "openai";

// Lazy OpenAI initialization - will be created when needed
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

interface ParsedFood {
  name: string;
  quantity?: number;
  unit?: string;
}

export async function parseNaturalLanguageEntry(
  text: string
): Promise<ParsedFood[]> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a nutrition assistant that parses natural language meal descriptions into structured data.
          Your primary goal is to identify individual ingredients for accurate nutritional tracking.
          - If a user enters a common composite dish (e.g., "Chicken Parmesan", "Caesar Salad"), break it down into its main, loggable ingredients.
          - For simple items, keep them as is.
          - Respond ONLY with a JSON array of food items, nothing else.
          
          Example input 1: "I had 2 eggs, a slice of toast with butter, and a large banana"
          Example output 1: [
            {"name": "eggs", "quantity": 2},
            {"name": "toast", "quantity": 1, "unit": "slice"},
            {"name": "butter"},
            {"name": "banana", "quantity": 1, "unit": "large"}
          ]

          Example input 2: "A bowl of chicken parm"
          Example output 2: [
            {"name": "breaded chicken breast", "quantity": 1},
            {"name": "spaghetti", "quantity": 1, "unit": "cup"},
            {"name": "tomato sauce", "quantity": 0.5, "unit": "cup"},
            {"name": "parmesan cheese", "quantity": 2, "unit": "tablespoons"}
          ]

          Example input 3: "tuna sandwich"
          Example output 3: [
            {"name": "tuna salad", "quantity": 1, "unit": "serving"},
            {"name": "white bread", "quantity": 2, "unit": "slices"}
          ]`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    try {
      return JSON.parse(content);
    } catch {
      console.error("Error parsing OpenAI response as JSON:", content);
      throw new Error("Failed to parse OpenAI response as JSON");
    }
  } catch (error) {
    console.error("Error parsing food with OpenAI:", error);
    throw error;
  }
}

/**
 * Transcribes audio to text using OpenAI's Whisper model
 * @param audioBlob The audio blob to transcribe
 * @returns A promise that resolves to the transcribed text
 */
export async function transcribeAudioToText(audioBlob: Blob): Promise<string> {
  try {
    // Convert blob to file
    const file = new File([audioBlob], "audio.webm", { type: audioBlob.type });

    // Call OpenAI transcription API
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en",
    });

    return transcription.text;
  } catch (error) {
    console.error("Error transcribing audio with OpenAI:", error);
    throw error;
  }
}
