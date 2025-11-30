import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * 測試卡片翻轉動畫和內容
 * 
 * @param cardElement - 卡片元素或選擇器
 * @param expectedFrontContent - 正面預期內容
 * @param expectedBackContent - 背面預期內容
 */
export const testCardFlip = async (
  cardElement: HTMLElement | string,
  expectedFrontContent: (string | RegExp)[],
  expectedBackContent: (string | RegExp)[],
) => {
  // 獲取卡片元素
  const card = typeof cardElement === 'string'
    ? screen.getByTestId(cardElement) || screen.getByText(cardElement)
    : cardElement;

  // 驗證正面內容
  expectedFrontContent.forEach(content => {
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  // 點擊卡片翻轉
  await userEvent.click(card);

  // 等待翻轉動畫完成（約 700ms）
  await waitFor(
    () => {
      // 驗證背面內容
      expectedBackContent.forEach(content => {
        expect(screen.getByText(content)).toBeInTheDocument();
      });
    },
    { timeout: 1000 },
  );

  // 再次點擊翻轉回正面
  await userEvent.click(card);

  await waitFor(
    () => {
      expectedFrontContent.forEach(content => {
        expect(screen.getByText(content)).toBeInTheDocument();
      });
    },
    { timeout: 1000 },
  );
};

/**
 * 測試卡片顯示內容
 */
export const testCardContent = (
  expectedContent: (string | RegExp)[],
) => {
  expectedContent.forEach(content => {
    expect(screen.getByText(content)).toBeInTheDocument();
  });
};

