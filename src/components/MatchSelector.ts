// WinMix Match Selector Component

import { TEAMS, MAX_MATCH_SLOTS } from '@/utils/constants';
import { storageService } from '@/services/storage';
import { validateTeamSelection } from '@/utils/helpers';
import type { MatchSlot } from '@/types';

export class MatchSelector {
  private slots: MatchSlot[] = [];
  private container: HTMLElement;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = element;
    this.initialize();
  }

  private initialize(): void {
    this.slots = storageService.getMatchSlots();
    this.render();
    this.bindEvents();
  }

  private render(): void {
    const slotsHTML = this.slots.map(slot => this.renderSlot(slot)).join('');
    
    this.container.innerHTML = `
      <div class="match-selector">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-white">Mérkőzések kiválasztása</h2>
          <div class="flex gap-2">
            <button id="clearAllSlots" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
              <i class="ri-delete-bin-line mr-2"></i>Összes törlése
            </button>
            <button id="randomFillSlots" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              <i class="ri-shuffle-line mr-2"></i>Véletlenszerű kitöltés
            </button>
          </div>
        </div>
        
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          ${slotsHTML}
        </div>
        
        <div class="mt-6 p-4 bg-gray-800 rounded-lg">
          <div class="flex justify-between items-center">
            <div class="text-white">
              <span class="text-lg font-semibold">Kiválasztott mérkőzések: </span>
              <span id="validSlotsCount" class="text-primary-500">${this.getValidSlotsCount()}</span>
              <span class="text-gray-400">/ ${MAX_MATCH_SLOTS}</span>
            </div>
            <button 
              id="runPredictions" 
              class="px-6 py-3 bg-primary-500 text-black font-bold rounded-lg hover:bg-primary-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              ${this.getValidSlotsCount() === 0 ? 'disabled' : ''}
            >
              <i class="ri-play-circle-line mr-2"></i>Predikciók futtatása
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderSlot(slot: MatchSlot): string {
    const homeTeamOptions = this.generateTeamOptions(slot.homeTeam, slot.awayTeam);
    const awayTeamOptions = this.generateTeamOptions(slot.awayTeam, slot.homeTeam);

    return `
      <div class="match-slot p-4 bg-gray-800 rounded-lg border ${slot.isValid ? 'border-primary-500' : 'border-gray-600'}">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-semibold text-white">Mérkőzés ${slot.id}</h3>
          <button 
            class="clear-slot text-gray-400 hover:text-red-400 transition-colors" 
            data-slot-id="${slot.id}"
          >
            <i class="ri-close-line"></i>
          </button>
        </div>
        
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Hazai csapat</label>
            <select 
              class="home-team-select w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-primary-500" 
              data-slot-id="${slot.id}"
            >
              <option value="">Válassz csapatot</option>
              ${homeTeamOptions}
            </select>
          </div>
          
          <div class="text-center text-gray-400 font-bold">VS</div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Vendég csapat</label>
            <select 
              class="away-team-select w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-primary-500" 
              data-slot-id="${slot.id}"
            >
              <option value="">Válassz csapatot</option>
              ${awayTeamOptions}
            </select>
          </div>
        </div>
        
        ${slot.isValid ? `
          <div class="mt-3 p-2 bg-green-800 bg-opacity-30 rounded border border-green-600 text-green-400 text-sm">
            <i class="ri-check-line mr-1"></i>Érvényes mérkőzés
          </div>
        ` : ''}
      </div>
    `;
  }

  private generateTeamOptions(selectedTeam: string | null, excludeTeam: string | null): string {
    return Object.entries(TEAMS)
      .filter(([key]) => key !== excludeTeam)
      .map(([key, team]) => 
        `<option value="${key}" ${selectedTeam === key ? 'selected' : ''}>${team.nameHu}</option>`
      )
      .join('');
  }

  private bindEvents(): void {
    // Home team selection
    this.container.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.classList.contains('home-team-select')) {
        const slotId = parseInt(target.dataset.slotId!);
        const homeTeam = target.value;
        const slot = this.slots.find(s => s.id === slotId);
        if (slot) {
          this.updateSlot(slotId, homeTeam || null, slot.awayTeam);
        }
      }
    });

    // Away team selection
    this.container.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.classList.contains('away-team-select')) {
        const slotId = parseInt(target.dataset.slotId!);
        const awayTeam = target.value;
        const slot = this.slots.find(s => s.id === slotId);
        if (slot) {
          this.updateSlot(slotId, slot.homeTeam, awayTeam || null);
        }
      }
    });

    // Clear slot
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const clearButton = target.closest('.clear-slot') as HTMLElement;
      if (clearButton) {
        const slotId = parseInt(clearButton.dataset.slotId!);
        this.clearSlot(slotId);
      }
    });

    // Clear all slots
    document.getElementById('clearAllSlots')?.addEventListener('click', () => {
      this.clearAllSlots();
    });

    // Random fill
    document.getElementById('randomFillSlots')?.addEventListener('click', () => {
      this.randomFillSlots();
    });

    // Run predictions
    document.getElementById('runPredictions')?.addEventListener('click', () => {
      this.runPredictions();
    });
  }

  private updateSlot(slotId: number, homeTeam: string | null, awayTeam: string | null): void {
    const slotIndex = this.slots.findIndex(slot => slot.id === slotId);
    if (slotIndex !== -1) {
      this.slots[slotIndex] = {
        ...this.slots[slotIndex],
        homeTeam,
        awayTeam,
        isValid: homeTeam !== null && awayTeam !== null && homeTeam !== awayTeam,
      };

      storageService.setMatchSlots(this.slots);
      this.render();
    }
  }

  private clearSlot(slotId: number): void {
    this.updateSlot(slotId, null, null);
  }

  private clearAllSlots(): void {
    this.slots = this.slots.map(slot => ({
      ...slot,
      homeTeam: null,
      awayTeam: null,
      isValid: false,
    }));

    storageService.setMatchSlots(this.slots);
    this.render();
  }

  private randomFillSlots(): void {
    const teamKeys = Object.keys(TEAMS);
    const usedPairs = new Set<string>();

    this.slots = this.slots.map(slot => {
      let homeTeam: string, awayTeam: string;
      let attempts = 0;
      
      do {
        homeTeam = teamKeys[Math.floor(Math.random() * teamKeys.length)];
        awayTeam = teamKeys[Math.floor(Math.random() * teamKeys.length)];
        attempts++;
      } while (
        (homeTeam === awayTeam || 
         usedPairs.has(`${homeTeam}-${awayTeam}`) || 
         usedPairs.has(`${awayTeam}-${homeTeam}`)) && 
        attempts < 50
      );

      if (attempts < 50) {
        usedPairs.add(`${homeTeam}-${awayTeam}`);
        return {
          ...slot,
          homeTeam,
          awayTeam,
          isValid: true,
        };
      }

      return slot;
    });

    storageService.setMatchSlots(this.slots);
    this.render();
  }

  private getValidSlotsCount(): number {
    return this.slots.filter(slot => slot.isValid).length;
  }

  private runPredictions(): void {
    const validSlots = this.slots.filter(slot => slot.isValid);
    if (validSlots.length === 0) {
      alert('Kérjük, válasszon ki legalább egy érvényes mérkőzést!');
      return;
    }

    // Emit custom event
    const event = new CustomEvent('runPredictions', {
      detail: { slots: validSlots }
    });
    document.dispatchEvent(event);
  }

  getValidSlots(): MatchSlot[] {
    return this.slots.filter(slot => slot.isValid);
  }
}