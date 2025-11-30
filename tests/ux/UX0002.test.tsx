import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import Dashboard from '../../components/Dashboard';
import { AppView } from '../../types';
import * as storageService from '../../services/storageService';

// Mock storage service
vi.mock('../../services/storageService', () => ({
  getStats: vi.fn(),
}));

// Mock sync service
vi.mock('../../services/syncService', () => ({
  performSync: vi.fn(),
  subscribeToSyncStatus: vi.fn((callback) => {
    callback({ isSyncing: false, lastSyncedAt: null, error: null });
    return () => {};
  }),
}));

describe('UX0002: 開始複習挑戰', () => {
  const mockNavigate = vi.fn();
  const mockViews = AppView;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getStats).mockResolvedValue({
      totalCards: 10,
      dueCards: 5,
      learnedCount: 3,
    });
  });

  it('應該在點擊按鈕後導航到學習模式', async () => {
    // 觸發條件：使用者在儀表板頁面，點擊「開始複習挑戰」按鈕
    // 操作步驟：
    // 1. 使用者在儀表板頁面查看待複習數量
    // 2. 點擊「開始複習挑戰」按鈕
    // 3. 系統導航到學習模式頁面
    // 
    // 預期結果：
    // - 按鈕顯示待複習單字數量
    // - 點擊後成功導航到學習模式
    // - 學習模式顯示待複習的單字

    renderWithProviders(
      <Dashboard onNavigate={mockNavigate} views={mockViews} />
    );

    // 等待組件載入並驗證按鈕顯示待複習數量
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
    expect(screen.getByText(/待複習/i)).toBeInTheDocument();

    // 點擊按鈕
    const button = screen.getByRole('button', { name: /開始複習挑戰/i });
    await userEvent.click(button);

    // 驗證導航函數被調用
    expect(mockNavigate).toHaveBeenCalledWith(AppView.PRACTICE);
  });
});

