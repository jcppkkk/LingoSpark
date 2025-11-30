import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * 測試列表搜尋
 */
export const testListSearch = async (
  searchInputLabel: string | RegExp,
  searchTerm: string,
  expectedResults: string[],
) => {
  // 輸入搜尋關鍵字
  const searchInput = screen.getByLabelText(searchInputLabel) ||
                      screen.getByPlaceholderText(searchInputLabel);
  
  await userEvent.clear(searchInput);
  await userEvent.type(searchInput, searchTerm);

  // 等待搜尋結果更新
  await waitFor(() => {
    expectedResults.forEach(result => {
      expect(screen.getByText(result)).toBeInTheDocument();
    });
  });
};

/**
 * 測試列表篩選
 */
export const testListFilter = async (
  filterButtonText: string | RegExp,
  filterOption: string | RegExp,
  expectedResults: string[],
) => {
  // 點擊篩選按鈕
  const filterButton = screen.getByRole('button', { name: filterButtonText });
  await userEvent.click(filterButton);

  // 選擇篩選選項
  const option = screen.getByRole('option', { name: filterOption });
  await userEvent.click(option);

  // 等待篩選結果更新
  await waitFor(() => {
    expectedResults.forEach(result => {
      expect(screen.getByText(result)).toBeInTheDocument();
    });
  });
};

/**
 * 測試列表排序
 */
export const testListSort = async (
  sortButtonText: string | RegExp,
  sortOption: string | RegExp,
  expectedOrder: string[],
) => {
  // 點擊排序按鈕
  const sortButton = screen.getByRole('button', { name: sortButtonText });
  await userEvent.click(sortButton);

  // 選擇排序選項
  const option = screen.getByRole('option', { name: sortOption });
  await userEvent.click(option);

  // 等待排序結果更新
  await waitFor(() => {
    const items = screen.getAllByRole('listitem');
    expectedOrder.forEach((expectedText, index) => {
      expect(items[index]).toHaveTextContent(expectedText);
    });
  });
};

