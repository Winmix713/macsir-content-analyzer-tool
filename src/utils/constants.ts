// WinMix Constants

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const TEAMS: Record<string, { name: string; nameHu: string }> = {
  'arsenal': { name: 'Arsenal', nameHu: 'Arsenal' },
  'aston-villa': { name: 'Aston Villa', nameHu: 'Aston Villa' },
  'brighton': { name: 'Brighton & Hove Albion', nameHu: 'Brighton' },
  'burnley': { name: 'Burnley', nameHu: 'Burnley' },
  'chelsea': { name: 'Chelsea', nameHu: 'Chelsea' },
  'crystal-palace': { name: 'Crystal Palace', nameHu: 'Crystal Palace' },
  'everton': { name: 'Everton', nameHu: 'Everton' },
  'fulham': { name: 'Fulham', nameHu: 'Fulham' },
  'liverpool': { name: 'Liverpool', nameHu: 'Liverpool' },
  'luton': { name: 'Luton Town', nameHu: 'Luton' },
  'manchester-city': { name: 'Manchester City', nameHu: 'Manchester City' },
  'manchester-united': { name: 'Manchester United', nameHu: 'Manchester United' },
  'newcastle': { name: 'Newcastle United', nameHu: 'Newcastle' },
  'nottingham-forest': { name: 'Nottingham Forest', nameHu: 'Nottingham Forest' },
  'sheffield-united': { name: 'Sheffield United', nameHu: 'Sheffield United' },
  'tottenham': { name: 'Tottenham Hotspur', nameHu: 'Tottenham' },
  'west-ham': { name: 'West Ham United', nameHu: 'West Ham' },
  'wolves': { name: 'Wolverhampton Wanderers', nameHu: 'Wolves' },
  'brentford': { name: 'Brentford', nameHu: 'Brentford' },
  'bournemouth': { name: 'AFC Bournemouth', nameHu: 'Bournemouth' }
};

export const ALGORITHMS = {
  default: 'Alapértelmezett (Forma + H2H)',
  attack_defense: 'Támadás-Védelem Analízis',
  poisson: 'Poisson Eloszlás',
  elo: 'ELO Értékelés',
  machine_learning: 'Gépi Tanulás Ensemble',
  random_forest: 'Random Forest',
  seasonal_trends: 'Szezonális Trendek'
} as const;

export const STORAGE_KEYS = {
  USER_PREFERENCES: 'winmix_preferences',
  RECENT_PREDICTIONS: 'winmix_recent',
  FAVORITE_MATCHES: 'winmix_favorites',
  AUTH_TOKEN: 'winmix_token',
  MATCH_SLOTS: 'winmix_match_slots'
} as const;

export const MAX_MATCH_SLOTS = 8;
export const MAX_RECENT_PREDICTIONS = 20;
export const PREDICTION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const CHART_COLORS = {
  PRIMARY: '#ccff00',
  SECONDARY: '#8fb300',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#3b82f6'
} as const;

export const ANIMATION_DURATION = 300;
export const DEBOUNCE_DELAY = 500;

export const DEFAULT_PREFERENCES = {
  favoriteTeams: [],
  defaultAlgorithm: 'default' as const,
  theme: 'dark' as const,
  notifications: true
};

export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_USERNAME_LENGTH: 50,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
} as const;