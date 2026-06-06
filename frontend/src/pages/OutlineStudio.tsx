import { useCallback, useEffect, useState } from 'react';
import type { Character, OutlineData, PlotNode, Project } from '../types';
import { useApi } from '../hooks/useApi';
import Topbar from '../components/Topbar';
import PlotTree from '../components/PlotTree';
import Toast, { showToast } from '../components/Toast';

interface OutlineStudioProps {
  projectId: string;
  onNavigate: (
    page:
      | { name: 'dashboard' }
      | { name: 'writing'; projectId: string },
  ) => void;
}

const MODULE_TABS = [
  { key: 'information', label: '信息', icon: '📋' },
  { key: 'theme', label: '主题', icon: '💡' },
  { key: 'characters', label: '角色', icon: '👤' },
  { key: 'plot_nodes', label: '情节', icon: '🌿' },
  { key: 'setting', label: '环境', icon: '🏛' },
  { key: 'narrative', label: '叙事', icon: '📖' },
] as const;

type ModuleKey = (typeof MODULE_TABS)[number]['key'];

export default function OutlineStudio({
  projectId,
  onNavigate,
}: OutlineStudioProps) {
  const api = useApi();
  const [project, setProject] = useState<Project | null>(null);
  const [outline, setOutline] = useState<OutlineData | null>(null);
  const [activeTab, setActiveTab] = useState<ModuleKey>('information');
  const [activePlotId, setActivePlotId] = useState<string | undefined>();
  const [activeCharacterId, setActiveCharacterId] = useState<
    string | undefined
  >();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildingStage, setBuildingStage] = useState('');
  const [confirming, setConfirming] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const p = await api.getProject(projectId);
      setProject(p);
      return p;
    } catch {
      return null;
    }
  }, [api, projectId]);

  const fetchOutline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchProject();
      if (p && p.status !== 'idle') {
        // Project has been built — load existing outline from GET endpoint
        try {
          const existing = await api.getOutline(projectId);
          if (existing.outline && Object.keys(existing.outline).length > 0) {
            setOutline(existing.outline);
          } else {
            setOutline(null);
          }
        } catch {
          setOutline(null);
        }
      } else {
        // New project — show build prompt
        setOutline(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载大纲失败');
      showToast('error', '加载大纲失败');
    } finally {
      setLoading(false);
    }
  }, [api, fetchProject, projectId]);

  useEffect(() => {
    fetchOutline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuildOutline = async () => {
    setBuilding(true);
    setBuildingStage('信息搜集 Agent 工作中...');
    try {
      const result = await api.buildOutline(projectId);
      setOutline(result.outline);
      showToast('success', '大纲构建成功');
      const p = await fetchProject();
      if (p) setProject(p);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : '大纲构建失败',
      );
    } finally {
      setBuilding(false);
      setBuildingStage('');
    }
  };

  const handleConfirmOutline = async () => {
    setConfirming(true);
    try {
      await api.confirmOutline(projectId);
      showToast('success', '大纲已确认');
      onNavigate({ name: 'writing', projectId });
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : '确认大纲失败',
      );
    } finally {
      setConfirming(false);
    }
  };

  const handlePlotSelect = (node: PlotNode) => {
    setActivePlotId(node.id);
  };

  const handleCharacterSelect = (char: Character) => {
    setActiveCharacterId(char.id);
  };

  const renderInfoTab = () => (
    <div style={{ padding: 24 }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          marginBottom: 16,
        }}
      >
        项目信息
      </h3>
      {project && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              标题
            </span>
            <p>{project.title}</p>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              描述
            </span>
            <p>{project.description || '暂无描述'}</p>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              状态
            </span>
            <p>{project.status}</p>
          </div>
        </div>
      )}
      {outline?.information &&
        Object.keys(outline.information).length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4
              style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                marginBottom: 8,
              }}
            >
              项目设定
            </h4>
            <pre
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(outline.information, null, 2)}
            </pre>
          </div>
        )}
    </div>
  );

  const renderThemeTab = () => (
    <div style={{ padding: 24 }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          marginBottom: 16,
        }}
      >
        主题分析
      </h3>
      {outline?.theme ? (
        <pre
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
          }}
        >
          {JSON.stringify(outline.theme, null, 2)}
        </pre>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          暂无主题数据
        </p>
      )}
    </div>
  );

  const renderCharactersTab = () => (
    <div style={{ padding: 24 }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          marginBottom: 16,
        }}
      >
        角色列表
      </h3>
      {outline?.characters?.characters &&
      outline.characters.characters.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {outline.characters.characters.map((char) => (
            <div
              key={char.id}
              onClick={() => handleCharacterSelect(char)}
              style={{
                background:
                  activeCharacterId === char.id
                    ? 'var(--accent-bg)'
                    : 'var(--bg-surface)',
                border:
                  activeCharacterId === char.id
                    ? '1px solid var(--border-accent)'
                    : '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: 16,
                cursor: 'pointer',
                transition: 'all 200ms',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 15 }}>
                  {char.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 100,
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {char.role_type === 'protagonist'
                    ? '主角'
                    : char.role_type === 'antagonist'
                      ? '对手'
                      : '配角'}
                </span>
              </div>
              {activeCharacterId === char.id && (
                <pre
                  style={{
                    marginTop: 12,
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                  }}
                >
                  {JSON.stringify(char.card, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          暂无角色数据
        </p>
      )}
    </div>
  );

  const renderPlotTab = () => (
    <div style={{ padding: 24 }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          marginBottom: 16,
        }}
      >
        情节结构
      </h3>
      {outline?.plot_nodes?.plot_nodes &&
      outline.plot_nodes.plot_nodes.length > 0 ? (
        <PlotTree
          nodes={outline.plot_nodes.plot_nodes}
          activeId={activePlotId}
          onSelect={handlePlotSelect}
        />
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          暂无情节数据
        </p>
      )}
      {activePlotId && outline?.plot_nodes?.plot_nodes && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}
        >
          {(() => {
            const findNode = (
              nodes: PlotNode[],
              id: string,
            ): PlotNode | undefined => {
              for (const n of nodes) {
                if (n.id === id) return n;
                if (n.children) {
                  const found = findNode(n.children, id);
                  if (found) return found;
                }
              }
              return undefined;
            };
            const node = findNode(
              outline.plot_nodes.plot_nodes,
              activePlotId,
            );
            return node ? (
              <>
                <h4
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 16,
                    marginBottom: 8,
                  }}
                >
                  {node.title}
                </h4>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}
                >
                  {node.description}
                </p>
                <div
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    gap: 16,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>状态: {node.status}</span>
                  <span>预估章节: {node.chapter_estimate}</span>
                  <span>重要性: {node.importance}</span>
                </div>
              </>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );

  const renderSettingTab = () => (
    <div style={{ padding: 24 }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          marginBottom: 16,
        }}
      >
        环境设定
      </h3>
      {outline?.setting ? (
        <pre
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
          }}
        >
          {JSON.stringify(outline.setting, null, 2)}
        </pre>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          暂无环境数据
        </p>
      )}
    </div>
  );

  const renderNarrativeTab = () => (
    <div style={{ padding: 24 }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          marginBottom: 16,
        }}
      >
        叙事策略
      </h3>
      {outline?.narrative ? (
        <pre
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
          }}
        >
          {JSON.stringify(outline.narrative, null, 2)}
        </pre>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          暂无叙事数据
        </p>
      )}
    </div>
  );

  const renderModuleContent = () => {
    switch (activeTab) {
      case 'information':
        return renderInfoTab();
      case 'theme':
        return renderThemeTab();
      case 'characters':
        return renderCharactersTab();
      case 'plot_nodes':
        return renderPlotTab();
      case 'setting':
        return renderSettingTab();
      case 'narrative':
        return renderNarrativeTab();
    }
  };

  const canConfirm =
    outline &&
    (outline.plot_nodes || outline.characters || outline.theme);

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
        projectName={project?.title || '大纲工作室'}
        onBack={() => onNavigate({ name: 'dashboard' })}
      />

      {/* Module Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 24px',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {MODULE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom:
                activeTab === tab.key
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
              color:
                activeTab === tab.key
                  ? 'var(--accent)'
                  : 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Loading State */}
        {loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
            }}
          >
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              加载大纲中...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              gap: 16,
            }}
          >
            <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>
            <button
              onClick={fetchOutline}
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
          </div>
        )}

        {/* No Outline — Build Prompt */}
        {!loading && !error && !outline && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              gap: 16,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                color: 'var(--text-secondary)',
              }}
            >
              尚未构建大纲
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              点击下方按钮开始AI构建大纲
            </p>
            <button
              onClick={handleBuildOutline}
              disabled={building}
              style={{
                background: 'var(--accent)',
                color: '#1a1714',
                border: 'none',
                padding: '10px 24px',
                borderRadius: 6,
                cursor: building ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 14,
                opacity: building ? 0.5 : 1,
              }}
            >
              {building ? (buildingStage || '构建中...') : '构建大纲'}
            </button>
          </div>
        )}

        {/* Module Content */}
        {!loading && !error && outline && renderModuleContent()}
      </div>

      {/* Bottom Bar */}
      {outline && (
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
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {project?.status === 'awaiting_outline_confirm'
              ? '大纲待确认'
              : project?.status || ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleBuildOutline}
              disabled={building}
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                padding: '7px 16px',
                borderRadius: 6,
                cursor: building ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {building ? '重建中...' : '重新构建'}
            </button>
            <button
              onClick={handleConfirmOutline}
              disabled={!canConfirm || confirming}
              style={{
                background: 'var(--accent)',
                color: '#1a1714',
                border: 'none',
                padding: '7px 24px',
                borderRadius: 6,
                cursor:
                  !canConfirm || confirming ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 13,
                opacity: !canConfirm || confirming ? 0.5 : 1,
              }}
            >
              {confirming ? '确认中...' : '确认大纲 →'}
            </button>
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
}
