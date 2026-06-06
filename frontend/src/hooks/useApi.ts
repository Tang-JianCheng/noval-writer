import type { Project, OutlineData } from '../types';

const BASE = '/api';

async function request<T>(
  url: string,
  options?: RequestInit & { timeout?: number },
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options || {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...fetchOptions,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API Error ${res.status}: ${body || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('请求超时，请重试');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function useApi() {
  return {
    getProjects: () => request<Project[]>('/projects'),

    createProject: (title: string, description: string) =>
      request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      }),

    getProject: (id: string) => request<Project>(`/projects/${id}`),

    deleteProject: (id: string) =>
      request<void>(`/projects/${id}`, { method: 'DELETE' }),

    buildOutline: (projectId: string) =>
      request<{ outline: OutlineData; status: string }>(
        `/projects/${projectId}/outline/build`,
        { method: 'POST', timeout: 120000 },
      ),

    getOutline: (projectId: string) =>
      request<{ outline: OutlineData; status: string }>(
        `/projects/${projectId}/outline`,
      ),

    confirmOutline: (projectId: string) =>
      request<{ status: string }>(
        `/projects/${projectId}/outline/confirm`,
        { method: 'POST' },
      ),

    generateChapter: (projectId: string) =>
      request<{ chapter_number: number }>(
        `/projects/${projectId}/chapters/next`,
        { method: 'POST' },
      ),

    confirmChapter: (projectId: string, chapterNum: number) =>
      request<{ status: string }>(
        `/projects/${projectId}/chapters/${chapterNum}/confirm`,
        { method: 'POST' },
      ),

    retryChapter: (
      projectId: string,
      chapterNum: number,
      guidance?: string,
    ) =>
      request<{ status: string }>(
        `/projects/${projectId}/chapters/${chapterNum}/retry`,
        {
          method: 'POST',
          body: JSON.stringify({ guidance: guidance || '' }),
        },
      ),
  };
}
