export type AiProvider = 'openai' | 'gemini';

export type AiMessageRole = 'system' | 'developer' | 'user' | 'assistant';

export type AiMessage = {
  role: AiMessageRole;
  content: string;
};

export type AiGenerateRequest = {
  provider: AiProvider;
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type AiGenerateResponse = {
  provider: AiProvider;
  model: string;
  text: string;
};

export type AiImageRequest = {
  provider: AiProvider;
  prompt: string;
  model?: string;
  size?: string;
};

export type AiImageResponse = {
  provider: AiProvider;
  model: string;
  mimeType: string;
  base64: string;
};
