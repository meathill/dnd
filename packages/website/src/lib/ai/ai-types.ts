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

export type AiModelKind = 'fast' | 'general';

export type AiModelOption = {
  id: string;
  provider: AiProvider;
  modelId: string;
  kind: AiModelKind;
  label: string;
  description: string;
  hasCustomEndpoint: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type AiModelRecord = AiModelOption & {
  baseUrl: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
};

export type AiModelInput = {
  provider: AiProvider;
  modelId: string;
  kind: AiModelKind;
  label: string;
  description?: string;
  baseUrl?: string;
  apiKey?: string;
  sortOrder?: number;
  isActive?: boolean;
};
