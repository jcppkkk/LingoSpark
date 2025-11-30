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

describe('UX0003: 導航到字庫管理', () => {
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

  it('應該在點擊按鈕後導航到字庫管理頁面', async () => {
    // 觸發條件：使用者在儀表板頁面，點擊「管理單字卡」按鈕
    // 操作步驟：
    // 1. 使用者在儀表板頁面
    // 2. 點擊「管理單字卡」按鈕
    // 3. 系統導航到字庫管理頁面
    // 
    // 預期結果：
    // - 點擊後成功導航到字庫管理頁面
    // - 字庫管理頁面顯示所有單字列表
    // - 可以進行搜尋、篩選、排序等操作

    renderWithProviders(
      <Dashboard onNavigate={mockNavigate} views={mockViews} />
    );

    // 等待組件載入
    await waitFor(() => {
      expect(screen.getByText(/管理單字卡/i)).toBeInTheDocument();
    });

    // 點擊按鈕
    const button = screen.getByRole('button', { name: /管理單字卡/i });
    await userEvent.click(button);

    // 驗證導航函數被調用
    expect(mockNavigate).toHaveBeenCalledWith(AppView.ADD_WORD);
  });
});

