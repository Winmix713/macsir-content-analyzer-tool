// WinMix Storage Service

import type { UserPreferences, PredictionResult, MatchSlot } from '@/types';
import { STORAGE_KEYS, DEFAULT_PREFERENCES } from '@/utils/constants';

export class StorageService {
  private isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private get<T>(key: string, defaultValue: T): T {
    if (!this.isStorageAvailable()) {
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from storage (${key}):`, error);
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): boolean {
    if (!this.isStorageAvailable()) {
      return false;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to storage (${key}):`, error);
      return false;
    }
  }

  private remove(key: string): boolean {
    if (!this.isStorageAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from storage (${key}):`, error);
      return false;
    }
  }

  // User Preferences
  getUserPreferences(): UserPreferences {
    return this.get(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES);
  }

  setUserPreferences(preferences: UserPreferences): boolean {
    return this.set(STORAGE_KEYS.USER_PREFERENCES, preferences);
  }

  // Recent Predictions
  getRecentPredictions(): PredictionResult[] {
    return this.get(STORAGE_KEYS.RECENT_PREDICTIONS, []);
  }

  addRecentPrediction(prediction: PredictionResult): boolean {
    const recent = this.getRecentPredictions();
    const updated = [prediction, ...recent.slice(0, 19)]; // Keep last 20
    return this.set(STORAGE_KEYS.RECENT_PREDICTIONS, updated);
  }

  clearRecentPredictions(): boolean {
    return this.remove(STORAGE_KEYS.RECENT_PREDICTIONS);
  }

  // Favorite Matches
  getFavoriteMatches(): string[] {
    return this.get(STORAGE_KEYS.FAVORITE_MATCHES, []);
  }

  addFavoriteMatch(matchId: string): boolean {
    const favorites = this.getFavoriteMatches();
    if (!favorites.includes(matchId)) {
      favorites.push(matchId);
      return this.set(STORAGE_KEYS.FAVORITE_MATCHES, favorites);
    }
    return true;
  }

  removeFavoriteMatch(matchId: string): boolean {
    const favorites = this.getFavoriteMatches();
    const updated = favorites.filter(id => id !== matchId);
    return this.set(STORAGE_KEYS.FAVORITE_MATCHES, updated);
  }

  isFavoriteMatch(matchId: string): boolean {
    return this.getFavoriteMatches().includes(matchId);
  }

  // Authentication Token
  getAuthToken(): string | null {
    return this.get(STORAGE_KEYS.AUTH_TOKEN, null);
  }

  setAuthToken(token: string): boolean {
    return this.set(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  clearAuthToken(): boolean {
    return this.remove(STORAGE_KEYS.AUTH_TOKEN);
  }

  // Match Slots
  getMatchSlots(): MatchSlot[] {
    const defaultSlots: MatchSlot[] = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      homeTeam: null,
      awayTeam: null,
      isValid: false,
    }));
    
    return this.get(STORAGE_KEYS.MATCH_SLOTS, defaultSlots);
  }

  setMatchSlots(slots: MatchSlot[]): boolean {
    return this.set(STORAGE_KEYS.MATCH_SLOTS, slots);
  }

  updateMatchSlot(slotId: number, homeTeam: string | null, awayTeam: string | null): boolean {
    const slots = this.getMatchSlots();
    const slotIndex = slots.findIndex(slot => slot.id === slotId);
    
    if (slotIndex !== -1) {
      slots[slotIndex] = {
        ...slots[slotIndex],
        homeTeam,
        awayTeam,
        isValid: homeTeam !== null && awayTeam !== null && homeTeam !== awayTeam,
      };
      return this.set(STORAGE_KEYS.MATCH_SLOTS, slots);
    }
    
    return false;
  }

  clearMatchSlots(): boolean {
    return this.remove(STORAGE_KEYS.MATCH_SLOTS);
  }

  // Cache Management
  clearCache(): boolean {
    if (!this.isStorageAvailable()) {
      return false;
    }

    try {
      const keys = Object.values(STORAGE_KEYS);
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  // Export/Import
  exportData(): string {
    const data: Record<string, any> = {};
    
    Object.values(STORAGE_KEYS).forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        data[key] = JSON.parse(value);
      }
    });

    return JSON.stringify(data, null, 2);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      Object.entries(data).forEach(([key, value]) => {
        if (Object.values(STORAGE_KEYS).includes(key as any)) {
          this.set(key, value);
        }
      });

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export const storageService = new StorageService();