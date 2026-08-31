import type { AssistantResponse, Conversation, Message, User } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const BASE =
  API_BASE_URL && import.meta.env.DEV
    ? '/api'
    : API_BASE_URL || 'https://delulu-virid.vercel.app';

export { BASE as API_BASE };

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE}${path}`;
  console.log('[api] request', { url, method: options.method || 'GET' });

  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  console.log('[api] response status', { url, status: res.status, ok: res.ok });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch { /* not JSON */ }
    console.error('[api] request error', { url, message, status: res.status });
    throw new ApiError(message, res.status);
  }

  const text = await res.text();
  if (!text) return {} as T;
  try {
    const parsed = JSON.parse(text) as T;
    console.log('[api] parsed response', { url, parsed });
    return parsed;
  } catch {
    console.log('[api] plain text response', { url, text });
    return text as unknown as T;
  }
}

export const authApi = {
  loginWithGoogle(): void {
    window.location.href = `${BASE}/login`;
  },
  async getProfile(email: string): Promise<User> {
    const data = await request<{ result: User | User[] }>(
      `/userEmail/${encodeURIComponent(email)}`
    );
    const result = data.result;
    if (Array.isArray(result)) {
      if (result.length === 0) throw new ApiError('User not found', 404);
      return result[0];
    }
    return result;
  },
};

export const conversationApi = {
  async create(userId: string, title: string): Promise<string> {
    const data = await request<{ message: string }>(`/user/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    const match = data.message?.match(/([0-9a-fA-F]{24})/);
    if (!match) throw new ApiError('Could not parse conversation id', 500);
    return match[1];
  },
  async fetchAll(userId: string): Promise<Conversation[]> {
    const data = await request<{ message: Conversation[] }>(
      `/fetchAllConversation/${userId}`
    );
    return Array.isArray(data.message) ? data.message : [];
  },
  async fetchMessages(conversationId: string): Promise<Message[]> {
    const data = await request<{ message: Message[] }>(
      `/fetchConversation/${conversationId}`
    );
    return Array.isArray(data.message) ? data.message : [];
  },
  async delete(userId: string, conversationId: string): Promise<void> {
    await request(`/deleteConversation/${userId}/${conversationId}`, {
      method: 'POST',
    });
  },
};

function normalizeAssistantPayload(value: unknown): string | AssistantResponse {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;

    const stripped = trimmed
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(stripped);
      return typeof parsed === 'string' ? normalizeAssistantPayload(parsed) : (parsed as AssistantResponse);
    } catch {
      return trimmed;
    }
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('Response' in record) return normalizeAssistantPayload(record.Response);
    if ('narration' in record || 'suggested_actions' in record) return record as unknown as AssistantResponse;
  }

  return typeof value === 'string' ? value : '';
}

export const messageApi = {
  async create(conversationId: string, role: string, content: string): Promise<string> {
    const data = await request<{ message: string }>(`/message/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify({ role, content }),
    });
    const match = data.message?.match(/([0-9a-fA-F]{24})/);
    return match ? match[1] : '';
  },
  async chat(conversationId: string, content: string): Promise<string | AssistantResponse> {
    const data = await request<{ Response?: unknown }>(`/chat/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content }),
    });

    return normalizeAssistantPayload(data.Response ?? data);
  },
};

export { ApiError };
