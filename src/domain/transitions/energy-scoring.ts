import type { EnergyProfile } from '../sets/set';

export interface EnergyScore {
  score: number;
  change: number;
  label: string;
}

export function scoreEnergy(
  fromEnergy: number,
  toEnergy: number,
  profile: EnergyProfile
): EnergyScore {
  const change = Math.round(toEnergy - fromEnergy);

  switch (profile) {
    case 'build-to-peak':
      if (change === 0 || change === 1) {
        return { score: 100, change, label: 'Smooth progression' };
      } else if (change === 2) {
        return { score: 75, change, label: 'Moderate increase' };
      } else if (change >= 3) {
        return { score: 40, change, label: 'Steep energy jump' };
      } else if (change === -1) {
        return { score: 70, change, label: 'Slight energy reset' };
      } else {
        return { score: 30, change, label: 'Strong energy drop' };
      }

    case 'warm-up':
      if (change === 0 || change === 1) {
        return { score: 100, change, label: 'Gentle build' };
      } else if (change === 2) {
        return { score: 55, change, label: 'Quick increase for warm-up' };
      } else if (change >= 3) {
        return { score: 25, change, label: 'Too aggressive for warm-up' };
      } else if (change === -1) {
        return { score: 80, change, label: 'Acceptable reset' };
      } else {
        return { score: 50, change, label: 'Unexpected drop' };
      }

    case 'steady-groove':
      if (change >= -1 && change <= 1) {
        return { score: 100, change, label: 'Maintaining groove' };
      } else if (Math.abs(change) === 2) {
        return { score: 55, change, label: 'Noticeable shift' };
      } else {
        return { score: 25, change, label: 'Breaking the groove' };
      }

    case 'peak-time':
      if (change === 0) {
        return { score: 100, change, label: 'Sustaining peak energy' };
      } else if (change === 1) {
        return { score: 90, change, label: 'Building intensity' };
      } else if (change === 2) {
        return { score: 70, change, label: 'Strong push' };
      } else if (change >= 3) {
        return { score: 45, change, label: 'Dramatic escalation — may feel forced' };
      } else if (change === -1) {
        return { score: 75, change, label: 'Brief reset — acceptable if intentional' };
      } else if (change === -2) {
        return { score: 40, change, label: 'Significant energy loss' };
      } else {
        return { score: 20, change, label: 'Losing the floor' };
      }

    default:
      return { score: 50, change, label: 'Unknown profile' };
  }
}
