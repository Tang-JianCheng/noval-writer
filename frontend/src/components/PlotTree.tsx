import { useState } from 'react';
import type { PlotNode } from '../types';

interface Props {
  nodes: PlotNode[];
  activeId?: string;
  onSelect: (node: PlotNode) => void;
}

function TreeNode({
  node,
  activeId,
  onSelect,
  depth = 0,
}: {
  node: PlotNode;
  activeId?: string;
  onSelect: (n: PlotNode) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect(node);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: `5px 12px 5px ${12 + depth * 16}px`,
          cursor: 'pointer',
          fontSize: 13,
          color:
            activeId === node.id
              ? 'var(--accent)'
              : 'var(--text-secondary)',
          background:
            activeId === node.id ? 'var(--accent-bg)' : 'transparent',
          borderLeft:
            activeId === node.id
              ? '2px solid var(--accent)'
              : '2px solid transparent',
        }}
      >
        <span style={{ width: 16, fontSize: 10, color: 'var(--text-muted)' }}>
          {hasChildren ? (expanded ? '▼' : '▶') : ''}
        </span>
        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.title}
        </span>
        {node.status === 'completed' && (
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 100,
              background: 'var(--bg-elevated)',
              color: 'var(--success)',
            }}
          >
            ✓
          </span>
        )}
      </div>
      {hasChildren &&
        expanded &&
        node.children!.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            activeId={activeId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export default function PlotTree({ nodes, activeId, onSelect }: Props) {
  return (
    <div style={{ padding: '8px 0', overflowY: 'auto' }}>
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          activeId={activeId}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  );
}
