import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppView } from '../../types';
import { waitForNavigation } from './test-helpers';

/**
 * 測試按鈕點擊後導航
 * 
 * @param buttonText - 按鈕文字或測試 ID
 * @param expectedView - 預期的目標視圖
 * @param options - 選項
 */
export const testNavigation = async (
  buttonText: string | RegExp,
  expectedView: AppView,
  options?: {
    timeout?: number;
    useGetByRole?: boolean;
  },
) => {
  const { timeout = 3000, useGetByRole = true } = options || {};

  // 查找按鈕
  let button: HTMLElement;
  if (useGetByRole) {
    button = screen.getByRole('button', { name: buttonText });
  } else {
    button = screen.getByText(buttonText);
  }

  // 點擊按鈕
  await userEvent.click(button);

  // 等待導航完成
  await waitForNavigation(expectedView, timeout);

  // 驗證 URL hash 已更新
  const expectedHash = `/${expectedView.toLowerCase().replace('_', '-')}`;
  expect(window.location.hash).toBe(`#${expectedHash}`);
};

/**
 * 測試導航按鈕是否存在且可點擊
 */
export const testNavigationButton = async (
  buttonText: string | RegExp,
  expectedView: AppView,
) => {
  const button = screen.getByRole('button', { name: buttonText });
  expect(button).toBeInTheDocument();
  expect(button).not.toBeDisabled();

  await testNavigation(buttonText, expectedView);
};

