import React from 'react';
import { PRODUCT_NAME, PRODUCT_SUBTITLE } from '../../app/config';
import { useAppStore, NavSection } from '../../hooks/useAppStore';

interface NavItem {
  id: NavSection;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'library', label: 'Library' },
  { id: 'set-builder', label: 'Set Builder' },
  { id: 'transitions', label: 'Transitions' },
  { id: 'practice', label: 'Practice Log' }
];

export const TopNav: React.FC = () => {
  const activeSection = useAppStore((state) => state.activeSection);
  const setActiveSection = useAppStore((state) => state.setActiveSection);

  return (
    <header className="bg-[var(--color-bg-surface,#242428)] border-b border-[var(--color-border-subtle,#2E2E34)] px-4 py-3 text-[var(--color-text-primary,#E8E8EC)]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-base,#1a1a1e)] border border-[var(--color-accent,#D4A843)] flex items-center justify-center font-bold text-sm text-[var(--color-accent,#D4A843)] shadow-sm">
            SA
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-[var(--color-text-primary,#E8E8EC)]">
              {PRODUCT_NAME}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary,#9A9AA0)] hidden md:block">
              {PRODUCT_SUBTITLE}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav role="tablist" aria-label="Main Navigation" className="flex items-center gap-1 bg-[var(--color-bg-base,#1a1a1e)] p-1 rounded-lg border border-[var(--color-border-subtle,#2E2E34)]">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSection(item.id)}
                className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#D4A843)] ${
                  isActive
                    ? 'bg-[var(--color-accent,#D4A843)] text-[var(--color-accent-fg,#1a1a1e)] shadow-sm font-semibold'
                    : 'text-[var(--color-text-secondary,#9A9AA0)] hover:text-[var(--color-text-primary,#E8E8EC)] hover:bg-[var(--color-bg-surface-hover,#2a2a2f)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
