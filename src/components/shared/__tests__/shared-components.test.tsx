import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScoreBadge } from '../ScoreBadge';
import { PriorityBadge } from '../PriorityBadge';
import { CamelotBadge } from '../CamelotBadge';
import { EnergyIndicator } from '../EnergyIndicator';

describe('Shared UI Components', () => {
  describe('ScoreBadge', () => {
    it('renders score value and quality text label correctly across tiers', () => {
      const { rerender } = render(<ScoreBadge score={90} />);
      expect(screen.getByText('90')).toBeInTheDocument();
      expect(screen.getByText('Smooth')).toBeInTheDocument();
      expect(screen.getByText('90').parentElement).toHaveClass('numeric');

      rerender(<ScoreBadge score={70} />);
      expect(screen.getByText('70')).toBeInTheDocument();
      expect(screen.getByText('Acceptable')).toBeInTheDocument();

      rerender(<ScoreBadge score={50} />);
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('Watch')).toBeInTheDocument();

      rerender(<ScoreBadge score={30} />);
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('Risky')).toBeInTheDocument();
    });

    it('can hide label when showLabel is false', () => {
      render(<ScoreBadge score={85} showLabel={false} />);
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.queryByText('Smooth')).not.toBeInTheDocument();
    });
  });

  describe('PriorityBadge', () => {
    it('renders priority value and priority text label correctly across tiers', () => {
      const { rerender } = render(<PriorityBadge priority={85} />);
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('85').parentElement).toHaveClass('numeric');

      rerender(<PriorityBadge priority={60} />);
      expect(screen.getByText('60')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();

      rerender(<PriorityBadge priority={35} />);
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();

      rerender(<PriorityBadge priority={10} />);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  describe('CamelotBadge', () => {
    it('renders camelot key correctly with numeric formatting', () => {
      render(<CamelotBadge camelotKey="8A" />);
      expect(screen.getByText('8A')).toBeInTheDocument();
      expect(screen.getByText('8A').parentElement).toHaveClass('numeric');
    });

    it('renders musical key when showMusicalKey is true', () => {
      render(<CamelotBadge camelotKey="8A" showMusicalKey={true} />);
      expect(screen.getByText('8A')).toBeInTheDocument();
      expect(screen.getByText('(Am)')).toBeInTheDocument();
    });
  });

  describe('EnergyIndicator', () => {
    it('renders correct meter role and accessibility attributes', () => {
      render(<EnergyIndicator energy={7} showNumeric={true} />);
      const meter = screen.getByRole('meter');
      expect(meter).toHaveAttribute('aria-valuenow', '7');
      expect(meter).toHaveAttribute('aria-valuemin', '1');
      expect(meter).toHaveAttribute('aria-valuemax', '10');
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });
});
