import React from 'react';
import { TopNav } from '../components/shared/TopNav';
import { Toast } from '../components/shared/Toast';
import { useAppStore } from '../hooks/useAppStore';
import { useEffect, useState } from 'react';
import { initSeedData } from '../storage/seed';
import { Library } from '../components/library/Library';
import { SetBuilder } from '../components/set-builder/SetBuilder';
import { Transitions } from '../components/transitions/Transitions';
import { Practice } from '../components/practice/Practice';

export const App: React.FC = () => {
  const activeSection = useAppStore((state) => state.activeSection);
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);
  const [ready, setReady] = useState(false);

  useEffect(() => { void initSeedData().finally(() => setReady(true)); }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base,#1a1a1e)] text-[var(--color-text-primary,#E8E8EC)] flex flex-col font-sans antialiased">
      <TopNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {!ready ? <div className="flex min-h-64 items-center justify-center text-sm text-[var(--color-text-secondary)]">Preparing your local workspace…</div> : <>
          {activeSection === 'library' && <Library />}
          {activeSection === 'set-builder' && <SetBuilder />}
          {activeSection === 'transitions' && <Transitions />}
          {activeSection === 'practice' && <Practice />}
        </>}
      </main>

      {/* Floating Toast Notification Center */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast
              id={t.id}
              type={t.type}
              title={t.title}
              message={t.message}
              duration={t.duration}
              onDismiss={removeToast}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
