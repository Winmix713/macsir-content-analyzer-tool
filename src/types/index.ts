// WinMix Prediction System Types

export interface Team {
  id: string;
  name: string;
  nameHu: string;
  logo?: string;
}

export interface Match {
  id: string;
  date: string;
  homeTeam: Team;
  awayTeam: Team;
  score?: {
    home: number;
    away: number;
  };
  season: string;
  competition: string;
}

export interface PredictionInput {
  homeTeam: string;
  awayTeam: string;
  algorithm: PredictionAlgorithm;
  season?: string;
  homeAdvantage?: boolean;
}

export interface PredictionResult {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  expectedGoals: {
    home: number;
    away: number;
  };
  bothTeamsScore: number;
  totalGoals: {
    over15: number;
    over25: number;
    over35: number;
  };
  confidence: number;
  algorithm: string;
  details?: PredictionDetails;
}

export interface PredictionDetails {
  h2hStats?: HeadToHeadStats;
  formIndex?: FormIndex;
  eloRating?: EloRating;
  seasonalTrends?: SeasonalTrends;
}

export interface HeadToHeadStats {
  totalMatches: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  avgGoalsHome: number;
  avgGoalsAway: number;
  recentForm: string;
}

export interface FormIndex {
  home: number;
  away: number;
  homeRecent: Match[];
  awayRecent: Match[];
}

export interface EloRating {
  home: number;
  away: number;
  difference: number;
}

export interface SeasonalTrends {
  homeForm: number[];
  awayForm: number[];
  monthlyPerformance: Record<string, number>;
}

export type PredictionAlgorithm = 
  | 'default'
  | 'attack_defense'
  | 'poisson'
  | 'elo'
  | 'machine_learning'
  | 'random_forest'
  | 'seasonal_trends';

export interface UserPreferences {
  favoriteTeams: string[];
  defaultAlgorithm: PredictionAlgorithm;
  theme: 'light' | 'dark';
  notifications: boolean;
}

export interface MatchSlot {
  id: number;
  homeTeam: string | null;
  awayTeam: string | null;
  isValid: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface Statistics {
  totalPredictions: number;
  accuracy: number;
  favoriteAlgorithms: Record<PredictionAlgorithm, number>;
  recentPredictions: PredictionResult[];
}