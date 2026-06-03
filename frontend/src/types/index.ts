export type ProjectStatus =
  | 'idle'
  | 'building_outline'
  | 'awaiting_outline_confirm'
  | 'writing_chapter'
  | 'awaiting_chapter_confirm'
  | 'supplementing'
  | 'completed'
  | 'error';

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  name: string;
  role_type: 'protagonist' | 'antagonist' | 'supporting';
  card: Record<string, string>;
  current_state: Record<string, string>;
  is_active: boolean;
  version: number;
}

export interface PlotNode {
  id: string;
  title: string;
  description: string;
  parent_id: string | null;
  chapter_estimate: string;
  status: 'pending' | 'in_progress' | 'completed';
  importance: string;
  sort_order: number;
  children?: PlotNode[];
}

export interface ChapterData {
  id: string;
  chapter_number: number;
  title: string;
  status: 'generating' | 'draft' | 'confirmed';
  word_count: number;
  summary: string;
  version: number;
}

export interface OutlineData {
  information?: Record<string, unknown>;
  theme?: Record<string, unknown>;
  characters?: { characters: Character[]; relationships: unknown[] };
  plot_nodes?: { plot_nodes: PlotNode[] };
  setting?: Record<string, unknown>;
  narrative?: Record<string, unknown>;
}

export interface WebSocketEvent {
  event: string;
  data: Record<string, unknown>;
}
