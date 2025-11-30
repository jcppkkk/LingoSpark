#!/usr/bin/env node

/**
 * UX 定義與測試對應檢查工具
 * 
 * 檢查測試是否完全符合 UX 定義的預期結果
 * 
 * 使用方法：
 *   node scripts/check-ux-test-alignment.js
 *   或
 *   npm run tdd:check-ux-test
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEATURES_DIR = path.join(__dirname, '..', 'docs', 'features');
const TESTS_DIR = path.join(__dirname, '..', 'tests', 'ux');

// 解析 UX 定義
function parseUXDefinition(content, uxNumber) {
  const regex = new RegExp(`### ${uxNumber}:\\s*(.+?)\\n\\n\\*\\*觸發條件\\*\\*：(.+?)\\n\\n\\*\\*操作步驟\\*\\*：\\n((?:\\d+\\.\\s*.+?\\n)+)\\n\\*\\*預期結果\\*\\*：\\n((?:-\\s*.+?\\n)+)`, 's');
  const match = content.match(regex);
  
  if (!match) {
    return null;
  }

  const [, name, trigger, steps, expectedResults] = match;
  
  return {
    name: name.trim(),
    trigger: trigger.trim(),
    steps: steps.trim().split('\n').filter(line => line.trim()).map(line => line.replace(/^\d+\.\s*/, '').trim()),
    expectedResults: expectedResults.trim().split('\n').filter(line => line.trim()).map(line => line.replace(/^-\s*/, '').trim())
  };
}

// 提取所有 UX 定義
function extractUXDefinitions(featuresDir) {
  const definitions = new Map();
  const featureFiles = fs.readdirSync(featuresDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md');

  for (const file of featureFiles) {
    const filePath = path.join(featuresDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 匹配所有 UX####
    const uxMatches = content.match(/UX\d{4}/g);
    if (uxMatches) {
      const uniqueUX = [...new Set(uxMatches)];
      for (const uxNumber of uniqueUX) {
        const definition = parseUXDefinition(content, uxNumber);
        if (definition) {
          definitions.set(uxNumber, definition);
        }
      }
    }
  }

  return definitions;
}

// 解析測試文件
function parseTestFile(testPath) {
  if (!fs.existsSync(testPath)) {
    return null;
  }

  const content = fs.readFileSync(testPath, 'utf-8');
  const lines = content.split('\n');
  
  let trigger = null;
  const steps = [];
  const expectedResults = [];
  
  let inStepsSection = false;
  let inExpectedSection = false;
  
  // 逐行解析
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // 提取觸發條件
    if (trimmed.match(/觸發條件[：:]/)) {
      const match = trimmed.match(/觸發條件[：:]\s*(.+)/);
      if (match) {
        trigger = match[1].trim();
      }
      continue;
    }
    
    // 檢測操作步驟區段開始
    if (trimmed.match(/操作步驟[：:]/)) {
      inStepsSection = true;
      inExpectedSection = false;
      continue;
    }
    
    // 檢測預期結果區段開始
    if (trimmed.match(/預期結果[：:]/)) {
      inStepsSection = false;
      inExpectedSection = true;
      continue;
    }
    
    // 如果在操作步驟區段，提取步驟
    if (inStepsSection && trimmed.startsWith('//')) {
      const stepMatch = trimmed.match(/\/\/\s*\d+\.\s*(.+)/);
      if (stepMatch) {
        steps.push(stepMatch[1].trim());
      }
      // 如果遇到非註釋行或空註釋行，可能結束步驟區段
      if (trimmed === '//' || (trimmed.startsWith('//') && !/\d+\./.test(trimmed) && !trimmed.match(/\/\/\s*$/))) {
        // 檢查下一行是否開始預期結果
        if (i + 1 < lines.length && lines[i + 1].trim().match(/預期結果[：:]/)) {
          inStepsSection = false;
        }
      }
      continue;
    }
    
    // 如果在預期結果區段，提取預期結果
    if (inExpectedSection && trimmed.startsWith('//')) {
      const expectedMatch = trimmed.match(/\/\/\s*-\s*(.+)/);
      if (expectedMatch) {
        expectedResults.push(expectedMatch[1].trim());
      }
      // 如果遇到非註釋行，結束預期結果區段
      if (!trimmed.startsWith('//') && trimmed !== '') {
        inExpectedSection = false;
      }
      continue;
    }
    
    // 如果遇到非註釋行且不在任何區段，重置狀態
    if (!trimmed.startsWith('//') && trimmed !== '') {
      if (inStepsSection || inExpectedSection) {
        inStepsSection = false;
        inExpectedSection = false;
      }
    }
  }

  return {
    trigger,
    steps,
    expectedResults
  };
}

// 檢查測試是否符合 UX 定義
function checkAlignment(uxDefinition, testContent) {
  const issues = [];
  
  // 檢查觸發條件
  if (!testContent.trigger) {
    issues.push({
      type: 'missing',
      field: '觸發條件',
      message: '測試描述中缺少觸發條件說明'
    });
  } else if (!testContent.trigger.includes(uxDefinition.trigger)) {
    issues.push({
      type: 'mismatch',
      field: '觸發條件',
      message: `測試觸發條件與 UX 定義不一致\n  UX 定義: ${uxDefinition.trigger}\n  測試描述: ${testContent.trigger}`
    });
  }

  // 檢查操作步驟
  if (testContent.steps.length === 0) {
    issues.push({
      type: 'missing',
      field: '操作步驟',
      message: '測試描述中缺少操作步驟說明'
    });
  } else {
    // 檢查步驟數量是否一致
    if (testContent.steps.length < uxDefinition.steps.length) {
      issues.push({
        type: 'incomplete',
        field: '操作步驟',
        message: `測試步驟數量少於 UX 定義\n  UX 定義: ${uxDefinition.steps.length} 個步驟\n  測試描述: ${testContent.steps.length} 個步驟`
      });
    }
  }

  // 檢查預期結果
  if (testContent.expectedResults.length === 0) {
    issues.push({
      type: 'missing',
      field: '預期結果',
      message: '測試描述中缺少預期結果說明'
    });
  } else {
    // 檢查每個預期結果是否在測試中
    const missingResults = [];
    for (const expectedResult of uxDefinition.expectedResults) {
      const found = testContent.expectedResults.some(tr => 
        tr.includes(expectedResult) || expectedResult.includes(tr)
      );
      if (!found) {
        missingResults.push(expectedResult);
      }
    }
    
    if (missingResults.length > 0) {
      issues.push({
        type: 'incomplete',
        field: '預期結果',
        message: `測試描述中缺少以下預期結果:\n${missingResults.map(r => `  - ${r}`).join('\n')}`
      });
    }
  }

  return issues;
}

// 主檢查函數
function checkUXTestAlignment() {
  console.log('🔍 檢查 UX 定義與測試對應關係...\n');

  // 提取所有 UX 定義
  const uxDefinitions = extractUXDefinitions(FEATURES_DIR);
  
  if (uxDefinitions.size === 0) {
    console.log('⚠️  未找到任何 UX 定義');
    return { success: false, exitCode: 1 };
  }

  console.log(`📋 找到 ${uxDefinitions.size} 個 UX 定義\n`);

  const results = {
    total: uxDefinitions.size,
    aligned: [],
    misaligned: [],
    missing: []
  };

  // 檢查每個 UX 定義
  for (const [uxNumber, definition] of uxDefinitions) {
    const testPath = path.join(TESTS_DIR, `${uxNumber}.test.tsx`);
    
    if (!fs.existsSync(testPath)) {
      results.missing.push({
        uxNumber,
        name: definition.name,
        reason: '測試文件不存在'
      });
      continue;
    }

    const testContent = parseTestFile(testPath);
    if (!testContent) {
      results.missing.push({
        uxNumber,
        name: definition.name,
        reason: '無法解析測試文件'
      });
      continue;
    }

    const issues = checkAlignment(definition, testContent);
    
    if (issues.length === 0) {
      results.aligned.push({
        uxNumber,
        name: definition.name
      });
    } else {
      results.misaligned.push({
        uxNumber,
        name: definition.name,
        issues
      });
    }
  }

  // 輸出結果
  console.log('📊 檢查結果：\n');
  console.log(`✅ 完全符合: ${results.aligned.length}`);
  console.log(`⚠️  需要調整: ${results.misaligned.length}`);
  console.log(`❌ 缺少測試: ${results.missing.length}\n`);

  // 顯示需要調整的項目
  if (results.misaligned.length > 0) {
    console.log('⚠️  需要調整的測試：\n');
    for (const item of results.misaligned) {
      console.log(`  ${item.uxNumber}: ${item.name}`);
      for (const issue of item.issues) {
        console.log(`    [${issue.field}] ${issue.message}`);
      }
      console.log('');
    }
  }

  // 顯示缺少的測試
  if (results.missing.length > 0) {
    console.log('❌ 缺少測試文件：\n');
    for (const item of results.missing) {
      console.log(`  ${item.uxNumber}: ${item.name} - ${item.reason}`);
    }
    console.log('');
  }

  // 顯示完全符合的項目（可選）
  if (results.aligned.length > 0 && process.argv.includes('--verbose')) {
    console.log('✅ 完全符合的測試：\n');
    for (const item of results.aligned) {
      console.log(`  ${item.uxNumber}: ${item.name}`);
    }
    console.log('');
  }

  // 返回結果
  const success = results.misaligned.length === 0 && results.missing.length === 0;
  
  if (!success) {
    console.log('💡 提示：使用 --verbose 查看所有符合的測試');
    console.log('💡 提示：確保測試描述包含完整的觸發條件、操作步驟和預期結果\n');
  }

  return {
    success,
    exitCode: success ? 0 : 1,
    results
  };
}

// 執行檢查
const result = checkUXTestAlignment();
process.exit(result.exitCode);

