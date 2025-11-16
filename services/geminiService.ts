// Fix: Added GenerateContentResponse to imports for proper typing.
import { GoogleGenAI, Modality, GenerateContentResponse, Type } from "@google/genai";
import { decode, decodeAudioData } from '../utils/audio';
import type { Story, ComprehensionQuestion } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// In-memory caches for the current session to avoid re-processing from localStorage
const imageCache = new Map<string, string>();
const audioCache = new Map<string, AudioBuffer>();
const storyAudioCache = new Map<number, AudioBuffer>();

// Words for feelings, states, or abstract ideas.
// These will be generated as simple, context-free cartoon illustrations.
const ABSTRACT_CONCEPT_WORDS = new Set([
  'happy', 'sad', 'angry', 'scared', 'surprised', 'brave', 'friendly',
  'kind', 'caring', 'empathy', 'busy', 'sleepy', 'hungry', 'thirsty',
  'funny', 'silly', 'proud', 'cozy', 'sick', 'better', 'fun', 'worried',
  'delicious', 'tasty', 'yummy', 'beautiful', 'great', 'perfect', 'bittersweet',
  'feeling better', 'happy songs', 'funny jokes', 'sore throat',
  'words he did not understand', 'best friends', 'robot brain', 'computer brain'
]);

// Words for tangible things, animals, places, and objects that exist in the real world.
// These will be generated as realistic photographs.
const REAL_WORLD_NOUNS = new Set([
  // Animals
  'puppy', 'happy puppy', 'cat', 'bird', 'bear', 'squirrel', 'rabbit', 'orangutan', 'hornbill', 'sun bear', 'camel', 'toucan', 'butterflies', 'bugs', 'eagles', 'animals', 'monkeys', 'fish',
  // Objects
  'red ball', 'blue bowl', 'building blocks', 'bright paints', 'thermometer', 'story book', 'teddy bear', 'blanket', 'bed', 'door', 'window', 'house', 'rug', 'tower', 'tall tower', 'box', 'paper', 'map', 'hat', 'ladder', 'swings', 'rock', 'painted rock', 'treasure', 'kite', 'globe', 'robot', 'machine', 'wing', 'brace', 'twig', 'bottle cap',
  // Nature & Places
  'pine tree', 'red ornaments', 'green grass', 'fresh leaves', 'oak tree', 'flower forest', 'flowers', 'garden', 'park', 'paddy field', 'night market', 'pasar malam', 'tea plantations', 'Cameron Highlands', 'Rainforests of Borneo', 'Amazon Rainforest', 'Eiffel Tower', 'Great Pyramids', 'Petronas Twin Towers', 'jungle', 'village', 'backyard', 'mountain', 'forest', 'wind', 'Kuala Lumpur', 'Langkawi', 'sun', 'moon', 'full moon', 'sky', 'clouds', 'water', 'rain', 'waterfall', 'cascading water', 'vine bridges', 'rivers', 'path', 'puddles', 'lawn', 'leaf', 'trees', 'bushes', 'moonlight', 'sand', 'desert', 'canopy', 'stars',
  // Food
  'tasty cookies', 'chicken soup', 'peanut sauce', 'lentil curry', 'croissant', 'sushi', 'shaved ice', 'sweet corn', 'red beans', 'ais kacang', 'roti canai', 'sprinkles', 'hot cocoa', 'carrot', 'food', 'satay', 'chicken', 'bread', 'dough', 'treat', 'syrups', 'jelly', 'rice',
  // People & Body Parts
  'face', 'tail', 'fur', 'eyes', 'nose', 'sister', 'dad', 'mom', 'parents', 'family', 'family picture', 'man', 'people', 'grandfather', 'guide', 'head', 'throat', 'voice', 'forehead', 'hand', 'hair', 'arms', 'beak', 'eyelashes',
  // Misc
  'winter day', 'party', 'playroom', 'smile', 'hug', 'fever', 'school', 'nap', 'adventure', 'lights', 'stalls', 'stick', 'griddle', 'rainbow', 'bowl', 'spoon', 'feast', 'workshop', 'patterns', 'heart', 'peaks', 'team', 'home', 'light', 'room', 'Paris', 'Egypt', 'Japan', 'Brazil', 'sneeze',
]);

// Words for fantasy or magical things that do not exist in real life.
// These will be generated as beautiful, imaginative illustrations.
const FANTASY_NOUNS = new Set([
  'monster', 'fluffy monster', 'dragon', 'wau bulan', 'moon-kite', 'heart of the forest'
]);


export async function generateImageForWord(word: string, context: string): Promise<string> {
  const cacheKey = `${word.toLowerCase()}|${context}`;
  
  // 1. Check in-memory cache first for session speed
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  // 2. Check localStorage for persistent storage
  const storageKey = `bookibee-img-${cacheKey}`;
  try {
    const storedImage = localStorage.getItem(storageKey);
    if (storedImage) {
      imageCache.set(cacheKey, storedImage); // warm up in-memory cache
      return storedImage;
    }
  } catch (error) {
    console.warn("Could not read from localStorage", error);
  }

  // 3. Generate image if not in cache
  const lowerCaseWord = word.toLowerCase();
  
  let prompt: string;
  if (REAL_WORLD_NOUNS.has(lowerCaseWord)) {
    // For tangible, real-world things, STRICTLY generate a high-quality, context-free photograph.
    prompt = `A high-quality, vibrant, child-friendly, realistic photograph of "${word}". The subject is the main focus, shown clearly against a simple, clean background. IMPORTANT: This MUST be a real photo. Absolutely no cartoons, illustrations, drawings, or text in the image.`;
  } else if (ABSTRACT_CONCEPT_WORDS.has(lowerCaseWord)) {
    // For abstract concepts and feelings, generate a simple, cute illustration without context.
    prompt = `A simple, cute, and colorful cartoon illustration representing the idea of "${word}", for a child. No words or text in the image.`;
  } else if (FANTASY_NOUNS.has(lowerCaseWord)) {
    // For fantasy concepts, generate a beautiful, imaginative illustration.
    prompt = `A beautiful, whimsical, and colorful illustration of "${word}", for a children's storybook. The style should be magical and imaginative. No words or text in the image.`;
  } else {
    // Default to a context-free illustration for any other word.
    prompt = `A simple, cute, and colorful cartoon illustration of "${word}", for a child. The style should be simple and easy for a child to understand. No words or text in the image.`;
  }

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
      
      // Cache the result
      imageCache.set(cacheKey, imageUrl);
      try {
        localStorage.setItem(storageKey, imageUrl);
      } catch (error) {
        console.warn("Could not write to localStorage", error);
      }

      return imageUrl;
    }
  }

  throw new Error("Image generation failed: no image data in response.");
}

// Fix: Implemented getAudioContext to provide a singleton AudioContext instance.
let audioContext: AudioContext | null = null;
export function getAudioContext(): AudioContext {
  if (!audioContext) {
    // Gemini TTS output is 24000Hz
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
}

// Fix: Implemented generateAudioForWord to fetch word pronunciation using Gemini TTS.
export async function generateAudioForWord(word: string): Promise<AudioBuffer> {
    const cacheKey = word.toLowerCase();
    
    // 1. Check in-memory cache
    if (audioCache.has(cacheKey)) {
        return audioCache.get(cacheKey)!;
    }

    // 2. Check localStorage
    const storageKey = `bookibee-audio-${cacheKey}`;
    try {
        const storedAudio = localStorage.getItem(storageKey);
        if (storedAudio) {
            const buffer = await decodeAudioData(decode(storedAudio), getAudioContext(), 24000, 1);
            audioCache.set(cacheKey, buffer);
            return buffer;
        }
    } catch (error) {
        console.warn("Could not read audio from localStorage", error);
    }
    
    // 3. Generate audio
    const prompt = `Say this word clearly for a child: ${word}`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        const audioBuffer = await decodeAudioData(decode(base64Audio), getAudioContext(), 24000, 1);
        
        // Cache it
        audioCache.set(cacheKey, audioBuffer);
        try {
            localStorage.setItem(storageKey, base64Audio);
        } catch (error) {
            console.warn("Could not write audio to localStorage", error);
        }
        
        return audioBuffer;
    }

    throw new Error("Audio generation failed.");
}

export async function generateAudioForStory(storyId: number, storyContent: string): Promise<AudioBuffer> {
    const cacheKey = storyId;

    // 1. Check in-memory cache
    if (storyAudioCache.has(cacheKey)) {
        return storyAudioCache.get(cacheKey)!;
    }

    // 2. Check localStorage
    const storageKey = `bookibee-story-audio-${cacheKey}`;
    try {
        const storedAudio = localStorage.getItem(storageKey);
        if (storedAudio) {
            const buffer = await decodeAudioData(decode(storedAudio), getAudioContext(), 24000, 1);
            storyAudioCache.set(cacheKey, buffer);
            return buffer;
        }
    } catch (error) {
        console.warn("Could not read story audio from localStorage", error);
    }
    
    // 3. Generate audio
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: storyContent }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        const audioBuffer = await decodeAudioData(decode(base64Audio), getAudioContext(), 24000, 1);
        
        // Cache it
        storyAudioCache.set(cacheKey, audioBuffer);
        try {
            localStorage.setItem(storageKey, base64Audio);
        } catch (error) {
            console.warn("Could not write story audio to localStorage", error);
        }
        
        return audioBuffer;
    }

    throw new Error("Story audio generation failed.");
}


// Fix: Added summarizeStoryForImagePrompt to generate a concise image prompt from story content.
export async function summarizeStoryForImagePrompt(title: string, content: string): Promise<string> {
  const prompt = `You are a creative assistant for a children's storybook app. Your task is to summarize a story into a concise, vivid, and child-friendly image prompt for generating a cover illustration. The prompt should capture the main character, the setting, and the key action or mood of the story.

Story Title: "${title}"
Story Content:
---
${content}
---

Based on the story, create a single, descriptive prompt for an image generator. The prompt should be in the style of "A beautiful, whimsical, and colorful illustration of...". Do not include any explanations, just the prompt itself.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text.trim();
}

// Fix: Added generateStoryCover to generate a cover image from a given prompt.
export async function generateStoryCover(prompt: string): Promise<string> {
    const fullPrompt = `${prompt}. The style should be beautiful, whimsical, colorful, and suitable for a children's storybook cover. No words or text in the image.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: fullPrompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
    }

    throw new Error("Story cover generation failed: no image data in response.");
}

export async function generateStory(userPrompt: string, cefrLevel: string): Promise<{ title: string; content: string[] }> {
  const model = 'gemini-2.5-pro';

  const instruction = `You are a creative and talented author who writes short stories for children aged 4-8. 
  Your task is to generate a new story based on a user's prompt and a specified language difficulty level.
  The story must be engaging, age-appropriate, and have a positive or gentle message.
  You must return the story in a specific JSON format.
  
  The language complexity of the story MUST correspond to the CEFR level: ${cefrLevel}.
  - A1: Very basic words and simple sentences.
  - A2: Basic vocabulary, compound sentences.
  - B1: Intermediate vocabulary, more complex sentence structures.
  - B2 and above: Richer vocabulary, complex and varied sentences.
  
  The JSON object must contain two fields:
  1.  "title": A creative and short title for the story (string).
  2.  "content": The story text, split into an array of short paragraphs (string[]). Aim for 2-4 paragraphs.
  
  User's prompt: "${userPrompt}"`;

  const response = await ai.models.generateContent({
    model: model,
    contents: instruction,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "content"]
      }
    }
  });
  
  const jsonText = response.text.trim();
  const storyData = JSON.parse(jsonText);

  // Basic validation
  if (!storyData.title || !storyData.content || !Array.isArray(storyData.content)) {
    throw new Error("Invalid story format received from API.");
  }

  return storyData;
}

export async function getOrGenerateComprehensionQuestions(storyId: number, storyContent: string): Promise<ComprehensionQuestion[]> {
  const storageKey = `bookibee-questions-${storyId}`;

  // 1. Check localStorage first
  try {
    const storedQuestions = localStorage.getItem(storageKey);
    if (storedQuestions) {
      return JSON.parse(storedQuestions);
    }
  } catch (error) {
    console.warn("Could not read questions from localStorage", error);
  }

  // 2. Generate if not in cache
  const model = 'gemini-2.5-pro';
  const instruction = `You are a helpful assistant for a children's reading app. 
  Based on the following story, create 3 simple comprehension questions that a child aged 4-8 can answer.
  The questions should test their understanding of the main characters, events, or details in the story.
  Return the questions and their answers in a specific JSON format.
  
  The JSON object must be an array of objects, where each object has two fields:
  1. "question": The question text (string).
  2. "answer": A short, clear answer to the question (string).
  
  Story Content:
  ---
  ${storyContent}
  ---
  
  Generate exactly 3 questions.`;

  const response = await ai.models.generateContent({
    model: model,
    contents: instruction,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING }
          },
          required: ["question", "answer"]
        }
      }
    }
  });

  const jsonText = response.text.trim();
  const questionsData = JSON.parse(jsonText) as ComprehensionQuestion[];

  // Basic validation
  if (!Array.isArray(questionsData) || questionsData.some(q => !q.question || !q.answer)) {
    throw new Error("Invalid questions format received from API.");
  }
  
  // 3. Cache the result in localStorage
  try {
    localStorage.setItem(storageKey, JSON.stringify(questionsData));
  } catch (error) {
    console.warn("Could not write questions to localStorage", error);
  }

  return questionsData;
}


// Fix: Implemented clearCaches to clear all in-memory session caches.
export function clearCaches(): void {
    imageCache.clear();
    audioCache.clear();
    storyAudioCache.clear();
    console.log("Session caches cleared.");
}