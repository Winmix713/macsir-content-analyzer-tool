// WinMix API Service

import type { APIResponse, PredictionInput, PredictionResult, Team } from '@/types';
import { API_BASE_URL } from '@/utils/constants';
import { retryWithBackoff } from '@/utils/helpers';

export class APIService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await retryWithBackoff(async () => {
        const res = await fetch(url, { ...defaultOptions, ...options });
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res;
      });

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getPredictions(input: PredictionInput): Promise<APIResponse<PredictionResult[]>> {
    const params = new URLSearchParams({
      home: input.homeTeam,
      away: input.awayTeam,
      algorithm: input.algorithm,
      ...(input.season && { season: input.season }),
      ...(input.homeAdvantage !== undefined && { 
        home_advantage: input.homeAdvantage.toString() 
      }),
    });

    return this.request<PredictionResult[]>(`/predictions?${params}`);
  }

  async getTeams(): Promise<APIResponse<Team[]>> {
    return this.request<Team[]>('/teams');
  }

  async getHealth(): Promise<APIResponse<{ status: string; version: string }>> {
    return this.request<{ status: string; version: string }>('/health');
  }

  async getStatistics(): Promise<APIResponse<any>> {
    return this.request<any>('/statistics');
  }
}

export const apiService = new APIService();