import { lazy, Suspense } from 'react';
import { PlanCanvas } from '@/modules/Editor2D/PlanCanvas';
import { useEditorStore } from '@/store/editorStore';
import { TopBar } from './TopBar';
import { LeftSidebar } from './LeftSidebar';
import { PropertiesPanel } from './PropertiesPanel';
import { StatusBar } from './StatusBar';
import { LevelBar } from './LevelBar';
import { useShortcuts } from './useShortcuts';
import { ErrorBoundary } from './ErrorBoundary';
import { useCompact } from './useLayout';
import { MobileBar, MobileDrawers } from './MobileChrome';
import { ShortcutsHelp } from './ShortcutsHelp';
import { useLevelGuard } from './useLevelGuard';

const Viewer3D = lazy(() => import('@/modules/Editor3D/Viewer3D'));

function Loading() {
  return <div className="flex h-full items-center justify-center text-slate-500">Cargando el motor 3D…</div>;
}

export function AppShell() {
  useShortcuts();
  useLevelGuard();
  const view = useEditorStore((s) => s.view);
  const walk = view === 'walk';
  const compact = useCompact();
  const viewer = (
    <ErrorBoundary label="el visor">
      {view === '2d' ? (
        <PlanCanvas />
      ) : (
        <Suspense fallback={<Loading />}>
          <Viewer3D />
        </Suspense>
      )}
    </ErrorBoundary>
  );
  if (compact) {
    return (
      <div className="flex h-full flex-col">
        <TopBar compact />
        <main className="relative min-h-0 flex-1 bg-white">
          {viewer}
          {!walk && <LevelBar />}
        </main>
        {!walk && <MobileBar />}
        <MobileDrawers />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        {!walk && <LeftSidebar />}
        <main className="relative min-w-0 flex-1 bg-white">
          <ErrorBoundary label="el visor">
            {view === '2d' ? (
              <PlanCanvas />
            ) : (
              <Suspense fallback={<Loading />}>
                <Viewer3D />
              </Suspense>
            )}
          </ErrorBoundary>
          {!walk && <LevelBar />}
        </main>
        {!walk && (
          <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white thin-scroll">
            <ErrorBoundary label="el panel de propiedades">
              <PropertiesPanel />
            </ErrorBoundary>
          </aside>
        )}
      </div>
      <StatusBar />
      <ShortcutsHelp />
    </div>
  );
}
