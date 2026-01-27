import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { AiGenerateRequest, AiGenerateResponse, AiMessage } from './ai-types';

type OpenAiChatMessage = {
  role: 'system' | 'developer' | 'user' | 'assistant';
  content: string;
};

type OpenAiResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

type GeminiContent = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_OPENAI_MODEL = 'gpt-5-mini';
const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

function normalizeOpenAiMessages(messages: AiMessage[]): OpenAiChatMessage[] {
  return messages
    .filter((message) => message.content.trim().length > 0)
    .map((message) => {
      const role = message.role === 'developer' ? 'system' : message.role;
      return {
        role,
        content: message.content,
      };
    });
}

function buildGeminiContents(messages: AiMessage[]): GeminiContent[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .filter((message) => message.content.trim().length > 0)
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
}

function buildGeminiSystemInstruction(messages: AiMessage[]): { parts: Array<{ text: string }> } | undefined {
  const systemText = messages
    .filter((message) => message.role === 'system' || message.role === 'developer')
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join('\n\n');

  if (!systemText) {
    return undefined;
  }

  return { parts: [{ text: systemText }] };
}

async function* streamTextChunks(text: string, chunkSize = 24): AsyncGenerator<string> {
  for (let index = 0; index < text.length; index += chunkSize) {
    yield text.slice(index, index + chunkSize);
  }
}

async function requestOpenAiCompletion(request: AiGenerateRequest): Promise<AiGenerateResponse> {
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.OPENAI_API_KEY;
  const model = request.model ?? env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
  const messages = normalizeOpenAiMessages(request.messages);

  if (!apiKey) {
    throw new Error('缺少环境变量：OPENAI_API_KEY');
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: request.temperature,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI 请求失败：${response.status} ${text}`);
  }

  const data = (await response.json()) as OpenAiResponse;
  const text = data.choices?.[0]?.message?.content ?? '';

  if (!text) {
    throw new Error(data.error?.message ?? 'OpenAI 未返回文本内容');
  }

  return {
    provider: 'openai',
    model,
    text,
  };
}

async function* streamOpenAiCompletion(request: AiGenerateRequest): AsyncGenerator<string> {
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.OPENAI_API_KEY;
  const model = request.model ?? env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
  const messages = normalizeOpenAiMessages(request.messages);

  if (!apiKey) {
    throw new Error('缺少环境变量：OPENAI_API_KEY');
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: request.temperature,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI 请求失败：${response.status}`);
  }

  if (!response.body) {
    const fallback = await requestOpenAiCompletion(request);
    yield* streamTextChunks(fallback.text);
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  const reader = response.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const dataLine = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
      if (dataLine === '[DONE]') {
        return;
      }
      try {
        const data = JSON.parse(dataLine) as { choices?: Array<{ delta?: { content?: string } }> };
        const delta = data.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          yield delta;
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }
}

async function requestGeminiCompletion(request: AiGenerateRequest): Promise<AiGenerateResponse> {
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.GEMINI_API_KEY;
  const model = request.model ?? env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const contents = buildGeminiContents(request.messages);
  const systemInstruction = buildGeminiSystemInstruction(request.messages);

  if (!apiKey) {
    throw new Error('缺少环境变量：GEMINI_API_KEY');
  }

  const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      systemInstruction,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini 请求失败：${response.status}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? '').join('');

  if (!text) {
    throw new Error(data.error?.message ?? 'Gemini 未返回文本内容');
  }

  return {
    provider: 'gemini',
    model,
    text,
  };
}

async function* streamGeminiCompletion(request: AiGenerateRequest): AsyncGenerator<string> {
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.GEMINI_API_KEY;
  const model = request.model ?? env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const contents = buildGeminiContents(request.messages);
  const systemInstruction = buildGeminiSystemInstruction(request.messages);

  if (!apiKey) {
    throw new Error('缺少环境变量：GEMINI_API_KEY');
  }

  const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:streamGenerateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      systemInstruction,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini 请求失败：${response.status}`);
  }

  if (!response.body) {
    const fallback = await requestGeminiCompletion(request);
    yield* streamTextChunks(fallback.text);
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  const reader = response.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const dataLine = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
      if (dataLine === '[DONE]') {
        return;
      }
      try {
        const data = JSON.parse(dataLine) as GeminiResponse;
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const text = parts.map((part) => part.text ?? '').join('');
        if (text) {
          yield text;
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }
}

export async function generateChatCompletion(request: AiGenerateRequest): Promise<AiGenerateResponse> {
  if (request.provider === 'openai') {
    return requestOpenAiCompletion(request);
  }

  if (request.provider === 'gemini') {
    return requestGeminiCompletion(request);
  }

  throw new Error(`不支持的 provider：${request.provider}`);
}

export async function* streamChatCompletion(request: AiGenerateRequest): AsyncGenerator<string> {
  if (request.provider === 'openai') {
    yield* streamOpenAiCompletion(request);
    return;
  }
  if (request.provider === 'gemini') {
    yield* streamGeminiCompletion(request);
    return;
  }
  throw new Error(`不支持的 provider：${request.provider}`);
}
