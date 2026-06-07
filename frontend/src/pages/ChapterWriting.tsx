import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChapterData, Project, WebSocketEvent } from '../types';
import { useApi } from '../hooks/useApi';
import Topbar from '../components/Topbar';
import Toast, { showToast } from '../components/Toast';

interface ChapterWritingProps {
  projectId: string;
  onNavigate: (page: { name: 'dashboard' }) => void;
}

export default function ChapterWriting({
  projectId,
  onNavigate,
}: ChapterWritingProps) {
  const api = useApi();
  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [currentChapter, setCurrentChapter] =
    useState<ChapterData | null>(null);
  const [chapterText, setChapterText] = useState('');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [wsStatus, setWsStatus] = useState<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');
  const [wsMessages, setWsMessages] = useState<
    { event: string; data: Record<string, unknown>; time: string }[]
  >([]);
  const [retryGuidance, setRetryGuidance] = useState('');
  const [showRetryInput, setShowRetryInput] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const projectRef = useRef(project);
  projectRef.current = project;

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setWsStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/projects/${projectId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setWsStatus('connected');

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketEvent = JSON.parse(event.data);
        setWsMessages((prev) => [
          ...prev.slice(-49),
          { event: msg.event, data: msg.data, time: new Date().toLocaleTimeString('zh-CN') },
        ]);
      } catch { /* ignore */ }
    };

    ws.onerror = () => setWsStatus('disconnected');
    ws.onclose = () => setWsStatus('disconnected');

    wsRef.current = ws;
  }, [projectId]);

  const fetchProject = useCallback(async () => {
    try {
      const p = await api.getProject(projectId);
      setProject(p);
      return p;
    } catch { return null; }
  }, [api, projectId]);

  useEffect(() => {
    fetchProject().finally(() => setLoading(false));
    connectWs();
    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleGenerateChapter = async () => {
    setGenerating(true);
    try {
      const result = await api.generateChapter(projectId);
      const newChapter: ChapterData = {
        id: result.chapter_id,
        chapter_number: result.chapter_number,
        title: result.title,
        status: 'draft',
        word_count: result.word_count,
        summary: (result.summary as Record<string, unknown>)?.summary as string || '',
        version: 1,
      };
      setCurrentChapter(newChapter);
      setChapterText(result.content);
      setChapters(prev => [...prev, newChapter]);
      showToast('success', `第 ${result.chapter_number} 章生成完成`);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : '生成失败',
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmChapter = async () => {
    if (!currentChapter) return;
    setConfirming(true);
    try {
      await api.confirmChapter(
        projectId,
        currentChapter.chapter_number,
      );
      showToast('success', '章节已确认');
      if (currentChapter) {
        setCurrentChapter({
          ...currentChapter,
          status: 'confirmed',
        });
      }
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : '确认失败',
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleRetryChapter = async () => {
    if (!currentChapter) return;
    setGenerating(true);
    setShowRetryInput(false);
    try {
      await api.retryChapter(
        projectId,
        currentChapter.chapter_number,
        retryGuidance,
      );
      setRetryGuidance('');
      showToast('info', '重新生成中...');
    } catch (err) {
      setGenerating(false);
      showToast(
        'error',
        err instanceof Error ? err.message : '重试失败',
      );
    }
  };

  const wsStatusColor = {
    disconnected: 'var(--danger)',
    connecting: 'var(--warning)',
    connected: 'var(--success)',
  }[wsStatus];

  const wsStatusLabel = {
    disconnected: '未连接',
    connecting: '连接中',
    connected: '已连接',
  }[wsStatus];

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
        projectName={project?.title || '写作'}
        onBack={() => onNavigate({ name: 'dashboard' })}
      />

      {/* Three-Column Layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel — Context */}
        {leftPanelOpen && (
          <div
            style={{
              width: 260,
              minWidth: 200,
              background: 'var(--bg-base)',
              borderRight: '1px solid var(--border-subtle)',
              overflowY: 'auto',
              padding: 16,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                上下文
              </span>
              <button
                onClick={() => setLeftPanelOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              {project && (
                <div style={{ marginBottom: 16 }}>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginBottom: 4,
                    }}
                  >
                    项目
                  </p>
                  <p style={{ fontWeight: 500 }}>{project.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {project.description}
                  </p>
                </div>
              )}
              {chapters.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginBottom: 8,
                    }}
                  >
                    已生成章节
                  </p>
                  {chapters.map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => setCurrentChapter(ch)}
                      style={{
                        padding: '6px 8px',
                        marginBottom: 4,
                        borderRadius: 4,
                        cursor: 'pointer',
                        background:
                          currentChapter?.id === ch.id
                            ? 'var(--accent-bg)'
                            : 'transparent',
                        borderLeft:
                          currentChapter?.id === ch.id
                            ? '2px solid var(--accent)'
                            : '2px solid transparent',
                        fontSize: 12,
                      }}
                    >
                      第 {ch.chapter_number} 章
                      {ch.title ? ` — ${ch.title}` : ''}
                    </div>
                  ))}
                </div>
              )}
              {chapters.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  暂无章节
                </p>
              )}
            </div>
          </div>
        )}

        {/* Collapse Toggle Left */}
        {!leftPanelOpen && (
          <button
            onClick={() => setLeftPanelOpen(true)}
            style={{
              writingMode: 'vertical-rl',
              background: 'var(--bg-base)',
              border: 'none',
              borderRight: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 11,
              padding: '12px 6px',
              flexShrink: 0,
            }}
          >
            上下文
          </button>
        )}

        {/* Center — Writing Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Chapter Header */}
          {currentChapter && (
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 20,
                    fontWeight: 600,
                  }}
                >
                  第 {currentChapter.chapter_number} 章
                  {currentChapter.title
                    ? ` — ${currentChapter.title}`
                    : ''}
                </h2>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginTop: 4,
                  }}
                >
                  {currentChapter.word_count} 字 ·{' '}
                  {currentChapter.status === 'generating'
                    ? '生成中'
                    : currentChapter.status === 'draft'
                      ? '草稿'
                      : currentChapter.status === 'confirmed'
                        ? '已确认'
                        : currentChapter.status}
                </p>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: wsStatusColor,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: wsStatusColor,
                    display: 'inline-block',
                  }}
                />
                {wsStatusLabel}
              </span>
            </div>
          )}

          {/* Text Editor Area */}
          {currentChapter ? (
            <textarea
              value={chapterText}
              onChange={(e) => setChapterText(e.target.value)}
              placeholder="章节内容将在此显示..."
              style={{
                flex: 1,
                padding: '24px 32px',
                background: 'var(--bg-deep)',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                lineHeight: 1.8,
                resize: 'none',
                outline: 'none',
              }}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 16,
              }}
            >
              {loading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  加载中...
                </p>
              ) : error ? (
                <>
                  <p
                    style={{ color: 'var(--danger)', fontSize: 14 }}
                  >
                    {error}
                  </p>
                  <button
                    onClick={() =>
                      setError(null)
                    }
                    style={{
                      background: 'var(--accent)',
                      color: '#1a1714',
                      border: 'none',
                      padding: '7px 16px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 13,
                    }}
                  >
                    重试
                  </button>
                </>
              ) : (
                <>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 20,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    开始写作
                  </p>
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 14,
                    }}
                  >
                    点击下方 &ldquo;生成下一章&rdquo; 开始AI写作
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Panel — Status / Log */}
        {(rightPanelOpen || !currentChapter) && (
          <div
            style={{
              width: 260,
              minWidth: 200,
              background: 'var(--bg-base)',
              borderLeft: '1px solid var(--border-subtle)',
              overflowY: 'auto',
              padding: 16,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                状态日志
              </span>
              {currentChapter && (
                <button
                  onClick={() => setRightPanelOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '2px 6px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {wsMessages.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                暂无状态消息
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {wsMessages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 8px',
                      background: 'var(--bg-surface)',
                      borderRadius: 4,
                      fontSize: 11,
                      borderLeft: '2px solid var(--border-accent)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 2,
                      }}
                    >
                      <span style={{ color: 'var(--accent)' }}>
                        {msg.event}
                      </span>
                      <span style={{ color: 'var(--text-dim)' }}>
                        {msg.time}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {JSON.stringify(msg.data).slice(0, 100)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapse Toggle Right */}
        {!rightPanelOpen && currentChapter && (
          <button
            onClick={() => setRightPanelOpen(true)}
            style={{
              writingMode: 'vertical-rl',
              background: 'var(--bg-base)',
              border: 'none',
              borderLeft: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 11,
              padding: '12px 6px',
              flexShrink: 0,
            }}
          >
            日志
          </button>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'var(--bg-base)',
          borderTop: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {showRetryInput && currentChapter ? (
            <>
              <input
                type="text"
                value={retryGuidance}
                onChange={(e) => setRetryGuidance(e.target.value)}
                placeholder="输入修改指导..."
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  width: 240,
                  outline: 'none',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRetryChapter();
                  if (e.key === 'Escape') setShowRetryInput(false);
                }}
              />
              <button
                onClick={handleRetryChapter}
                disabled={generating}
                style={{
                  background: 'var(--warning-bg)',
                  color: 'var(--warning)',
                  border: '1px solid rgba(212,148,58,0.2)',
                  padding: '6px 14px',
                  borderRadius: 6,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                确认重试
              </button>
              <button
                onClick={() => setShowRetryInput(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '6px 8px',
                }}
              >
                取消
              </button>
            </>
          ) : (
            <>
              {currentChapter && (
                <button
                  onClick={() => setShowRetryInput(true)}
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
                  重新生成
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {currentChapter && currentChapter.status !== 'confirmed' && (
            <button
              onClick={handleConfirmChapter}
              disabled={confirming || generating}
              style={{
                background: 'var(--success-bg)',
                color: '#1a1714',
                border: '1px solid var(--success)',
                padding: '7px 24px',
                borderRadius: 6,
                cursor:
                  confirming || generating ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 13,
                background: 'var(--success)',
              }}
            >
              {confirming ? '确认中...' : '确认发布'}
            </button>
          )}
          <button
            onClick={handleGenerateChapter}
            disabled={generating}
            style={{
              background: 'var(--accent)',
              color: '#1a1714',
              border: 'none',
              padding: '7px 24px',
              borderRadius: 6,
              cursor: generating ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 13,
              opacity: generating ? 0.5 : 1,
            }}
          >
            {generating ? '生成中...' : '生成下一章'}
          </button>
        </div>
      </div>

      <Toast />
    </div>
  );
}
