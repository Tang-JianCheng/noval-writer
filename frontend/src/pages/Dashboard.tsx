import { useEffect, useState } from 'react';
import type { Project } from '../types';
import { useApi } from '../hooks/useApi';
import Topbar from '../components/Topbar';
import ProjectCard from '../components/ProjectCard';
import Modal from '../components/Modal';
import Toast, { showToast } from '../components/Toast';

interface DashboardProps {
  onNavigate: (
    page: { name: 'outline'; projectId: string } | { name: 'writing'; projectId: string },
  ) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const api = useApi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载项目失败');
      showToast('error', '加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      showToast('warning', '请输入项目名称');
      return;
    }
    setCreating(true);
    try {
      const project = await api.createProject(newTitle.trim(), newDesc.trim());
      showToast('success', `项目 "${project.title}" 创建成功`);
      setModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      await fetchProjects();
      onNavigate({ name: 'outline', projectId: project.id });
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleCardClick = (project: Project) => {
    if (
      project.status === 'writing_chapter' ||
      project.status === 'awaiting_chapter_confirm' ||
      project.status === 'supplementing'
    ) {
      onNavigate({ name: 'writing', projectId: project.id });
    } else {
      onNavigate({ name: 'outline', projectId: project.id });
    }
  };

  // Compute stats
  const totalProjects = projects.length;
  const writingCount = projects.filter(
    (p) => p.status === 'writing_chapter' || p.status === 'awaiting_chapter_confirm',
  ).length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Topbar
        projectName="NovalWriter"
        onCreateProject={() => setModalOpen(true)}
      />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 48px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '0.01em',
              }}
            >
              Writer&apos;s Study
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
              你的小说项目
            </p>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '16px 24px',
              minWidth: 140,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {totalProjects}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 2,
              }}
            >
              全部项目
            </div>
          </div>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '16px 24px',
              minWidth: 140,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 600,
                color: 'var(--accent)',
              }}
            >
              {writingCount}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 2,
              }}
            >
              写作中
            </div>
          </div>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '16px 24px',
              minWidth: 140,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 600,
                color: 'var(--success)',
              }}
            >
              {completedCount}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 2,
              }}
            >
              已完成
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid rgba(184,92,92,0.2)',
              borderRadius: 10,
              padding: '16px 24px',
              marginBottom: 24,
              color: 'var(--danger)',
              fontSize: 14,
            }}
          >
            {error}
            <button
              onClick={fetchProjects}
              style={{
                marginLeft: 16,
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              重试
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: 64,
            }}
          >
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              加载中...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 24px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                color: 'var(--text-secondary)',
                marginBottom: 8,
              }}
            >
              还没有项目
            </p>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                marginBottom: 24,
              }}
            >
              点击右上角的 &ldquo;+ 新建项目&rdquo; 开始写作
            </p>
          </div>
        )}

        {/* Project Grid */}
        {!loading && projects.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 16,
            }}
          >
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleCardClick(project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <Modal
        open={modalOpen}
        title="新建项目"
        onClose={() => setModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              项目名称
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="输入小说名称..."
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !creating) handleCreate();
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              项目描述
            </label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="简要描述你的故事..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'var(--font-body)',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 8,
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                padding: '7px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              style={{
                background: 'var(--accent)',
                color: '#1a1714',
                border: 'none',
                padding: '7px 16px',
                borderRadius: 6,
                cursor: creating || !newTitle.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: 13,
                opacity: creating || !newTitle.trim() ? 0.5 : 1,
              }}
            >
              {creating ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      </Modal>

      <Toast />
    </div>
  );
}
