import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, vi } from 'vitest';

/**
 * 測試按鈕點擊和狀態變化
 * 
 * @param buttonText - 按鈕文字或測試 ID
 * @param options - 選項
 */
export const testButtonClick = async (
  buttonText: string | RegExp,
  options?: {
    expectedState?: string | RegExp;
    expectedCallback?: ReturnType<typeof vi.fn>;
    waitForState?: boolean;
    timeout?: number;
  },
) => {
  const {
    expectedState,
    expectedCallback,
    waitForState = false,
    timeout = 3000,
  } = options || {};

  // 查找按鈕
  const button = screen.getByRole('button', { name: buttonText });

  // 驗證按鈕存在且可點擊
  expect(button).toBeInTheDocument();
  expect(button).not.toBeDisabled();

  // 點擊按鈕
  await userEvent.click(button);

  // 驗證回調被調用
  if (expectedCallback) {
    expect(expectedCallback).toHaveBeenCalled();
  }

  // 等待狀態變化
  if (waitForState && expectedState) {
    await waitFor(
      () => {
        expect(screen.getByText(expectedState)).toBeInTheDocument();
      },
      { timeout },
    );
  }
};

/**
 * 測試按鈕狀態變化（載入中、成功、失敗）
 */
export const testButtonState = async (
  buttonText: string | RegExp,
  expectedStates: {
    initial?: string | RegExp;
    loading?: string | RegExp;
    success?: string | RegExp;
    error?: string | RegExp;
  },
) => {
  const { initial, loading, success, error } = expectedStates;

  // 驗證初始狀態
  if (initial) {
    expect(screen.getByText(initial)).toBeInTheDocument();
  }

  // 點擊按鈕
  const button = screen.getByRole('button', { name: buttonText });
  await userEvent.click(button);

  // 驗證載入狀態
  if (loading) {
    await waitFor(() => {
      expect(screen.getByText(loading)).toBeInTheDocument();
    });
  }

  // 驗證成功或錯誤狀態
  if (success) {
    await waitFor(() => {
      expect(screen.getByText(success)).toBeInTheDocument();
    });
  } else if (error) {
    await waitFor(() => {
      expect(screen.getByText(error)).toBeInTheDocument();
    });
  }
};

