interface TopbarProps {
  projectName?: string;
  onBack?: () => void;
  onCreateProject?: () => void;
}

export default function Topbar({
  projectName,
  onBack,
  onCreateProject,
}: TopbarProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
        padding: '0 24px',
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--accent-bg)',
            border: '1px solid rgba(212,168,83,0.25)',
            borderRadius: 6,
            color: 'var(--accent)',
            fontSize: 14,
          }}
        >
          &#9998;
        </span>
        {projectName || 'NovalWriter'}
      </div>
      <nav style={{ display: 'flex', gap: 4 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              padding: '6px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ← 返回
          </button>
        )}
      </nav>
      <div>
        {onCreateProject && (
          <button
            onClick={onCreateProject}
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
            + 新建项目
          </button>
        )}
      </div>
    </header>
  );
}
