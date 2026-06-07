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
      | { name: 'writing'; projectId: string }
      | { name: 'outline'; projectId: string },
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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: 'var(--bg-input)',
  border: '1px solid var(--border-default)', borderRadius: 4,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', marginTop: 4,
  fontFamily: 'var(--font-body)',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: 'vertical', minHeight: 80, lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' as const,
  letterSpacing: '0.04em', display: 'block', marginTop: 12,
};

export default function OutlineStudio({ projectId, onNavigate }: OutlineStudioProps) {
  const api = useApi();
  const [project, setProject] = useState<Project | null>(null);
  const [outline, setOutline] = useState<OutlineData | null>(null);
  const [draft, setDraft] = useState<OutlineData | null>(null);
  const [activeTab, setActiveTab] = useState<ModuleKey>('information');
  const [activePlotId, setActivePlotId] = useState<string | undefined>();
  const [activeCharacterId, setActiveCharacterId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [rebuilding, setRebuilding] = useState('');

  // Sync draft when outline loads
  useEffect(() => {
    if (outline) setDraft(JSON.parse(JSON.stringify(outline)));
  }, [outline]);

  const rebuildModule = async (module: string) => {
    setRebuilding(module);
    try {
      const resp = await fetch(`/api/projects/${projectId}/outline/rebuild/${module}`, { method: 'POST' });
      if (resp.ok) {
        const data = await resp.json();
        setOutline(data.outline);
        showToast('success', `${module} 已重新生成`);
      } else {
        showToast('error', '重新生成失败');
      }
    } catch {
      showToast('error', '重新生成失败');
    } finally { setRebuilding(''); }
  };

  const saveOutline = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/outline`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outline: draft }),
      });
      setOutline(JSON.parse(JSON.stringify(draft)));
      setEditMode(false);
      showToast('success', '大纲已保存');
    } catch {
      showToast('error', '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (path: string[], value: unknown) => {
    if (!draft) return;
    const newDraft = JSON.parse(JSON.stringify(draft));
    let obj = newDraft;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
    obj[path[path.length - 1]] = value;
    setDraft(newDraft);
  };

  const fetchProject = useCallback(async () => {
    try { const p = await api.getProject(projectId); setProject(p); return p; } catch { return null; }
  }, [api, projectId]);

  const fetchOutline = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = await fetchProject();
      if (p && p.status !== 'idle') {
        try {
          const existing = await api.getOutline(projectId);
          if (existing.outline && Object.keys(existing.outline).length > 0) setOutline(existing.outline);
          else setOutline(null);
        } catch { setOutline(null); }
      } else { setOutline(null); }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally { setLoading(false); }
  }, [api, fetchProject, projectId]);

  useEffect(() => { fetchOutline(); }, []); // eslint-disable-line

  const handleBuildOutline = async () => {
    setBuilding(true);
    try {
      const result = await api.buildOutline(projectId);
      setOutline(result.outline);
      showToast('success', '大纲构建成功');
      const p = await fetchProject(); if (p) setProject(p);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '构建失败');
    } finally { setBuilding(false); }
  };

  const handleConfirmOutline = async () => {
    setConfirming(true);
    try {
      await api.confirmOutline(projectId);
      showToast('success', '大纲已确认');
      onNavigate({ name: 'writing', projectId });
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '确认失败');
    } finally { setConfirming(false); }
  };

  // -- RENDER TABS --

  const renderInfoTab = () => {
    const info = (draft || outline)?.information;
    return (
      <div style={{ padding: 24 }}>
        <Header title="信息搜集" moduleKey="information" onRebuild={rebuildModule} rebuilding={rebuilding} onSave={saveOutline} editMode={editMode} setEditMode={setEditMode} saving={saving} />
        {info && Object.keys(info).length > 0 ? (
          Object.entries(info).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, color: 'var(--accent)', marginBottom: 8, fontFamily: 'var(--font-display)' }}>{cat}</h4>
              {editMode ? (
                (Array.isArray(items) ? items : []).map((item: Record<string, string>, i: number) => (
                  <div key={i} style={{ marginBottom: 8, padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 4 }}>
                    <input value={item.title || ''} onChange={e => {
                      const arr = [...(Array.isArray(draft?.information?.[cat]) ? (draft?.information as Record<string, unknown[]>)[cat] : [])];
                      arr[i] = { ...arr[i], title: e.target.value };
                      updateDraft(['information', cat], arr);
                    }} style={inputStyle} placeholder="标题" />
                    <textarea value={item.content || ''} onChange={e => {
                      const arr = [...(Array.isArray(draft?.information?.[cat]) ? (draft?.information as Record<string, unknown[]>)[cat] : [])];
                      arr[i] = { ...arr[i], content: e.target.value };
                      updateDraft(['information', cat], arr);
                    }} style={{ ...textareaStyle, marginTop: 6 }} placeholder="内容" rows={3} />
                  </div>
                ))
              ) : (
                items && Array.isArray(items) && items.map((item: Record<string, string>, i: number) => (
                  <div key={i} style={{ marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <b>{item.title}</b>: {item.content}
                  </div>
                ))
              )}
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>暂无信息数据</p>
        )}
      </div>
    );
  };

  const renderThemeTab = () => {
    const theme = (draft || outline)?.theme as Record<string, unknown> | undefined;
    return (
      <div style={{ padding: 24 }}>
        <Header title="主题分析" moduleKey="theme" onRebuild={rebuildModule} rebuilding={rebuilding} onSave={saveOutline} editMode={editMode} setEditMode={setEditMode} saving={saving} />
        {theme ? (
          <div>
            <label style={labelStyle}>主题陈述</label>
            {editMode
              ? <textarea value={String(theme.statement || '')} onChange={e => updateDraft(['theme', 'statement'], e.target.value)} style={textareaStyle} rows={5} />
              : <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{String(theme.statement || '')}</p>}
            <label style={labelStyle}>情感基调</label>
            {editMode
              ? <input value={String(theme.tone || '')} onChange={e => updateDraft(['theme', 'tone'], e.target.value)} style={inputStyle} />
              : <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{String(theme.tone || '')}</p>}
            <label style={labelStyle}>关键词（逗号分隔）</label>
            {editMode
              ? <input value={Array.isArray(theme.keywords) ? (theme.keywords as string[]).join(', ') : ''} onChange={e => updateDraft(['theme', 'keywords'], e.target.value.split(',').map(s => s.trim()))} style={inputStyle} />
              : <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{Array.isArray(theme.keywords) ? (theme.keywords as string[]).join(', ') : ''}</p>}
          </div>
        ) : <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>暂无主题数据</p>}
      </div>
    );
  };

  const renderCharactersTab = () => {
    const chars = (draft || outline)?.characters?.characters || [];
    return (
      <div style={{ padding: 24 }}>
        <Header title="角色列表" moduleKey="characters" onRebuild={rebuildModule} rebuilding={rebuilding} onSave={saveOutline} editMode={editMode} setEditMode={setEditMode} saving={saving}
          extra={editMode ? <button onClick={() => {
            const newChar = { id: 'char_' + Date.now(), name: '新角色', role_type: 'supporting', card: { appearance: '', personality: '', motivation: '', arc: '', speech_style: '' }, initial_state: { location: '', mood: '', goal: '' }, current_state: { location: '', mood: '', goal: '' }, is_active: true, version: 1 };
            updateDraft(['characters', 'characters'], [...chars, newChar]);
          }} style={{ background: 'var(--accent)', color: '#1a1714', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>+ 添加角色</button> : undefined} />
        {chars.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chars.map((char: Character, idx: number) => (
              <div key={char.id} onClick={() => setActiveCharacterId(activeCharacterId === char.id ? undefined : char.id)}
                style={{ background: activeCharacterId === char.id ? 'var(--accent-bg)' : 'var(--bg-surface)', border: activeCharacterId === char.id ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)', borderRadius: 8, padding: 16, cursor: 'pointer', transition: 'all 200ms' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {editMode ? (
                    <input value={char.name} onClick={e => e.stopPropagation()} onChange={e => { const arr = [...chars]; arr[idx] = { ...arr[idx], name: e.target.value }; updateDraft(['characters', 'characters'], arr); }} style={{ ...inputStyle, width: 150, margin: 0 }} />
                  ) : <span style={{ fontWeight: 600, fontSize: 15 }}>{char.name}</span>}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {editMode && (
                      <button onClick={e => { e.stopPropagation(); const arr = chars.filter((_: unknown, i: number) => i !== idx); updateDraft(['characters', 'characters'], arr); }}
                        style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>删除</button>
                    )}
                    {editMode ? (
                      <select value={char.role_type} onClick={e => e.stopPropagation()} onChange={e => { const arr = [...chars]; arr[idx] = { ...arr[idx], role_type: e.target.value }; updateDraft(['characters', 'characters'], arr); }}
                        style={{ ...inputStyle, width: 80, margin: 0 }}>
                        <option value="protagonist">主角</option>
                        <option value="antagonist">对手</option>
                        <option value="supporting">配角</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        {char.role_type === 'protagonist' ? '主角' : char.role_type === 'antagonist' ? '对手' : '配角'}
                      </span>
                    )}
                  </div>
                </div>
                {(activeCharacterId === char.id || editMode) && (
                  <div style={{ marginTop: 12 }}>
                    {(['appearance', 'personality', 'motivation', 'arc', 'speech_style'] as const).map(field => (
                      <div key={field} style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{field}: </span>
                        {editMode ? (
                          <input value={(char.card as Record<string, string>)[field] || ''} onClick={e => e.stopPropagation()} onChange={e => { const arr = [...chars]; arr[idx] = { ...arr[idx], card: { ...(arr[idx].card as Record<string, string>), [field]: e.target.value } }; updateDraft(['characters', 'characters'], arr); }} style={{ ...inputStyle, display: 'inline', width: 'calc(100% - 50px)', margin: 0, padding: '2px 6px', fontSize: 12 }} />
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{(char.card as Record<string, string>)[field] || ''}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>暂无角色数据</p>}
      </div>
    );
  };

  // Ensure all nodes have IDs
  const ensureIds = (ns: PlotNode[], prefix = 'n'): PlotNode[] => ns.map((n, i) => ({
    ...n,
    id: n.id || `${prefix}_${i}`,
    children: n.children ? ensureIds(n.children, `${prefix}_${i}`) : undefined,
  }));

  const renderPlotTab = () => {
    const rawNodes = (draft || outline)?.plot_nodes?.plot_nodes || [];
    const nodes = ensureIds(rawNodes);
    const findNode = (ns: PlotNode[], id: string): PlotNode | null => {
      for (const n of ns) { if (n.id === id) return n; if (n.children) { const f = findNode(n.children, id); if (f) return f; } }
      return null;
    };

    return (
      <div style={{ padding: 24 }}>
        <Header title="情节结构" moduleKey="plot_nodes" onRebuild={rebuildModule} rebuilding={rebuilding} onSave={saveOutline} editMode={editMode} setEditMode={setEditMode} saving={saving} />
        {nodes.length > 0 ? (
          <div>
            <PlotTree nodes={nodes} activeId={activePlotId} onSelect={(n: PlotNode) => setActivePlotId(n.id)} />
            <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-surface)', borderRadius: 6 }}>
              {activePlotId && (() => {
                const node = findNode(nodes, activePlotId);
                if (!node) return <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>点击左侧节点查看详情</p>;
                return (
                  <div>
                    {editMode ? (
                      <>
                        <input value={node.title} onChange={e => {
                          const update = (ns: PlotNode[]): PlotNode[] => ns.map(n => n.id === activePlotId ? { ...n, title: e.target.value } : { ...n, children: n.children ? update(n.children) : undefined });
                          updateDraft(['plot_nodes', 'plot_nodes'], update(rawNodes));
                        }} style={inputStyle} placeholder="标题" />
                        <textarea value={node.description || ''} onChange={e => {
                          const update = (ns: PlotNode[]): PlotNode[] => ns.map(n => n.id === activePlotId ? { ...n, description: e.target.value } : { ...n, children: n.children ? update(n.children) : undefined });
                          updateDraft(['plot_nodes', 'plot_nodes'], update(rawNodes));
                        }} style={{ ...textareaStyle, marginTop: 6 }} placeholder="描述" rows={4} />
                        <input value={node.chapter_estimate || ''} onChange={e => {
                          const update = (ns: PlotNode[]): PlotNode[] => ns.map(n => n.id === activePlotId ? { ...n, chapter_estimate: e.target.value } : { ...n, children: n.children ? update(n.children) : undefined });
                          updateDraft(['plot_nodes', 'plot_nodes'], update(rawNodes));
                        }} style={{ ...inputStyle, marginTop: 6 }} placeholder="章节范围 (如: 1-3)" />
                      </>
                    ) : (
                      <>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 8 }}>{node.title}</h4>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{node.description || '暂无描述'}</p>
                        <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                          <span>章节: {node.chapter_estimate || '未分配'}</span>
                          <span>重要性: {node.importance || 'main'}</span>
                          <span>状态: {node.status || 'pending'}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>暂无情节数据</p>}
      </div>
    );
  };

  const renderSettingTab = () => {
    const setting = (draft || outline)?.setting as Record<string, unknown> | undefined;
    const scenes = (setting?.scenes as Record<string, string>[]) || [];
    return (
      <div style={{ padding: 24 }}>
        <Header title="环境设定" moduleKey="setting" onRebuild={rebuildModule} rebuilding={rebuilding} onSave={saveOutline} editMode={editMode} setEditMode={setEditMode} saving={saving} />
        {setting ? (
          <div>
            <label style={labelStyle}>世界观概述</label>
            {editMode
              ? <textarea value={String(setting.world_overview || '')} onChange={e => updateDraft(['setting', 'world_overview'], e.target.value)} style={textareaStyle} rows={5} />
              : <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{String(setting.world_overview || '')}</p>}
            <label style={labelStyle}>场景列表</label>
            {scenes.map((s: Record<string, string>, i: number) => (
              <div key={i} style={{ marginBottom: 8, padding: 8, background: 'var(--bg-surface)', borderRadius: 4 }}>
                {editMode ? (
                  <>
                    <input value={s.name || ''} onChange={e => { const arr = [...scenes]; arr[i] = { ...arr[i], name: e.target.value }; updateDraft(['setting', 'scenes'], arr); }} style={inputStyle} placeholder="场景名" />
                    <input value={s.atmosphere || ''} onChange={e => { const arr = [...scenes]; arr[i] = { ...arr[i], atmosphere: e.target.value }; updateDraft(['setting', 'scenes'], arr); }} style={{ ...inputStyle, marginTop: 4 }} placeholder="氛围" />
                    <textarea value={s.description || ''} onChange={e => { const arr = [...scenes]; arr[i] = { ...arr[i], description: e.target.value }; updateDraft(['setting', 'scenes'], arr); }} style={{ ...textareaStyle, marginTop: 4 }} placeholder="描述" rows={3} />
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <b>{s.name}</b> — {s.atmosphere}
                    <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{s.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>暂无环境数据</p>}
      </div>
    );
  };

  const renderNarrativeTab = () => {
    const narr = (draft || outline)?.narrative as Record<string, string> | undefined;
    return (
      <div style={{ padding: 24 }}>
        <Header title="叙事策略" moduleKey="narrative" onRebuild={rebuildModule} rebuilding={rebuilding} onSave={saveOutline} editMode={editMode} setEditMode={setEditMode} saving={saving} />
        {narr ? (
          <div>
            {['pov', 'tense', 'chapter_template', 'dialogue_style', 'description_density', 'rhythm_notes'].map(field => (
              <div key={field}>
                <label style={labelStyle}>{field}</label>
                {editMode
                  ? <textarea value={narr[field] || ''} onChange={e => updateDraft(['narrative', field], e.target.value)} style={{ ...textareaStyle, minHeight: 50 }} rows={2} />
                  : <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{narr[field] || ''}</p>}
              </div>
            ))}
          </div>
        ) : <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>暂无叙事数据</p>}
      </div>
    );
  };

  const renderModuleContent = () => {
    switch (activeTab) {
      case 'information': return renderInfoTab();
      case 'theme': return renderThemeTab();
      case 'characters': return renderCharactersTab();
      case 'plot_nodes': return renderPlotTab();
      case 'setting': return renderSettingTab();
      case 'narrative': return renderNarrativeTab();
    }
  };

  const canConfirm = outline && (outline.plot_nodes || outline.characters || outline.theme);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar projectName={project?.title || '大纲工作室'} onBack={() => onNavigate({ name: 'dashboard' })} />
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)', padding: '0 24px', flexShrink: 0, overflowX: 'auto' }}>
        {MODULE_TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '12px 20px', background: 'none', border: 'none',
            borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
            display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 14 }}>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {loading && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>加载中...</p></div>}
        {!loading && error && <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, gap: 16 }}><p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p><button onClick={fetchOutline} style={{ background: 'var(--accent)', color: '#1a1714', border: 'none', padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>重试</button></div>}
        {!loading && !error && !outline && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, gap: 16 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-secondary)' }}>尚未构建大纲</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>点击下方按钮开始AI构建大纲</p>
            <button onClick={handleBuildOutline} disabled={building} style={{
              background: 'var(--accent)', color: '#1a1714', border: 'none', padding: '10px 24px', borderRadius: 6,
              cursor: building ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, opacity: building ? 0.5 : 1,
            }}>{building ? '构建中...' : '构建大纲'}</button>
          </div>
        )}
        {!loading && !error && outline && renderModuleContent()}
      </div>
      {outline && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'var(--bg-base)', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {project?.status === 'awaiting_outline_confirm' ? '大纲待确认' : project?.status || ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleBuildOutline} disabled={building} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', padding: '7px 16px', borderRadius: 6, cursor: building ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>
              {building ? '全部重建中...' : '全部重建'}
            </button>
            <button onClick={handleConfirmOutline} disabled={!canConfirm || confirming} style={{ background: 'var(--accent)', color: '#1a1714', border: 'none', padding: '7px 24px', borderRadius: 6, cursor: !canConfirm || confirming ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, opacity: !canConfirm || confirming ? 0.5 : 1 }}>
              {confirming ? '确认中...' : '开始写作 →'}
            </button>
          </div>
        </div>
      )}
      <Toast />
    </div>
  );
}

// Small header component for each tab
function Header({ title, onSave, editMode, setEditMode, saving, extra, moduleKey, onRebuild, rebuilding }: {
  title: string; onSave: () => void; editMode: boolean;
  setEditMode: (v: boolean) => void; saving: boolean; extra?: React.ReactNode;
  moduleKey?: string; onRebuild?: (m: string) => void; rebuilding?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{title}</h3>
        {extra}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {moduleKey && onRebuild && (
          <button onClick={() => onRebuild(moduleKey)} disabled={rebuilding === moduleKey}
            style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid rgba(212,148,58,0.3)', padding: '6px 12px', borderRadius: 6, cursor: rebuilding ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500 }}>
            {rebuilding === moduleKey ? '生成中...' : '重新生成'}
          </button>
        )}
        {editMode ? (
          <>
            <button onClick={onSave} disabled={saving} style={{ background: 'var(--accent)', color: '#1a1714', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {saving ? '保存中...' : '保存修改'}
            </button>
            <button onClick={() => setEditMode(false)} style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-default)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
              取消
            </button>
          </>
        ) : (
          <button onClick={() => setEditMode(true)} style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            编辑
          </button>
        )}
      </div>
    </div>
  );
}
