// Jest Test Setup

import 'jest-environment-jsdom';

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    resize: jest.fn(),
    toBase64Image: jest.fn(() => 'data:image/png;base64,mock')
  })),
  registerables: []
}));

// Mock lodash-es
jest.mock('lodash-es', () => ({
  debounce: jest.fn((fn) => fn)
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window methods
Object.defineProperty(window, 'location', {
  value: {
    reload: jest.fn()
  }
});

// Mock environment variables
process.env.VITE_API_URL = '/api';

// Setup before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  
  // Reset fetch mock
  (global.fetch as jest.Mock).mockClear();
});

// Global test utilities
global.testUtils = {
  mockAPIResponse: (data: any, success = true) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: success,
      json: async () => ({
        success,
        data,
        timestamp: new Date().toISOString()
      })
    });
  },
  
  mockAPIError: (error = 'Network error') => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(error));
  },
  
  createMockElement: (id: string, tagName = 'div') => {
    const element = document.createElement(tagName);
    element.id = id;
    document.body.appendChild(element);
    return element;
  }
};

// Declare global types
declare global {
  var testUtils: {
    mockAPIResponse: (data: any, success?: boolean) => void;
    mockAPIError: (error?: string) => void;
    createMockElement: (id: string, tagName?: string) => HTMLElement;
  };
}

export {};