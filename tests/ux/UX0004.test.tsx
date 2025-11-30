import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/test-helpers';
import { testButtonClick } from '../utils/button-helpers';
import Dashboard from '../../components/Dashboard';
import { AppView } from '../../types';
import * as storageService from '../../services/storageService';
import * as syncService from '../../services/syncService';

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

describe('UX0004: 手動觸發雲端同步', () => {
  const mockNavigate = vi.fn();
  const mockViews = AppView;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getStats).mockResolvedValue({
      totalCards: 10,
      dueCards: 5,
      learnedCount: 3,
    });
    
    // 設置同步狀態訂閱
    let currentStatus = { isSyncing: false, lastSyncedAt: null, error: null };
    vi.mocked(syncService.subscribeToSyncStatus).mockImplementation((callback) => {
      callback(currentStatus);
      return () => {};
    });
  });

  it('應該在點擊按鈕後觸發同步流程', async () => {
    // 觸發條件：使用者在儀表板頁面，點擊雲端同步按鈕
    // 操作步驟：
    // 1. 使用者在儀表板頁面
    // 2. 點擊雲端同步按鈕
    // 3. 系統開始執行同步流程
    // 4. 如果需要認證，顯示認證流程
    // 5. 同步完成後顯示同步狀態
    // 
    // 預期結果：
    // - 點擊按鈕後觸發同步流程
    // - 如果未認證，顯示 Google Drive 認證流程
    // - 同步過程中顯示同步狀態（同步中/成功/失敗）
    // - 同步完成後更新同步狀態顯示
    // - 同步失敗時顯示錯誤訊息

    renderWithProviders(
      <Dashboard onNavigate={mockNavigate} views={mockViews} />
    );

    // 使用共用測試元件測試按鈕點擊
    await testButtonClick(/雲端備份/i, {
      expectedCallback: vi.mocked(syncService.performSync),
      waitForState: false,
    });

    // 驗證同步函數被調用（isManual = true）
    expect(syncService.performSync).toHaveBeenCalledWith(true);
  });
});

