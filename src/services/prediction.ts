// WinMix Prediction Service

import { apiService } from './api';
import { storageService } from './storage';
import type { PredictionInput, PredictionResult, MatchSlot, PredictionAlgorithm } from '@/types';
import { generateMatchId } from '@/utils/helpers';

export class PredictionService {
  private cache = new Map<string, { result: PredictionResult[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async runPredictions(
    slots: MatchSlot[],
    algorithm: PredictionAlgorithm = 'default'
  ): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];

    for (const slot of slots) {
      if (!slot.isValid || !slot.homeTeam || !slot.awayTeam) {
        continue;
      }

      try {
        const prediction = await this.getPrediction({
          homeTeam: slot.homeTeam,
          awayTeam: slot.awayTeam,
          algorithm,
        });

        if (prediction) {
          predictions.push(prediction);
          // Store in recent predictions
          storageService.addRecentPrediction(prediction);
        }
      } catch (error) {
        console.error(`Prediction failed for ${slot.homeTeam} vs ${slot.awayTeam}:`, error);
        // Add fallback prediction
        predictions.push(this.getFallbackPrediction(slot.homeTeam, slot.awayTeam, algorithm));
      }
    }

    return predictions;
  }

  private async getPrediction(input: PredictionInput): Promise<PredictionResult | null> {
    const cacheKey = this.getCacheKey(input);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result[0];
    }

    // Try API call
    const response = await apiService.getPredictions(input);
    if (response.success && response.data && response.data.length > 0) {
      // Cache the result
      this.cache.set(cacheKey, {
        result: response.data,
        timestamp: Date.now(),
      });
      return response.data[0];
    }

    return null;
  }

  private getFallbackPrediction(
    homeTeam: string,
    awayTeam: string,
    algorithm: PredictionAlgorithm
  ): PredictionResult {
    // Generate a reasonable fallback prediction
    const homeAdvantage = 0.1; // 10% home advantage
    const baseWin = 0.33;
    const baseDraw = 0.27;
    const baseAway = 0.40;

    return {
      homeWinProbability: Math.round((baseWin + homeAdvantage) * 100),
      drawProbability: Math.round(baseDraw * 100),
      awayWinProbability: Math.round((baseAway - homeAdvantage) * 100),
      expectedGoals: {
        home: 1.2 + Math.random() * 0.8,
        away: 1.0 + Math.random() * 0.8,
      },
      bothTeamsScore: Math.round((0.5 + Math.random() * 0.3) * 100),
      totalGoals: {
        over15: Math.round((0.7 + Math.random() * 0.2) * 100),
        over25: Math.round((0.5 + Math.random() * 0.3) * 100),
        over35: Math.round((0.3 + Math.random() * 0.3) * 100),
      },
      confidence: 0.6 + Math.random() * 0.2,
      algorithm: `${algorithm} (fallback)`,
    };
  }

  private getCacheKey(input: PredictionInput): string {
    return `${input.homeTeam}-${input.awayTeam}-${input.algorithm}-${input.season || 'current'}`;
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Analysis methods for different algorithms
  async runAlgorithmAnalysis(
    slots: MatchSlot[]
  ): Promise<Record<PredictionAlgorithm, PredictionResult[]>> {
    const algorithms: PredictionAlgorithm[] = [
      'default',
      'attack_defense',
      'poisson',
      'elo',
      'machine_learning',
      'random_forest',
      'seasonal_trends'
    ];

    const results: Record<string, PredictionResult[]> = {};

    for (const algorithm of algorithms) {
      try {
        results[algorithm] = await this.runPredictions(slots, algorithm);
      } catch (error) {
        console.error(`Algorithm ${algorithm} failed:`, error);
        results[algorithm] = [];
      }
    }

    return results as Record<PredictionAlgorithm, PredictionResult[]>;
  }

  // Statistical analysis
  calculateAlgorithmAccuracy(
    predictions: PredictionResult[],
    actualResults: { homeScore: number; awayScore: number }[]
  ): number {
    if (predictions.length !== actualResults.length) {
      return 0;
    }

    let correct = 0;
    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i];
      const actual = actualResults[i];
      
      const predictedOutcome = this.getPredictedOutcome(prediction);
      const actualOutcome = this.getActualOutcome(actual.homeScore, actual.awayScore);
      
      if (predictedOutcome === actualOutcome) {
        correct++;
      }
    }

    return (correct / predictions.length) * 100;
  }

  private getPredictedOutcome(prediction: PredictionResult): '1' | 'X' | '2' {
    const { homeWinProbability, drawProbability, awayWinProbability } = prediction;
    
    if (homeWinProbability > drawProbability && homeWinProbability > awayWinProbability) {
      return '1';
    }
    if (awayWinProbability > drawProbability && awayWinProbability > homeWinProbability) {
      return '2';
    }
    return 'X';
  }

  private getActualOutcome(homeScore: number, awayScore: number): '1' | 'X' | '2' {
    if (homeScore > awayScore) return '1';
    if (homeScore < awayScore) return '2';
    return 'X';
  }

  // Export predictions
  exportPredictions(predictions: PredictionResult[]): string {
    const csvHeader = [
      'Algorithm',
      'Home Win %',
      'Draw %', 
      'Away Win %',
      'Expected Goals Home',
      'Expected Goals Away',
      'Both Teams Score %',
      'Over 1.5 Goals %',
      'Over 2.5 Goals %',
      'Over 3.5 Goals %',
      'Confidence'
    ].join(',');

    const csvRows = predictions.map(p => [
      p.algorithm,
      p.homeWinProbability,
      p.drawProbability,
      p.awayWinProbability,
      p.expectedGoals.home.toFixed(2),
      p.expectedGoals.away.toFixed(2),
      p.bothTeamsScore,
      p.totalGoals.over15,
      p.totalGoals.over25,
      p.totalGoals.over35,
      (p.confidence * 100).toFixed(1)
    ].join(','));

    return [csvHeader, ...csvRows].join('\n');
  }

  // Import/validate prediction data
  validatePredictionData(data: any): data is PredictionResult {
    const required = [
      'homeWinProbability',
      'drawProbability', 
      'awayWinProbability',
      'expectedGoals',
      'bothTeamsScore',
      'totalGoals',
      'confidence',
      'algorithm'
    ];

    return required.every(field => field in data) &&
           typeof data.expectedGoals === 'object' &&
           'home' in data.expectedGoals &&
           'away' in data.expectedGoals &&
           typeof data.totalGoals === 'object' &&
           'over15' in data.totalGoals &&
           'over25' in data.totalGoals &&
           'over35' in data.totalGoals;
  }
}

export const predictionService = new PredictionService();