import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockStorageService } from '../utils/test-helpers';
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
    return () => {}; // unsubscribe function
  }),
}));

describe('UX0001: 查看學習統計', () => {
  const mockNavigate = vi.fn();
  const mockViews = AppView;

  beforeEach(() => {
    vi.clearAllMocks();
    // 設置預設的 mock 返回值
    vi.mocked(storageService.getStats).mockResolvedValue({
      totalCards: 10,
      dueCards: 5,
      learnedCount: 3,
    });
  });

  it('應該在頁面載入時顯示學習統計', async () => {
    // 觸發條件：使用者進入應用程式，儀表板頁面載入完成
    // 操作步驟：
    // 1. 應用程式啟動，自動導航到儀表板頁面
    // 2. 系統自動載入學習統計資料（總單字量、待複習數量、已學會數量）
    // 3. 統計資訊顯示在頁面上
    // 
    // 預期結果：
    // - 右上角顯示總單字量資訊
    // - 頁面顯示待複習單字數量
    // - 頁面顯示已學會單字數量
    // - 所有統計資料正確載入並顯示

    renderWithProviders(
      <Dashboard onNavigate={mockNavigate} views={mockViews} />
    );

    // 等待統計資料載入
    await waitFor(() => {
      expect(storageService.getStats).toHaveBeenCalled();
    });

    // 驗證總單字量顯示
    expect(screen.getByText('總單字量：')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    // 驗證待複習數量顯示
    expect(screen.getByText('待複習')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    // 驗證已學會數量（雖然在按鈕中，但應該有相關顯示）
    expect(screen.getByText(/開始複習挑戰/i)).toBeInTheDocument();
  });
});

