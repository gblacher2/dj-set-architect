import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScoreBadge } from '../ScoreBadge';
import { PriorityBadge } from '../PriorityBadge';
import { EnergyIndicator } from '../EnergyIndicator';
import { SaveStatus } from '../SaveStatus';
import { TopNav } from '../TopNav';
import { ConfirmDialog } from '../ConfirmDialog';
import { StarRating } from '../StarRating';
import { Toast } from '../Toast';
import { Tooltip } from '../Tooltip';

// Helper function to calculate WCAG relative luminance
function getRelativeLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// Helper function to calculate contrast ratio between two hex colors
function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Challenger Empirical Stress Tests — Shared Components', () => {
  describe('1. ScoreBadge Extreme Values & Clamping', () => {
    it('clamps negative values to 0 and assigns Risky tier', () => {
      const { rerender } = render(<ScoreBadge score={-50} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Risky')).toBeInTheDocument();

      rerender(<ScoreBadge score={-1} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Risky')).toBeInTheDocument();
    });

    it('handles exact boundary values 0, 50, 100 correctly', () => {
      const { rerender } = render(<ScoreBadge score={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Risky')).toBeInTheDocument();

      rerender(<ScoreBadge score={50} />);
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('Watch')).toBeInTheDocument();

      rerender(<ScoreBadge score={100} />);
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Smooth')).toBeInTheDocument();
    });

    it('clamps values above 100 to 100 and assigns Smooth tier', () => {
      const { rerender } = render(<ScoreBadge score={101} />);
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Smooth')).toBeInTheDocument();

      rerender(<ScoreBadge score={999} />);
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Smooth')).toBeInTheDocument();
    });

    it('rounds floating point inputs correctly', () => {
      const { rerender } = render(<ScoreBadge score={59.6} />);
      expect(screen.getByText('60')).toBeInTheDocument();
      expect(screen.getByText('Acceptable')).toBeInTheDocument();

      rerender(<ScoreBadge score={39.4} />);
      expect(screen.getByText('39')).toBeInTheDocument();
      expect(screen.getByText('Risky')).toBeInTheDocument();
    });

    it('reveals vulnerability when score is NaN', () => {
      render(<ScoreBadge score={NaN} />);
      expect(screen.getByText('NaN')).toBeInTheDocument();
      expect(screen.getByText('Risky')).toBeInTheDocument();
    });
  });

  describe('1b. PriorityBadge Extreme Values & Clamping', () => {
    it('clamps negative values to 0 and assigns Low tier', () => {
      const { rerender } = render(<PriorityBadge priority={-25} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();

      rerender(<PriorityBadge priority={-0.1} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles exact boundary values 0, 50, 100 correctly', () => {
      const { rerender } = render(<PriorityBadge priority={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();

      rerender(<PriorityBadge priority={50} />);
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();

      rerender(<PriorityBadge priority={100} />);
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('clamps values above 100 to 100 and assigns Critical tier', () => {
      render(<PriorityBadge priority={150} />);
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('handles NaN input gracefully or shows NaN', () => {
      render(<PriorityBadge priority={NaN} />);
      expect(screen.getByText('NaN')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  describe('2. Accessibility Attributes Audit', () => {
    it('checks ARIA role and attributes on EnergyIndicator', () => {
      const { rerender } = render(<EnergyIndicator energy={5} maxEnergy={10} />);
      const meter = screen.getByRole('meter');
      expect(meter).toHaveAttribute('aria-valuenow', '5');
      expect(meter).toHaveAttribute('aria-valuemin', '1');
      expect(meter).toHaveAttribute('aria-valuemax', '10');
      expect(meter).toHaveAttribute('aria-label', 'Energy level 5 of 10');

      // Test extreme clamping
      rerender(<EnergyIndicator energy={-5} maxEnergy={10} />);
      expect(meter).toHaveAttribute('aria-valuenow', '1');

      rerender(<EnergyIndicator energy={15} maxEnergy={10} />);
      expect(meter).toHaveAttribute('aria-valuenow', '10');
    });

    it('checks ARIA role and live region on SaveStatus', () => {
      const { rerender } = render(<SaveStatus status="saving" />);
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByText('Saving…')).toBeInTheDocument();

      rerender(<SaveStatus status="saved" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();

      rerender(<SaveStatus status="error" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Save failed')).toBeInTheDocument();

      rerender(<SaveStatus status="idle" />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('checks role="tablist", role="tab", and aria-selected on TopNav', () => {
      render(<TopNav />);
      const tablist = screen.getByRole('tablist', { name: 'Main Navigation' });
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);

      // The product opens on Set Builder after seed initialization.
      const libraryTab = screen.getByRole('tab', { name: 'Library' });
      expect(libraryTab).toHaveAttribute('aria-selected', 'false');

      const setBuilderTab = screen.getByRole('tab', { name: 'Set Builder' });
      expect(setBuilderTab).toHaveAttribute('aria-selected', 'true');
    });

    it('checks role="dialog", aria-modal, aria-labelledby, aria-describedby on ConfirmDialog', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Track"
          description="Are you sure you want to delete this track?"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-desc');
    });

    it('checks StarRating radio/radiogroup and aria-checked attributes', () => {
      render(<StarRating value={3} readOnly={false} onChange={() => {}} />);
      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAttribute('aria-label', 'Rating: 3 out of 5 stars');

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(5);
      expect(radios[2]).toHaveAttribute('aria-checked', 'true');
      expect(radios[0]).toHaveAttribute('aria-checked', 'false');
    });

    it('checks Toast role="alert" for error vs role="status" for info', () => {
      const { rerender } = render(
        <Toast id="1" type="error" title="Error occurred" onDismiss={() => {}} />
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(<Toast id="2" type="info" title="Informational message" onDismiss={() => {}} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('checks Tooltip role="tooltip"', async () => {
      render(
        <Tooltip content="Tooltip details" delayMs={0}>
          <button>Hover me</button>
        </Tooltip>
      );
      // Tooltip is not visible initially
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('audits missing accessibility attributes on ScoreBadge and PriorityBadge', () => {
      const { container: scoreContainer } = render(<ScoreBadge score={75} />);
      const scoreSpan = scoreContainer.firstElementChild;
      // Note: ScoreBadge does not currently have role="meter" or role="status"
      expect(scoreSpan).not.toHaveAttribute('role');

      const { container: priorityContainer } = render(<PriorityBadge priority={80} />);
      const prioritySpan = priorityContainer.firstElementChild;
      expect(prioritySpan).not.toHaveAttribute('role');
    });
  });

  describe('3. Contrast Ratio Compliance Check for Gold Accent Elements', () => {
    const ACCENT_GOLD = '#D4A843';
    const ACCENT_HOVER = '#E0B84D';
    const ACCENT_FG = '#1a1a1e';
    const ACCENT_TEXT = '#F5D780';
    const BG_BASE = '#1a1a1e';
    const BG_SURFACE = '#242428';
    const TEXT_MUTED = '#5C5C64';
    const TEXT_SECONDARY = '#9A9AA0';

    it('verifies contrast ratio of gold accent fg (#1a1a1e) on gold accent bg (#D4A843)', () => {
      const ratio = getContrastRatio(ACCENT_FG, ACCENT_GOLD);
      // WCAG AA for normal text requires >= 4.5:1, AAA requires >= 7.0:1
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
      // Precise expected value 7.86:1
      expect(ratio).toBeCloseTo(7.86, 1);
    });

    it('verifies contrast ratio of gold accent fg (#1a1a1e) on accent hover bg (#E0B84D)', () => {
      const ratio = getContrastRatio(ACCENT_FG, ACCENT_HOVER);
      expect(ratio).toBeGreaterThanOrEqual(7.0); // Passes AAA
      expect(ratio).toBeCloseTo(9.20, 1);
    });

    it('verifies contrast ratio of gold accent text (#F5D780) on surface background (#242428)', () => {
      const ratio = getContrastRatio(ACCENT_TEXT, BG_SURFACE);
      expect(ratio).toBeGreaterThanOrEqual(7.0); // Passes AAA
      expect(ratio).toBeCloseTo(10.98, 1);
    });

    it('verifies contrast ratio of gold accent color (#D4A843) on dark base (#1a1a1e)', () => {
      const ratio = getContrastRatio(ACCENT_GOLD, BG_BASE);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeCloseTo(7.86, 1);
    });

    it('audits text secondary (#9A9AA0) contrast on surface background (#242428)', () => {
      const ratio = getContrastRatio(TEXT_SECONDARY, BG_SURFACE);
      // WCAG AA requires 4.5:1
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeCloseTo(5.55, 1);
    });

    it('detects contrast ratio FAILS for muted text (#5C5C64) on surface background (#242428)', () => {
      const ratio = getContrastRatio(TEXT_MUTED, BG_SURFACE);
      // WCAG AA requirement is 4.5:1. Ratio is ~2.34:1, failing AA.
      expect(ratio).toBeLessThan(4.5);
      expect(ratio).toBeCloseTo(2.34, 1);
    });
  });
});
