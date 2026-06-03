import type { Project } from '../types';

const statusLabels: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  idle: { label: '○ 草稿', color: '#9b9488', bg: 'rgba(107,100,88,0.15)' },
  building_outline: {
    label: '◉ 大纲构建中',
    color: '#bfb878',
    bg: 'rgba(139,132,88,0.15)',
  },
  awaiting_outline_confirm: {
    label: '◉ 大纲待确认',
    color: '#bfb878',
    bg: 'rgba(139,132,88,0.15)',
  },
  writing_chapter: {
    label: '● 写作中',
    color: 'var(--accent)',
    bg: 'var(--accent-bg)',
  },
  awaiting_chapter_confirm: {
    label: '◉ 章节待确认',
    color: '#bfb878',
    bg: 'rgba(139,132,88,0.15)',
  },
  supplementing: {
    label: '◉ 补充中',
    color: '#bfb878',
    bg: 'rgba(139,132,88,0.15)',
  },
  completed: {
    label: '✓ 已完成',
    color: 'var(--success)',
    bg: 'var(--success-bg)',
  },
  error: {
    label: '✗ 错误',
    color: 'var(--danger)',
    bg: 'var(--danger-bg)',
  },
};

interface Props {
  project: Project;
  onClick: () => void;
}

export default function ProjectCard({ project, onClick }: Props) {
  const status = statusLabels[project.status] || statusLabels.idle;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: 24,
        cursor: 'pointer',
        transition: 'all 250ms',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          'var(--border-accent)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          'var(--border-subtle)';
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          {project.title}
        </h3>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 500,
            background: status.bg,
            color: status.color,
          }}
        >
          {status.label}
        </span>
      </div>
      {project.description && (
        <p
          style={{
            marginTop: 12,
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {project.description}
        </p>
      )}
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        <span>
          更新于{' '}
          {new Date(project.updated_at).toLocaleDateString('zh-CN')}
        </span>
        <span style={{ color: 'var(--accent)' }}>
          {project.status === 'writing_chapter' ? '继续写作 →' : '打开 →'}
        </span>
      </div>
    </div>
  );
}
