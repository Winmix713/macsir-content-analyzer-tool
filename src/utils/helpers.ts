// WinMix Helper Functions

import { debounce } from 'lodash-es';
import type { PredictionResult, Team, Match } from '@/types';

export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

export const formatGoals = (value: number): string => {
  return value.toFixed(1);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('hu-HU');
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('hu-HU');
};

export const calculateConfidenceLevel = (prediction: PredictionResult): 'low' | 'medium' | 'high' => {
  if (prediction.confidence >= 0.8) return 'high';
  if (prediction.confidence >= 0.6) return 'medium';
  return 'low';
};

export const getWinnerPrediction = (prediction: PredictionResult): 'home' | 'draw' | 'away' => {
  const { homeWinProbability, drawProbability, awayWinProbability } = prediction;
  
  if (homeWinProbability > drawProbability && homeWinProbability > awayWinProbability) {
    return 'home';
  }
  if (awayWinProbability > drawProbability && awayWinProbability > homeWinProbability) {
    return 'away';
  }
  return 'draw';
};

export const generateMatchId = (homeTeam: string, awayTeam: string): string => {
  return `${homeTeam}-vs-${awayTeam}-${Date.now()}`;
};

export const validateTeamSelection = (homeTeam: string, awayTeam: string): boolean => {
  return homeTeam !== awayTeam && homeTeam.length > 0 && awayTeam.length > 0;
};

export const sanitizeInput = (input: string): string => {
  return input.replace(/[<>'"]/g, '').trim();
};

export const debouncedSearch = debounce((query: string, callback: (query: string) => void) => {
  callback(query);
}, 300);

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  
  throw new Error('Max retries exceeded');
};

export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const calculateWinRate = (matches: Match[]): number => {
  if (matches.length === 0) return 0;
  
  const wins = matches.filter(match => {
    const homeScore = match.score?.home || 0;
    const awayScore = match.score?.away || 0;
    return homeScore > awayScore;
  }).length;
  
  return (wins / matches.length) * 100;
};

export const getTeamForm = (matches: Match[], limit: number = 5): string => {
  return matches
    .slice(-limit)
    .map(match => {
      const homeScore = match.score?.home || 0;
      const awayScore = match.score?.away || 0;
      
      if (homeScore > awayScore) return 'W';
      if (homeScore < awayScore) return 'L';
      return 'D';
    })
    .join('');
};

export const formatCurrency = (amount: number, currency: string = 'HUF'): string => {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const roundToDecimals = (value: number, decimals: number = 2): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};