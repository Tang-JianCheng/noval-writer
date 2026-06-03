import { useCallback, useState } from 'react';
import Dashboard from './pages/Dashboard';
import OutlineStudio from './pages/OutlineStudio';
import ChapterWriting from './pages/ChapterWriting';

type PageState =
  | { name: 'dashboard' }
  | { name: 'outline'; projectId: string }
  | { name: 'writing'; projectId: string };

export default function App() {
  const [page, setPage] = useState<PageState>({ name: 'dashboard' });

  const handleNavigate = useCallback(
    (
      target:
        | { name: 'dashboard' }
        | { name: 'outline'; projectId: string }
        | { name: 'writing'; projectId: string },
    ) => {
      setPage(target);
    },
    [],
  );

  const renderPage = () => {
    switch (page.name) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;

      case 'outline':
        return (
          <OutlineStudio
            key={page.projectId}
            projectId={page.projectId}
            onNavigate={handleNavigate}
          />
        );

      case 'writing':
        return (
          <ChapterWriting
            key={page.projectId}
            projectId={page.projectId}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-deep)',
      }}
    >
      {renderPage()}
    </div>
  );
}
