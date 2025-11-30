import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, vi } from 'vitest';

/**
 * 測試答案檢查和反饋
 * 
 * @param inputElement - 輸入元素
 * @param answer - 答案
 * @param isCorrect - 是否正確
 * @param expectedFeedback - 預期反饋訊息
 */
export const testAnswerCheck = async (
  inputElement: HTMLElement,
  answer: string,
  isCorrect: boolean,
  expectedFeedback: string | RegExp,
) => {
  // 輸入答案
  await userEvent.clear(inputElement);
  await userEvent.type(inputElement, answer);

  // 點擊檢查按鈕
  const checkButton = screen.getByRole('button', { name: /檢查|check/i });
  await userEvent.click(checkButton);

  // 等待反饋顯示
  await waitFor(() => {
    expect(screen.getByText(expectedFeedback)).toBeInTheDocument();
  });

  // 驗證輸入框狀態
  if (isCorrect) {
    expect(inputElement).toHaveClass(/success|correct|green/i);
    expect(inputElement).toBeDisabled();
  } else {
    expect(inputElement).toHaveClass(/error|wrong|red/i);
    expect(inputElement).not.toBeDisabled();
  }
};

/**
 * 測試音效播放（mock）
 */
export const testSoundPlay = async (
  soundFunction: ReturnType<typeof vi.fn>,
) => {
  expect(soundFunction).toHaveBeenCalled();
};

