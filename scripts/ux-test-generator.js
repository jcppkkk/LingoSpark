#!/usr/bin/env node

/**
 * UX 測試模板生成器
 * 
 * 從 docs/features/ 文檔中提取 UX 路徑資訊，生成測試檔案模板
 * 
 * 使用方法：
 *   node scripts/ux-test-generator.js UX0001
 *   或
 *   node scripts/ux-test-generator.js --all
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEATURES_DIR = path.join(__dirname, '..', 'docs', 'features');
const TESTS_DIR = path.join(__dirname, '..', 'tests', 'ux');

// 從文檔中提取 UX 路徑資訊
function extractUXInfo(uxNumber, featuresDir) {
  const featureFiles = fs.readdirSync(featuresDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md');

  for (const file of featureFiles) {
    const filePath = path.join(featuresDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 匹配 ### UX####: 路徑名稱
    const regex = new RegExp(`### ${uxNumber}:\\s*(.+?)\\n\\n\\*\\*觸發條件\\*\\*：([^\\n]+)\\n\\n\\*\\*操作步驟\\*\\*：\\n\\n([\\s\\S]+?)\\n\\n\\*\\*預期結果\\*\\*：\\n\\n([\\s\\S]+?)(?=\\n---|$)`, 's');
    const match = content.match(regex);
    
    if (match) {
      return {
        name: match[1].trim(),
        trigger: match[2].trim(),
        steps: match[3].trim().split('\n').filter(s => s.trim()).map(s => s.replace(/^\d+\.\s*/, '').trim()),
        expected: match[4].trim().split('\n').filter(s => s.trim()).map(s => s.replace(/^-\s*/, '').trim()),
      };
    }
  }

  return null;
}

// 判斷應該使用哪些共用測試元件
function determineHelpers(uxNumber) {
  const helpers = [];
  
  // 導航測試 (UX0002, UX0003, UX0005)
  if (['UX0002', 'UX0003', 'UX0005'].includes(uxNumber)) {
    helpers.push('navigation-helpers');
  }
  
  // 表單輸入測試 (UX0011, UX0027)
  if (['UX0011', 'UX0027'].includes(uxNumber)) {
    helpers.push('form-helpers');
  }
  
  // 按鈕點擊測試 (UX0004, UX0020, UX0023, UX0026)
  if (['UX0004', 'UX0020', 'UX0023', 'UX0026'].includes(uxNumber)) {
    helpers.push('button-helpers');
  }
  
  // 列表操作測試 (UX0006, UX0007, UX0008)
  if (['UX0006', 'UX0007', 'UX0008'].includes(uxNumber)) {
    helpers.push('list-helpers');
  }
  
  // 卡片翻轉測試 (UX0030, UX0021)
  if (['UX0030', 'UX0021'].includes(uxNumber)) {
    helpers.push('card-helpers');
  }
  
  // 答案檢查測試 (UX0025, UX0028)
  if (['UX0025', 'UX0028'].includes(uxNumber)) {
    helpers.push('answer-helpers');
  }
  
  return helpers;
}

// 生成測試模板
function generateTestTemplate(uxNumber, uxInfo) {
  const helpers = determineHelpers(uxNumber);
  
  // 生成 import 語句
  const imports = [
    "import { describe, it, expect } from 'vitest';",
    "import { screen } from '@testing-library/react';",
    "import { renderWithProviders } from '../utils/test-helpers';",
  ];
  
  if (helpers.length > 0) {
    helpers.forEach(helper => {
      const helperName = helper.replace('-helpers', '');
      const importName = helperName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      imports.push(`import { test${importName} } from '../utils/${helper}';`);
    });
  }
  
  // 生成測試內容
  const testContent = `describe('${uxNumber}: ${uxInfo.name}', () => {
  it('應該符合觸發條件和預期結果', async () => {
    // 觸發條件：${uxInfo.trigger}
    // 
    // 操作步驟：
${uxInfo.steps.map((step, i) => `    // ${i + 1}. ${step}`).join('\n')}
    // 
    // 預期結果：
${uxInfo.expected.map(exp => `    // - ${exp}`).join('\n')}
    
    // TODO: 實作測試
    // 範例：
    // const { container } = renderWithProviders(<Component />);
    // expect(screen.getByText('預期文字')).toBeInTheDocument();
  });
});
`;

  return imports.join('\n') + '\n\n' + testContent;
}

// 主函數
function main() {
  const args = process.argv.slice(2);
  
  // 確保測試目錄存在
  if (!fs.existsSync(TESTS_DIR)) {
    fs.mkdirSync(TESTS_DIR, { recursive: true });
  }

  if (args.includes('--all')) {
    // 生成所有 UX 路徑的測試
    const uxNumbers = [];
    const featureFiles = fs.readdirSync(FEATURES_DIR)
      .filter(f => f.endsWith('.md') && f !== 'README.md');

    for (const file of featureFiles) {
      const filePath = path.join(FEATURES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const matches = content.match(/UX\d{4}/g);
      if (matches) {
        uxNumbers.push(...matches);
      }
    }

    const uniqueUXNumbers = [...new Set(uxNumbers)].sort();
    
    for (const uxNumber of uniqueUXNumbers) {
      const uxInfo = extractUXInfo(uxNumber, FEATURES_DIR);
      if (uxInfo) {
        const testFile = path.join(TESTS_DIR, `${uxNumber}.test.tsx`);
        if (!fs.existsSync(testFile)) {
          const template = generateTestTemplate(uxNumber, uxInfo);
          fs.writeFileSync(testFile, template, 'utf-8');
          console.log(`✅ 已生成: ${testFile}`);
        } else {
          console.log(`⏭️  已存在: ${testFile}`);
        }
      }
    }
  } else if (args.length > 0) {
    // 生成指定 UX 路徑的測試
    const uxNumber = args[0];
    const uxInfo = extractUXInfo(uxNumber, FEATURES_DIR);
    
    if (!uxInfo) {
      console.error(`❌ 未找到 UX 路徑: ${uxNumber}`);
      process.exit(1);
    }
    
    const testFile = path.join(TESTS_DIR, `${uxNumber}.test.tsx`);
    
    if (fs.existsSync(testFile)) {
      console.log(`⚠️  測試檔案已存在: ${testFile}`);
      console.log('💡 提示：如需重新生成，請先刪除現有檔案');
      process.exit(1);
    }
    
    const template = generateTestTemplate(uxNumber, uxInfo);
    fs.writeFileSync(testFile, template, 'utf-8');
    console.log(`✅ 已生成: ${testFile}`);
  } else {
    console.error('❌ 請指定 UX 路徑編號或使用 --all 生成所有測試');
    console.log('使用方法：');
    console.log('  node scripts/ux-test-generator.js UX0001');
    console.log('  node scripts/ux-test-generator.js --all');
    process.exit(1);
  }
}

main();

