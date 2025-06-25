// WinMix Application Entry Point

import './styles/main.css';
import { WinMixApp } from './app/WinMixApp';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize the main application
    const app = new WinMixApp();
    
    // Make app instance globally available for debugging
    (window as any).__winmixApp = app;
    
    console.log('🚀 WinMix Prediction System initialized successfully!');
    console.log('Version: 2.0.0 - Modern Architecture');
    
  } catch (error) {
    console.error('❌ Failed to initialize WinMix application:', error);
    
    // Show error message to user
    document.body.innerHTML = `
      <div class="min-h-screen bg-gray-900 flex items-center justify-center">
        <div class="text-center p-8">
          <div class="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 class="text-2xl font-bold text-white mb-4">Alkalmazás betöltési hiba</h1>
          <p class="text-gray-400 mb-4">Hiba történt a WinMix alkalmazás indítása során.</p>
          <button 
            onclick="window.location.reload()" 
            class="bg-primary-500 text-black px-6 py-2 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            Újratöltés
          </button>
        </div>
      </div>
    `;
  }
});

// Service Worker registration for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered:', registration);
    } catch (error) {
      console.log('❌ Service Worker registration failed:', error);
    }
  });
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  // Optional: Send error to analytics service
  // analytics.track('error', { message: event.error.message });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Optional: Send error to analytics service
  // analytics.track('unhandled_rejection', { reason: event.reason });
});

// Performance monitoring
if ('performance' in window) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
      
      console.log(`📊 Page load time: ${loadTime}ms`);
      
      // Optional: Send performance data to analytics
      // analytics.track('performance', { loadTime });
    }, 0);
  });
}