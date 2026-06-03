import { useEffect, useState } from 'react';

interface ToastMessage {
  id: number;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

let toastId = 0;
let addToastFn: ((type: ToastMessage['type'], message: string) => void) | null =
  null;

export function showToast(type: ToastMessage['type'], message: string) {
  addToastFn?.(type, message);
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (type, message) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        3500,
      );
    };
    return () => {
      addToastFn = null;
    };
  }, []);

  if (!toasts.length) return null;

  const colors: Record<ToastMessage['type'], string> = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    error: 'var(--danger)',
    info: 'var(--accent)',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            padding: '10px 16px',
            background: 'var(--bg-elevated)',
            border: `1px solid ${colors[t.type]}40`,
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--text-primary)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            animation: 'toastSlideIn 250ms ease-out',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
