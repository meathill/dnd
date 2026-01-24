import { NextResponse } from 'next/server';
import { generateChatCompletion } from '../../../lib/ai/ai-provider';
import type { AiGenerateRequest, AiMessage, AiProvider } from '../../../lib/ai/ai-types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAiProvider(value: unknown): value is AiProvider {
  return value === 'openai' || value === 'gemini';
}

function parseMessages(value: unknown): AiMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => isRecord(item))
    .map((item) => ({
      role: item.role,
      content: item.content,
    }))
    .filter((item): item is AiMessage => typeof item.role === 'string' && typeof item.content === 'string')
    .map((item) => ({
      role: item.role as AiMessage['role'],
      content: item.content,
    }));
}

function parseNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function buildRequest(body: unknown): AiGenerateRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const provider = body.provider;
  if (!isAiProvider(provider)) {
    return null;
  }

  const messages = parseMessages(body.messages);
  if (messages.length === 0) {
    return null;
  }

  return {
    provider,
    messages,
    model: typeof body.model === 'string' ? body.model : undefined,
    temperature: parseNumber(body.temperature),
    maxOutputTokens: parseNumber(body.maxOutputTokens),
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }

  const aiRequest = buildRequest(body);
  if (!aiRequest) {
    return NextResponse.json({ error: '请求参数不完整' }, { status: 400 });
  }

  try {
    const result = await generateChatCompletion(aiRequest);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 请求失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
