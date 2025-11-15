export interface Story {
  id: number;
  title: string;
  level: 'Easy' | 'Medium' | 'Hard';
  content: string[];
  color: string;
  hoverColor: string;
  coverImage: string;
}

export interface WordBubbleInfo {
  word: string;
  rect: DOMRect;
  context: string;
}

export type WordCounts = Record<string, number>;