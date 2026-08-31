export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  picture?: string;
}

export interface Conversation {
  _id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
  _id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  suggestions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AssistantResponse {
  narration: string;
  dialogue: Array<{ character: string; text: string }>;
  suggested_actions: string[];
  new_information: unknown[];
  scene_status: string;
}

export interface DeluluFormData {
  name: string;
  gender: string;
  age: string;
  genre: string;
  plot: string;
  tragicLevel: number;
  dramaLevel: number;
}

export const GENRES = [
  'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller',
  'Horror', 'Adventure', 'Action', 'Historical Fiction', 'Drama',
  'Comedy', 'Crime', 'Young Adult', 'Dystopian', 'Post-Apocalyptic',
  'Supernatural', 'Psychological Fiction', 'Western', 'Slice of Life',
  'Fairy Tale', 'Folklore',
] as const;

export const GENDERS = ['Female', 'Male', 'Non-binary', 'Other'] as const;
