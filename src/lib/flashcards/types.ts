export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface Flashcard {
  id: string;
  frontContent: string;
  backContent: string;
  subject: string;
  lawTagId?: string;
  questionId?: string;
  errorEntryId?: string;
  interval: number; // Interval in days
  repetitions: number; // Count of successful consecutive reviews
  easeFactor: number; // SM-2 ease factor (default 2.5, min 1.3)
  dueDate: string; // ISO date string (YYYY-MM-DD or full ISO string)
  createdAt: string;
  updatedAt: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: ReviewRating;
  previousInterval: number;
  nextInterval: number;
  previousEaseFactor: number;
  nextEaseFactor: number;
  timestamp: string;
}

export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: string;
}

export interface DeckSummary {
  subject: string;
  totalCards: number;
  dueCards: number;
  newCards: number;
}
