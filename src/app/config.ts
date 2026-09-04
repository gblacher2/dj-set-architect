export const PRODUCT_NAME = 'Set Architect';
export const PRODUCT_SUBTITLE = 'Plan the journey. Practice the transitions.';
export const SCHEMA_VERSION = 1;

export interface UserPreferences {
  defaultOverlapSeconds: number;
  defaultEnergyProfile: 'warm-up' | 'steady-groove' | 'build-to-peak' | 'peak-time';
  showAdvancedScoring: boolean;
  density: 'comfortable' | 'compact';
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultOverlapSeconds: 45,
  defaultEnergyProfile: 'build-to-peak',
  showAdvancedScoring: false,
  density: 'comfortable'
};
