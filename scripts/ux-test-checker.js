#!/usr/bin/env node

/**
 * UX-測試 對應檢查工具
 * 
 * 檢查所有 UX 路徑是否有對應的測試檔案
 * 
 * 使用方法：
 *   node scripts/ux-test-checker.js
 *   或
 *   npm run ux:test:check
 * 
 * 自動生成缺失的測試模板：
 *   node scripts/ux-test-checker.js --fix
 *   或
 *   npm run ux:test:check:fix
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEATURES_DIR = path.join(__dirname, '..', 'docs', 'features');
const TESTS_DIR = path.join(__dirname, '..', 'tests', 'ux');
const MAPPING_FILE = path.join(__dirname, '..', 'docs', 'testing', 'ux-test-mapping.md');

// 提取 UX 路徑編號
function extractUXPaths(featuresDir) {
  const uxPaths = [];
  const featureFiles = fs.readdirSync(featuresDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md');

  for (const file of featureFiles) {
    const filePath = path.join(featuresDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 匹配 UX#### 格式
    const matches = content.match(/UX\d{4}/g);
    if (matches) {
      // 去重並排序
      const uniqueMatches = [...new Set(matches)].sort();
      uxPaths.push(...uniqueMatches);
    }
  }

  return [...new Set(uxPaths)].sort();
}

// 檢查測試檔案是否存在
function checkTestFile(uxNumber) {
  const testFile = path.join(TESTS_DIR, `${uxNumber}.test.tsx`);
  return fs.existsSync(testFile);
}

// 獲取 UX 路徑名稱（從文檔中提取）
function getUXPathName(uxNumber, featuresDir) {
  const featureFiles = fs.readdirSync(featuresDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md');

  for (const file of featureFiles) {
    const filePath = path.join(featuresDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 匹配 ### UX####: 路徑名稱
    const regex = new RegExp(`### ${uxNumber}:\\s*(.+?)\\n`, 's');
    const match = content.match(regex);
    if (match) {
      return match[1].trim();
    }
  }

  return '未知路徑';
}

// 主檢查函數
function checkUXTests(fix = false) {
  // 確保測試目錄存在
  if (!fs.existsSync(TESTS_DIR)) {
    fs.mkdirSync(TESTS_DIR, { recursive: true });
  }

  // 提取所有 UX 路徑
  const uxPaths = extractUXPaths(FEATURES_DIR);
  
  if (uxPaths.length === 0) {
    console.log('⚠️  未找到任何 UX 路徑');
    return { success: false, exitCode: 1 };
  }

  // 檢查每個 UX 路徑
  const results = {
    total: uxPaths.length,
    exists: [],
    missing: [],
  };

  for (const uxNumber of uxPaths) {
    const exists = checkTestFile(uxNumber);
    const name = getUXPathName(uxNumber, FEATURES_DIR);
    
    if (exists) {
      results.exists.push({ number: uxNumber, name });
    } else {
      results.missing.push({ number: uxNumber, name });
    }
  }

  // 輸出結果
  console.log('\n📋 UX-測試 對應檢查結果\n');
  
  // 顯示已存在的測試
  if (results.exists.length > 0) {
    console.log('✅ 已實作的測試：');
    for (const { number, name } of results.exists) {
      console.log(`   ✅ ${number}: ${name}`);
      console.log(`      測試檔案: tests/ux/${number}.test.tsx`);
    }
    console.log('');
  }

  // 顯示缺失的測試
  if (results.missing.length > 0) {
    console.log('❌ 缺失的測試：');
    for (const { number, name } of results.missing) {
      console.log(`   ❌ ${number}: ${name}`);
      console.log(`      測試檔案: tests/ux/${number}.test.tsx (缺失)`);
    }
    console.log('');
  }

  // 統計
  console.log('📊 統計：');
  console.log(`   總計: ${results.total} 個 UX 路徑`);
  console.log(`   已實作: ${results.exists.length} 個`);
  console.log(`   缺失: ${results.missing.length} 個`);
  console.log('');

  // 如果使用 --fix 模式，生成缺失的測試模板
  if (fix && results.missing.length > 0) {
    console.log('🔧 自動生成缺失的測試模板...\n');
    
    for (const { number, name } of results.missing) {
      generateTestTemplate(number, name);
    }
    
    console.log(`✅ 已生成 ${results.missing.length} 個測試模板\n`);
  }

  // 返回結果
  const success = results.missing.length === 0;
  if (!success) {
    console.log('❌ 檢查失敗：存在缺失的測試檔案');
    console.log('💡 提示：執行 npm run ux:test:check:fix 自動生成測試模板\n');
  } else {
    console.log('✅ 所有 UX 路徑都有對應的測試檔案\n');
  }

  return { success, exitCode: success ? 0 : 1 };
}

// 生成測試模板
function generateTestTemplate(uxNumber, uxName) {
  const testFile = path.join(TESTS_DIR, `${uxNumber}.test.tsx`);
  
  // 如果檔案已存在，跳過
  if (fs.existsSync(testFile)) {
    return;
  }

  const template = `import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '../utils/test-helpers';

describe('${uxNumber}: ${uxName}', () => {
  it('應該符合觸發條件', async () => {
    // TODO: 實作測試
    // 觸發條件：[從 docs/features/ 文檔中提取]
    // 操作步驟：[從 docs/features/ 文檔中提取]
    // 預期結果：[從 docs/features/ 文檔中提取]
    
    // 範例：
    // const { container } = renderWithProviders(<Component />);
    // expect(screen.getByText('預期文字')).toBeInTheDocument();
  });
});
`;

  fs.writeFileSync(testFile, template, 'utf-8');
  console.log(`   ✅ 已生成: ${testFile}`);
}

// 主函數
function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');

  try {
    const result = checkUXTests(fix);
    process.exit(result.exitCode);
  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error.message);
    process.exit(1);
  }
}

main();

