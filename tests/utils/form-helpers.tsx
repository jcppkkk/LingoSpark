import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * 測試表單輸入和驗證
 * 
 * @param inputLabel - 輸入框標籤或 placeholder
 * @param inputValue - 要輸入的值
 * @param options - 選項
 */
export const testFormInput = async (
  inputLabel: string | RegExp,
  inputValue: string,
  options?: {
    submitOnEnter?: boolean;
    validateAfterInput?: (value: string) => void;
  },
) => {
  const { submitOnEnter = false, validateAfterInput } = options || {};

  // 查找輸入框
  const input = screen.getByLabelText(inputLabel) || 
                screen.getByPlaceholderText(inputLabel) ||
                screen.getByRole('textbox', { name: inputLabel });

  // 輸入值
  await userEvent.clear(input);
  await userEvent.type(input, inputValue);

  // 驗證輸入值
  expect(input).toHaveValue(inputValue);

  // 執行自訂驗證
  if (validateAfterInput) {
    validateAfterInput(inputValue);
  }

  // 如果需要按 Enter 提交
  if (submitOnEnter) {
    await userEvent.keyboard('{Enter}');
  }

  return input;
};

/**
 * 測試表單提交
 */
export const testFormSubmit = async (
  submitButtonText: string | RegExp,
) => {
  const submitButton = screen.getByRole('button', { name: submitButtonText });
  await userEvent.click(submitButton);
};

/**
 * 測試表單驗證錯誤
 */
export const testFormValidation = async (
  inputLabel: string | RegExp,
  invalidValue: string,
  expectedError: string | RegExp,
) => {
  const input = screen.getByLabelText(inputLabel) || 
                screen.getByPlaceholderText(inputLabel);

  await userEvent.clear(input);
  await userEvent.type(input, invalidValue);
  await userEvent.tab(); // 觸發 blur 事件

  // 等待錯誤訊息顯示
  await waitFor(() => {
    expect(screen.getByText(expectedError)).toBeInTheDocument();
  });
};

