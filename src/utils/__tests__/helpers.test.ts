// WinMix Helpers Tests

import {
  formatPercentage,
  formatGoals,
  formatDate,
  calculateConfidenceLevel,
  getWinnerPrediction,
  validateTeamSelection,
  sanitizeInput,
  generateUniqueId,
  calculateWinRate,
  getTeamForm,
  roundToDecimals,
  clamp
} from '../helpers';

import type { PredictionResult, Match } from '@/types';

describe('Helpers', () => {
  describe('formatPercentage', () => {
    it('should format percentage correctly', () => {
      expect(formatPercentage(45.67)).toBe('46%');
      expect(formatPercentage(0)).toBe('0%');
      expect(formatPercentage(100)).toBe('100%');
    });
  });

  describe('formatGoals', () => {
    it('should format goals to 1 decimal place', () => {
      expect(formatGoals(1.234)).toBe('1.2');
      expect(formatGoals(0)).toBe('0.0');
      expect(formatGoals(2.567)).toBe('2.6');
    });
  });

  describe('formatDate', () => {
    it('should format date in Hungarian locale', () => {
      const date = '2024-06-24';
      const formatted = formatDate(date);
      expect(formatted).toMatch(/\d{4}\. \d{2}\. \d{2}\./);
    });
  });

  describe('calculateConfidenceLevel', () => {
    it('should return correct confidence levels', () => {
      const highConfidence: PredictionResult = {
        homeWinProbability: 50,
        drawProbability: 25,
        awayWinProbability: 25,
        expectedGoals: { home: 1.5, away: 1.0 },
        bothTeamsScore: 60,
        totalGoals: { over15: 70, over25: 50, over35: 30 },
        confidence: 0.85,
        algorithm: 'test'
      };

      const mediumConfidence: PredictionResult = {
        ...highConfidence,
        confidence: 0.7
      };

      const lowConfidence: PredictionResult = {
        ...highConfidence,
        confidence: 0.5
      };

      expect(calculateConfidenceLevel(highConfidence)).toBe('high');
      expect(calculateConfidenceLevel(mediumConfidence)).toBe('medium');
      expect(calculateConfidenceLevel(lowConfidence)).toBe('low');
    });
  });

  describe('getWinnerPrediction', () => {
    it('should identify home win correctly', () => {
      const homeWinPrediction: PredictionResult = {
        homeWinProbability: 60,
        drawProbability: 20,
        awayWinProbability: 20,
        expectedGoals: { home: 2.0, away: 1.0 },
        bothTeamsScore: 50,
        totalGoals: { over15: 80, over25: 60, over35: 30 },
        confidence: 0.8,
        algorithm: 'test'
      };

      expect(getWinnerPrediction(homeWinPrediction)).toBe('home');
    });

    it('should identify away win correctly', () => {
      const awayWinPrediction: PredictionResult = {
        homeWinProbability: 20,
        drawProbability: 20,
        awayWinProbability: 60,
        expectedGoals: { home: 1.0, away: 2.0 },
        bothTeamsScore: 50,
        totalGoals: { over15: 80, over25: 60, over35: 30 },
        confidence: 0.8,
        algorithm: 'test'
      };

      expect(getWinnerPrediction(awayWinPrediction)).toBe('away');
    });

    it('should identify draw correctly', () => {
      const drawPrediction: PredictionResult = {
        homeWinProbability: 30,
        drawProbability: 40,
        awayWinProbability: 30,
        expectedGoals: { home: 1.5, away: 1.5 },
        bothTeamsScore: 60,
        totalGoals: { over15: 70, over25: 50, over35: 30 },
        confidence: 0.7,
        algorithm: 'test'
      };

      expect(getWinnerPrediction(drawPrediction)).toBe('draw');
    });
  });

  describe('validateTeamSelection', () => {
    it('should validate correct team selections', () => {
      expect(validateTeamSelection('arsenal', 'chelsea')).toBe(true);
      expect(validateTeamSelection('liverpool', 'manchester-city')).toBe(true);
    });

    it('should reject same teams', () => {
      expect(validateTeamSelection('arsenal', 'arsenal')).toBe(false);
    });

    it('should reject empty teams', () => {
      expect(validateTeamSelection('', 'chelsea')).toBe(false);
      expect(validateTeamSelection('arsenal', '')).toBe(false);
      expect(validateTeamSelection('', '')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('normal text')).toBe('normal text');
      expect(sanitizeInput('text with "quotes" and \'apostrophes\'')).toBe('text with quotes and apostrophes');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  spaced text  ')).toBe('spaced text');
    });
  });

  describe('generateUniqueId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('calculateWinRate', () => {
    it('should calculate win rate correctly', () => {
      const matches: Match[] = [
        {
          id: '1',
          date: '2024-01-01',
          homeTeam: { id: 'arsenal', name: 'Arsenal', nameHu: 'Arsenal' },
          awayTeam: { id: 'chelsea', name: 'Chelsea', nameHu: 'Chelsea' },
          score: { home: 2, away: 1 },
          season: '2023-24',
          competition: 'Premier League'
        },
        {
          id: '2',
          date: '2024-01-02',
          homeTeam: { id: 'arsenal', name: 'Arsenal', nameHu: 'Arsenal' },
          awayTeam: { id: 'liverpool', name: 'Liverpool', nameHu: 'Liverpool' },
          score: { home: 1, away: 3 },
          season: '2023-24',
          competition: 'Premier League'
        }
      ];

      expect(calculateWinRate(matches)).toBe(50); // 1 win out of 2 matches
    });

    it('should return 0 for empty matches', () => {
      expect(calculateWinRate([])).toBe(0);
    });
  });

  describe('getTeamForm', () => {
    it('should return correct form string', () => {
      const matches: Match[] = [
        {
          id: '1',
          date: '2024-01-01',
          homeTeam: { id: 'arsenal', name: 'Arsenal', nameHu: 'Arsenal' },
          awayTeam: { id: 'chelsea', name: 'Chelsea', nameHu: 'Chelsea' },
          score: { home: 2, away: 1 }, // Win
          season: '2023-24',
          competition: 'Premier League'
        },
        {
          id: '2',
          date: '2024-01-02',
          homeTeam: { id: 'arsenal', name: 'Arsenal', nameHu: 'Arsenal' },
          awayTeam: { id: 'liverpool', name: 'Liverpool', nameHu: 'Liverpool' },
          score: { home: 1, away: 1 }, // Draw
          season: '2023-24',
          competition: 'Premier League'
        },
        {
          id: '3',
          date: '2024-01-03',
          homeTeam: { id: 'tottenham', name: 'Tottenham', nameHu: 'Tottenham' },
          awayTeam: { id: 'arsenal', name: 'Arsenal', nameHu: 'Arsenal' },
          score: { home: 3, away: 1 }, // Loss
          season: '2023-24',
          competition: 'Premier League'
        }
      ];

      expect(getTeamForm(matches, 3)).toBe('WDL');
    });
  });

  describe('roundToDecimals', () => {
    it('should round to specified decimal places', () => {
      expect(roundToDecimals(3.14159, 2)).toBe(3.14);
      expect(roundToDecimals(3.14159, 0)).toBe(3);
      expect(roundToDecimals(3.14159, 4)).toBe(3.1416);
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });
});