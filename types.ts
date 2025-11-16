export interface ComprehensionQuestion {
  question: string;
  answer: string;
}

export interface Story {
  id: number;
  title: string;
  level: 'Easy' | 'Medium' | 'Hard' | 'Super Hard';
  content: string[];
  color: string;
  hoverColor: string;
  coverImage: string;
  coverPrompt?: string;
  questions?: ComprehensionQuestion[];
}

export interface WordBubbleInfo {
  word: string;
  rect: DOMRect;
  context: string;
}

export type WordCounts = Record<string, number>;