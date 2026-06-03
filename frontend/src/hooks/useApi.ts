import type { Project, OutlineData } from '../types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
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
      request<{ outline: OutlineData }>(`/projects/${projectId}/outline/build`, {
        method: 'POST',
      }),

    getOutline: (projectId: string) =>
      request<{ outline: OutlineData }>(`/projects/${projectId}/outline`),

    confirmOutline: (projectId: string) =>
      request<{ status: string }>(`/projects/${projectId}/outline/confirm`, {
        method: 'POST',
      }),

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
