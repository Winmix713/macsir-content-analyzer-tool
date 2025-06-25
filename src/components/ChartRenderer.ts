// WinMix Chart Renderer Component

import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import type { PredictionResult, ChartData } from '@/types';
import { CHART_COLORS } from '@/utils/constants';
import { formatPercentage, formatGoals } from '@/utils/helpers';

// Register Chart.js components
Chart.register(...registerables);

export class ChartRenderer {
  private charts: Map<string, Chart> = new Map();

  constructor() {
    // Set default chart options
    Chart.defaults.color = '#ffffff';
    Chart.defaults.backgroundColor = '#374151';
    Chart.defaults.borderColor = '#6b7280';
  }

  // Render prediction probability chart
  renderProbabilityChart(
    canvasId: string,
    predictions: PredictionResult[],
    matchLabels: string[]
  ): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    this.destroyChart(canvasId);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: matchLabels,
        datasets: [
          {
            label: 'Hazai győzelem',
            data: predictions.map(p => p.homeWinProbability),
            backgroundColor: CHART_COLORS.PRIMARY,
            borderColor: CHART_COLORS.PRIMARY,
            borderWidth: 1
          },
          {
            label: 'Döntetlen',
            data: predictions.map(p => p.drawProbability),
            backgroundColor: CHART_COLORS.WARNING,
            borderColor: CHART_COLORS.WARNING,
            borderWidth: 1
          },
          {
            label: 'Vendég győzelem',
            data: predictions.map(p => p.awayWinProbability),
            backgroundColor: CHART_COLORS.ERROR,
            borderColor: CHART_COLORS.ERROR,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Mérkőzés eredmény valószínűségek (%)',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${formatPercentage(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: '#374151'
            },
            ticks: {
              maxRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: '#374151'
            },
            ticks: {
              callback: (value) => `${value}%`
            }
          }
        }
      }
    };

    const chart = new Chart(canvas, config);
    this.charts.set(canvasId, chart);
  }

  // Render expected goals chart
  renderExpectedGoalsChart(
    canvasId: string,
    predictions: PredictionResult[],
    matchLabels: string[]
  ): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    this.destroyChart(canvasId);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: matchLabels,
        datasets: [
          {
            label: 'Hazai várható gólok',
            data: predictions.map(p => p.expectedGoals.home),
            borderColor: CHART_COLORS.PRIMARY,
            backgroundColor: CHART_COLORS.PRIMARY + '20',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Vendég várható gólok',
            data: predictions.map(p => p.expectedGoals.away),
            borderColor: CHART_COLORS.ERROR,
            backgroundColor: CHART_COLORS.ERROR + '20',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Várható gólok száma',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${formatGoals(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: '#374151'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#374151'
            },
            ticks: {
              callback: (value) => formatGoals(value as number)
            }
          }
        }
      }
    };

    const chart = new Chart(canvas, config);
    this.charts.set(canvasId, chart);
  }

  // Render BTTS and Over/Under chart
  renderGoalMarketsChart(
    canvasId: string,
    predictions: PredictionResult[],
    matchLabels: string[]
  ): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    this.destroyChart(canvasId);

    const config: ChartConfiguration = {
      type: 'radar',
      data: {
        labels: ['BTTS', 'Over 1.5', 'Over 2.5', 'Over 3.5'],
        datasets: predictions.map((prediction, index) => ({
          label: matchLabels[index],
          data: [
            prediction.bothTeamsScore,
            prediction.totalGoals.over15,
            prediction.totalGoals.over25,
            prediction.totalGoals.over35
          ],
          borderColor: this.getColorForIndex(index),
          backgroundColor: this.getColorForIndex(index) + '20',
          pointBackgroundColor: this.getColorForIndex(index),
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: this.getColorForIndex(index)
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Gól piaci valószínűségek (%)',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${formatPercentage(context.parsed.r)}`;
              }
            }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: '#374151'
            },
            pointLabels: {
              color: '#ffffff'
            },
            ticks: {
              callback: (value) => `${value}%`,
              stepSize: 20
            }
          }
        }
      }
    };

    const chart = new Chart(canvas, config);
    this.charts.set(canvasId, chart);
  }

  // Render confidence comparison chart
  renderConfidenceChart(
    canvasId: string,
    predictions: PredictionResult[],
    matchLabels: string[]
  ): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    this.destroyChart(canvasId);

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: matchLabels,
        datasets: [{
          data: predictions.map(p => Math.round(p.confidence * 100)),
          backgroundColor: predictions.map((_, index) => this.getColorForIndex(index)),
          borderColor: '#1f2937',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Predikciós megbízhatóság (%)',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.label}: ${formatPercentage(context.parsed)}`;
              }
            }
          }
        }
      }
    };

    const chart = new Chart(canvas, config);
    this.charts.set(canvasId, chart);
  }

  // Render algorithm comparison chart
  renderAlgorithmComparison(
    canvasId: string,
    algorithmResults: Record<string, PredictionResult[]>,
    metric: 'homeWin' | 'draw' | 'awayWin' | 'confidence' = 'confidence'
  ): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    this.destroyChart(canvasId);

    const algorithms = Object.keys(algorithmResults);
    const data = algorithms.map(algorithm => {
      const predictions = algorithmResults[algorithm];
      if (predictions.length === 0) return 0;
      
      let sum = 0;
      predictions.forEach(p => {
        switch (metric) {
          case 'homeWin':
            sum += p.homeWinProbability;
            break;
          case 'draw':
            sum += p.drawProbability;
            break;
          case 'awayWin':
            sum += p.awayWinProbability;
            break;
          case 'confidence':
            sum += p.confidence * 100;
            break;
        }
      });
      
      return sum / predictions.length;
    });

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: algorithms,
        datasets: [{
          label: this.getMetricLabel(metric),
          data: data,
          backgroundColor: CHART_COLORS.INFO,
          borderColor: CHART_COLORS.INFO,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Algoritmus összehasonlítás - ${this.getMetricLabel(metric)}`,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              color: '#374151'
            },
            ticks: {
              maxRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#374151'
            },
            ticks: {
              callback: (value) => `${value}%`
            }
          }
        }
      }
    };

    const chart = new Chart(canvas, config);
    this.charts.set(canvasId, chart);
  }

  private getColorForIndex(index: number): string {
    const colors = [
      CHART_COLORS.PRIMARY,
      CHART_COLORS.ERROR,
      CHART_COLORS.SUCCESS,
      CHART_COLORS.WARNING,
      CHART_COLORS.INFO,
      CHART_COLORS.SECONDARY
    ];
    
    return colors[index % colors.length];
  }

  private getMetricLabel(metric: string): string {
    const labels = {
      homeWin: 'Hazai győzelem átlag (%)',
      draw: 'Döntetlen átlag (%)', 
      awayWin: 'Vendég győzelem átlag (%)',
      confidence: 'Megbízhatóság átlag (%)'
    };
    
    return labels[metric as keyof typeof labels] || metric;
  }

  private destroyChart(canvasId: string): void {
    const existingChart = this.charts.get(canvasId);
    if (existingChart) {
      existingChart.destroy();
      this.charts.delete(canvasId);
    }
  }

  // Cleanup all charts
  destroyAll(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
  }

  // Resize all charts
  resizeAll(): void {
    this.charts.forEach(chart => chart.resize());
  }

  // Export chart as image
  exportChart(canvasId: string, filename: string = 'chart.png'): void {
    const chart = this.charts.get(canvasId);
    if (!chart) return;

    const url = chart.toBase64Image();
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
  }
}