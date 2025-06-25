// WinMix Main Application Class

import { AuthModal } from '@/components/AuthModal';
import { MatchSelector } from '@/components/MatchSelector';
import { ChartRenderer } from '@/components/ChartRenderer';
import { predictionService } from '@/services/prediction';
import { storageService } from '@/services/storage';
import { apiService } from '@/services/api';
import type { PredictionResult, MatchSlot, PredictionAlgorithm } from '@/types';
import { ALGORITHMS } from '@/utils/constants';
import { formatPercentage, formatGoals, calculateConfidenceLevel } from '@/utils/helpers';

export class WinMixApp {
  private authModal: AuthModal;
  private matchSelector: MatchSelector;
  private chartRenderer: ChartRenderer;
  private currentPredictions: PredictionResult[] = [];
  private isLoading = false;

  constructor() {
    this.authModal = new AuthModal();
    this.matchSelector = new MatchSelector('matchSelector');
    this.chartRenderer = new ChartRenderer();
    
    this.initialize();
  }

  private initialize(): void {
    this.setupEventListeners();
    this.updateUIState();
    this.checkAPIHealth();
  }

  private setupEventListeners(): void {
    // Auth events
    document.getElementById('loginBtn')?.addEventListener('click', () => {
      this.authModal.show();
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      this.authModal.logout();
    });

    // Prediction events
    document.addEventListener('runPredictions', (e: CustomEvent) => {
      this.handleRunPredictions(e.detail.slots);
    });

    // Algorithm selection
    document.getElementById('algorithmSelect')?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.handleAlgorithmChange(target.value as PredictionAlgorithm);
    });

    // Export events
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      this.exportPredictions();
    });

    document.getElementById('exportChartsBtn')?.addEventListener('click', () => {
      this.exportCharts();
    });

    // Clear events
    document.getElementById('clearResultsBtn')?.addEventListener('click', () => {
      this.clearResults();
    });

    // Window events
    window.addEventListener('resize', () => {
      this.chartRenderer.resizeAll();
    });

    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  private updateUIState(): void {
    const isAuthenticated = this.authModal.isAuthenticated();
    
    // Toggle auth buttons
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');

    if (loginBtn && logoutBtn) {
      if (isAuthenticated) {
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        if (userInfo) {
          userInfo.classList.remove('hidden');
        }
      } else {
        loginBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        if (userInfo) {
          userInfo.classList.add('hidden');
        }
      }
    }

    // Load user preferences
    const preferences = storageService.getUserPreferences();
    const algorithmSelect = document.getElementById('algorithmSelect') as HTMLSelectElement;
    if (algorithmSelect) {
      algorithmSelect.value = preferences.defaultAlgorithm;
    }

    this.loadRecentPredictions();
  }

  private async checkAPIHealth(): Promise<void> {
    const healthResponse = await apiService.getHealth();
    const statusIndicator = document.getElementById('apiStatus');
    
    if (statusIndicator) {
      if (healthResponse.success) {
        statusIndicator.innerHTML = '<i class="ri-checkbox-circle-line text-green-500"></i> API Online';
      } else {
        statusIndicator.innerHTML = '<i class="ri-error-warning-line text-red-500"></i> API Offline';
      }
    }
  }

  private async handleRunPredictions(slots: MatchSlot[]): Promise<void> {
    if (this.isLoading) return;

    this.setLoadingState(true);
    
    try {
      const algorithmSelect = document.getElementById('algorithmSelect') as HTMLSelectElement;
      const algorithm = (algorithmSelect?.value || 'default') as PredictionAlgorithm;

      this.currentPredictions = await predictionService.runPredictions(slots, algorithm);
      
      if (this.currentPredictions.length > 0) {
        this.displayPredictions(this.currentPredictions, slots);
        this.renderCharts(this.currentPredictions, slots);
        this.showSuccessMessage(`${this.currentPredictions.length} predikció sikeresen lefutott!`);
      } else {
        this.showErrorMessage('Nem sikerült predikciót generálni. Próbálja újra!');
      }
    } catch (error) {
      console.error('Prediction error:', error);
      this.showErrorMessage('Hiba történt a predikciók futtatása során.');
    } finally {
      this.setLoadingState(false);
    }
  }

  private handleAlgorithmChange(algorithm: PredictionAlgorithm): void {
    // Update user preferences
    const preferences = storageService.getUserPreferences();
    preferences.defaultAlgorithm = algorithm;
    storageService.setUserPreferences(preferences);

    // Re-run predictions if we have valid slots
    const validSlots = this.matchSelector.getValidSlots();
    if (validSlots.length > 0 && !this.isLoading) {
      this.handleRunPredictions(validSlots);
    }
  }

  private displayPredictions(predictions: PredictionResult[], slots: MatchSlot[]): void {
    const container = document.getElementById('predictionsContainer');
    if (!container) return;

    container.innerHTML = predictions.map((prediction, index) => {
      const slot = slots[index];
      const confidenceLevel = calculateConfidenceLevel(prediction);
      const confidenceColor = {
        high: 'text-green-400',
        medium: 'text-yellow-400',
        low: 'text-red-400'
      }[confidenceLevel];

      return `
        <div class="prediction-card bg-gray-800 rounded-lg p-6 border border-gray-600">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold text-white">
              ${slot?.homeTeam ? this.getTeamName(slot.homeTeam) : 'N/A'} vs 
              ${slot?.awayTeam ? this.getTeamName(slot.awayTeam) : 'N/A'}
            </h3>
            <span class="text-sm text-gray-400">${prediction.algorithm}</span>
          </div>

          <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-primary-500">
                ${formatPercentage(prediction.homeWinProbability)}
              </div>
              <div class="text-sm text-gray-400">Hazai</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-yellow-500">
                ${formatPercentage(prediction.drawProbability)}
              </div>
              <div class="text-sm text-gray-400">Döntetlen</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-red-500">
                ${formatPercentage(prediction.awayWinProbability)}
              </div>
              <div class="text-sm text-gray-400">Vendég</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span class="text-gray-400">Várható gólok:</span>
              <span class="text-white ml-2">
                ${formatGoals(prediction.expectedGoals.home)} - ${formatGoals(prediction.expectedGoals.away)}
              </span>
            </div>
            <div>
              <span class="text-gray-400">BTTS:</span>
              <span class="text-white ml-2">${formatPercentage(prediction.bothTeamsScore)}</span>
            </div>
            <div>
              <span class="text-gray-400">Over 2.5:</span>
              <span class="text-white ml-2">${formatPercentage(prediction.totalGoals.over25)}</span>
            </div>
            <div>
              <span class="text-gray-400">Megbízhatóság:</span>
              <span class="${confidenceColor} ml-2">${formatPercentage(prediction.confidence * 100)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Show the results section
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
      resultsSection.classList.remove('hidden');
    }
  }

  private renderCharts(predictions: PredictionResult[], slots: MatchSlot[]): void {
    const matchLabels = slots.map(slot => 
      slot.homeTeam && slot.awayTeam 
        ? `${this.getTeamName(slot.homeTeam)} vs ${this.getTeamName(slot.awayTeam)}` 
        : 'N/A'
    );

    // Render different chart types
    this.chartRenderer.renderProbabilityChart('probabilityChart', predictions, matchLabels);
    this.chartRenderer.renderExpectedGoalsChart('expectedGoalsChart', predictions, matchLabels);
    this.chartRenderer.renderGoalMarketsChart('goalMarketsChart', predictions, matchLabels);
    this.chartRenderer.renderConfidenceChart('confidenceChart', predictions, matchLabels);

    // Show charts section
    const chartsSection = document.getElementById('chartsSection');
    if (chartsSection) {
      chartsSection.classList.remove('hidden');
    }
  }

  private getTeamName(teamKey: string): string {
    // This would typically come from the TEAMS constant or API
    return teamKey.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private setLoadingState(loading: boolean): void {
    this.isLoading = loading;
    const loadingIndicator = document.getElementById('loadingIndicator');
    const runButton = document.getElementById('runPredictions');

    if (loadingIndicator) {
      if (loading) {
        loadingIndicator.classList.remove('hidden');
      } else {
        loadingIndicator.classList.add('hidden');
      }
    }

    if (runButton) {
      (runButton as HTMLButtonElement).disabled = loading;
      if (loading) {
        runButton.innerHTML = '<i class="ri-loader-line animate-spin mr-2"></i>Futtatás...';
      } else {
        runButton.innerHTML = '<i class="ri-play-circle-line mr-2"></i>Predikciók futtatása';
      }
    }
  }

  private showSuccessMessage(message: string): void {
    this.showMessage(message, 'success');
  }

  private showErrorMessage(message: string): void {
    this.showMessage(message, 'error');
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg z-50 ${
      type === 'success' ? 'bg-green-600' :
      type === 'error' ? 'bg-red-600' : 'bg-blue-600'
    } text-white`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  private loadRecentPredictions(): void {
    const recent = storageService.getRecentPredictions();
    const container = document.getElementById('recentPredictions');
    
    if (container && recent.length > 0) {
      container.innerHTML = recent.slice(0, 5).map(prediction => `
        <div class="bg-gray-700 p-3 rounded">
          <div class="text-sm text-gray-300">${prediction.algorithm}</div>
          <div class="text-xs text-gray-400">
            ${formatPercentage(prediction.homeWinProbability)} / 
            ${formatPercentage(prediction.drawProbability)} / 
            ${formatPercentage(prediction.awayWinProbability)}
          </div>
        </div>
      `).join('');
    }
  }

  private exportPredictions(): void {
    if (this.currentPredictions.length === 0) {
      this.showErrorMessage('Nincs exportálható predikció!');
      return;
    }

    const csvData = predictionService.exportPredictions(this.currentPredictions);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `winmix-predictions-${new Date().toISOString().split('T')[0]}.csv`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
    this.showSuccessMessage('Predikciók exportálva!');
  }

  private exportCharts(): void {
    const charts = ['probabilityChart', 'expectedGoalsChart', 'goalMarketsChart', 'confidenceChart'];
    
    charts.forEach((chartId, index) => {
      setTimeout(() => {
        this.chartRenderer.exportChart(chartId, `winmix-${chartId}-${Date.now()}.png`);
      }, index * 500);
    });
    
    this.showSuccessMessage('Diagramok exportálva!');
  }

  private clearResults(): void {
    this.currentPredictions = [];
    
    const containers = ['predictionsContainer', 'resultsSection', 'chartsSection'];
    containers.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        if (id === 'predictionsContainer') {
          element.innerHTML = '';
        } else {
          element.classList.add('hidden');
        }
      }
    });

    this.chartRenderer.destroyAll();
    this.showSuccessMessage('Eredmények törölve!');
  }

  private cleanup(): void {
    this.chartRenderer.destroyAll();
    predictionService.clearCache();
  }

  // Public methods for external access
  public getCurrentPredictions(): PredictionResult[] {
    return this.currentPredictions;
  }

  public getMatchSelector(): MatchSelector {
    return this.matchSelector;
  }

  public getChartRenderer(): ChartRenderer {
    return this.chartRenderer;
  }
}