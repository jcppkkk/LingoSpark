import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { AppView } from '../../types';

// Mock navigation function
const mockNavigate = vi.fn((view: AppView) => {
  // Update URL hash for testing
  window.location.hash = `#/${view.toLowerCase().replace('_', '-')}`;
});

// Mock AppView enum
const mockAppView = {
  DASHBOARD: AppView.DASHBOARD,
  ADD_WORD: AppView.ADD_WORD,
  PRACTICE: AppView.PRACTICE,
  CARD_DETAILS: AppView.CARD_DETAILS,
};

interface AllTheProvidersProps {
  children: React.ReactNode;
}

// 提供所有必要的 providers
const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  return <>{children}</>;
};

// 自訂 render 函數，包含所有 providers
const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// 帶路由的 render 函數
const renderWithRouter = (
  ui: React.ReactElement,
  initialView: AppView = AppView.DASHBOARD,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  // 設置初始 URL hash
  window.location.hash = `#/${initialView.toLowerCase().replace('_', '-')}`;
  
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// 等待導航完成
const waitForNavigation = async (expectedView: AppView, timeout = 3000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const currentHash = window.location.hash.slice(1);
    const expectedHash = `/${expectedView.toLowerCase().replace('_', '-')}`;
    
    if (currentHash === expectedHash) {
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Navigation to ${expectedView} did not complete within ${timeout}ms`);
};

// Mock storage service
const mockStorageService = {
  getStats: vi.fn().mockResolvedValue({
    totalCards: 10,
    dueCards: 5,
    learnedCount: 3,
  }),
  getCards: vi.fn().mockResolvedValue([]),
  saveCard: vi.fn().mockResolvedValue(undefined),
  deleteCard: vi.fn().mockResolvedValue(undefined),
  processReview: vi.fn().mockResolvedValue(undefined),
};

// Mock sync service
const mockSyncService = {
  performSync: vi.fn().mockResolvedValue(undefined),
  subscribeToSyncStatus: vi.fn((callback) => {
    callback({ isSyncing: false, lastSyncedAt: null, error: null });
    return () => {}; // unsubscribe function
  }),
  getSyncStatus: vi.fn().mockReturnValue({
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
  }),
};

// Mock speech service
const mockSpeechService = {
  getAvailableVoices: vi.fn().mockResolvedValue([]),
  speakWord: vi.fn().mockResolvedValue(undefined),
  findDefaultEnglishVoice: vi.fn().mockResolvedValue(null),
};

// Mock sound service
const mockSoundService = {
  playCorrectSound: vi.fn(),
  playWrongSound: vi.fn(),
};

export {
  renderWithProviders,
  renderWithRouter,
  waitForNavigation,
  mockNavigate,
  mockAppView,
  mockStorageService,
  mockSyncService,
  mockSpeechService,
  mockSoundService,
};

// 重新導出 testing-library 的常用函數
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

