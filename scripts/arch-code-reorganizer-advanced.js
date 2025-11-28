#!/usr/bin/env node

/**
 * ARCHITECTURE 程式碼進階重組工具
 * 
 * 將同項目的程式碼真正移動到一起，按類型分組
 * 保持依賴關係和執行順序
 * 
 * 使用方法：
 *   node scripts/arch-code-reorganizer-advanced.js [file] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanAnnotations } from './arch-annotation-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 進階重組：真正移動程式碼
function reorganizeAdvanced(filePath, dryRun = false) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ 檔案不存在: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  
  // 掃描所有註解
  const scanResults = scanAnnotations(filePath);
  if (scanResults.length === 0 || scanResults[0].annotations.length === 0) {
    console.log(`ℹ️  ${filePath} 中沒有找到 @ARCH 註解`);
    return;
  }

  const annotations = scanResults[0].annotations;
  
  // 按模組和類型分組
  const grouped = {};
  const typeOrder = { 'UI': 1, 'FEAT': 2, 'UX': 3 };
  
  for (const ann of annotations) {
    const key = `${ann.module}-${ann.type}`;
    if (!grouped[key]) {
      grouped[key] = {
        module: ann.module,
        type: ann.type,
        items: [],
        order: typeOrder[ann.type] || 999
      };
    }
    grouped[key].items.push(ann);
  }

  // 按類型順序排序
  const sortedGroups = Object.values(grouped).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    // 如果類型相同，按第一個項目的行號排序
    const aFirst = Math.min(...a.items.map(i => i.startLine));
    const bFirst = Math.min(...b.items.map(i => i.startLine));
    return aFirst - bFirst;
  });

  // 提取所有標記的程式碼區塊
  const codeBlocks = new Map();
  const processedLines = new Set();
  
  for (const ann of annotations) {
    const blockLines = lines.slice(ann.startLine - 1, ann.endLine);
    codeBlocks.set(`${ann.startLine}-${ann.endLine}`, {
      annotation: ann,
      lines: blockLines,
      originalStart: ann.startLine,
      originalEnd: ann.endLine
    });
    
    // 標記已處理的行（包括註解行）
    for (let i = Math.max(0, ann.startLine - 2); i < ann.endLine; i++) {
      processedLines.add(i);
    }
  }

  // 建立重組後的內容
  const reorganized = [];
  
  // 1. 找到 component 定義開始位置
  let componentStart = -1;
  let returnStart = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 找到 component 定義
    if (componentStart === -1 && line.match(/^const\s+\w+.*React\.FC|^const\s+\w+.*=.*\(/)) {
      componentStart = i;
    }
    // 找到 return 語句
    if (returnStart === -1 && line.match(/^\s+return\s*\(/)) {
      returnStart = i;
      break;
    }
  }
  
  // 如果找不到，使用第一個 @ARCH 註解的位置
  if (componentStart === -1) {
    componentStart = annotations[0]?.startLine ? annotations[0].startLine - 10 : 0;
  }
  if (returnStart === -1) {
    returnStart = lines.length;
  }

  // 2. 保留檔案開頭（imports, interfaces, constants, component 定義開始）
  reorganized.push(...lines.slice(0, componentStart));
  
  // 3. 添加 component 定義開始（state 定義等）
  reorganized.push(...lines.slice(componentStart, returnStart));
  reorganized.push('');

  // 4. 分離 FEAT/UX（在 return 之前）和 UI（在 return 內）
  const featUxGroups = [];
  const uiGroups = [];
  
  for (const group of sortedGroups) {
    // 檢查該組的第一個項目是否在 return 語句內
    const firstItem = group.items[0];
    const isInReturn = firstItem.startLine > returnStart;
    
    if (isInReturn) {
      uiGroups.push(group);
    } else {
      featUxGroups.push(group);
    }
  }

  // 5. 添加 FEAT/UX 功能（在 return 之前）
  for (const group of featUxGroups) {
    // 添加區段標題
    reorganized.push('// ========================================');
    reorganized.push(`// ${group.module} - ${group.type} 相關功能`);
    reorganized.push('// ========================================');
    reorganized.push('');

    // 按原始行號排序該組的項目
    const sortedItems = group.items.sort((a, b) => a.startLine - b.startLine);

    for (const item of sortedItems) {
      const key = `${item.startLine}-${item.endLine}`;
      const block = codeBlocks.get(key);
      if (block) {
        reorganized.push(...block.lines);
        reorganized.push(''); // 添加空行分隔
      }
    }
    
    reorganized.push(''); // 組之間的空行
  }

  // 6. 添加未標記的程式碼（在 return 之前）
  const unmarkedBeforeReturn = [];
  for (let i = returnStart - 1; i >= componentStart; i--) {
    if (!processedLines.has(i) && !lines[i].match(/^\s*return\s*\(/)) {
      unmarkedBeforeReturn.unshift(lines[i]);
    } else {
      break;
    }
  }
  
  if (unmarkedBeforeReturn.length > 0) {
    reorganized.push('// ========================================');
    reorganized.push('// 其他程式碼（未標記）');
    reorganized.push('// ========================================');
    reorganized.push('');
    reorganized.push(...unmarkedBeforeReturn);
    reorganized.push('');
  }

  // 7. 添加 return 語句開始
  reorganized.push(...lines.slice(returnStart, returnStart + 1));
  reorganized.push('');

  // 8. 添加 UI 功能（在 return 內，保持原有順序）
  for (const group of uiGroups) {
    // 添加區段標題（在 return 內）
    reorganized.push('      {/* ======================================== */}');
    reorganized.push(`      {/* ${group.module} - ${group.type} 相關功能 */}`);
    reorganized.push('      {/* ======================================== */}');
    reorganized.push('');

    // 按原始行號排序該組的項目
    const sortedItems = group.items.sort((a, b) => a.startLine - b.startLine);

    for (const item of sortedItems) {
      const key = `${item.startLine}-${item.endLine}`;
      const block = codeBlocks.get(key);
      if (block) {
        reorganized.push(...block.lines);
        reorganized.push(''); // 添加空行分隔
      }
    }
    
    reorganized.push(''); // 組之間的空行
  }

  // 9. 添加未標記的程式碼（在 return 內）
  const unmarkedInReturn = [];
  for (let i = returnStart + 1; i < lines.length; i++) {
    if (!processedLines.has(i)) {
      unmarkedInReturn.push(lines[i]);
    }
  }

  if (unmarkedInReturn.length > 0) {
    reorganized.push('      {/* ======================================== */}');
    reorganized.push('      {/* 其他程式碼（未標記） */}');
    reorganized.push('      {/* ======================================== */}');
    reorganized.push('');
    reorganized.push(...unmarkedInReturn);
  }

  if (dryRun) {
    console.log('\n📋 重組預覽（前 200 行）：\n');
    console.log(reorganized.slice(0, 200).join('\n'));
    console.log('\n... (省略其餘內容)');
    console.log(`\n總共 ${reorganized.length} 行（原始: ${lines.length} 行）`);
    console.log(`\n⚠️  注意：此重組會移動程式碼位置，請確認：`);
    console.log(`   1. 沒有破壞依賴關係`);
    console.log(`   2. 執行順序仍然正確`);
    console.log(`   3. 需要更新 ARCHITECTURE.md 中的 hash`);
  } else {
    // 寫入檔案
    fs.writeFileSync(fullPath, reorganized.join('\n'), 'utf-8');
    console.log(`✅ ${filePath} 已重組完成`);
    console.log(`   原始: ${lines.length} 行`);
    console.log(`   重組後: ${reorganized.length} 行`);
    console.log(`   處理了 ${annotations.length} 個註解標記`);
    console.log(`   組織成 ${sortedGroups.length} 個功能組`);
    console.log(`\n⚠️  重要：請檢查以下項目：`);
    console.log(`   1. 程式碼仍能正常執行`);
    console.log(`   2. 沒有破壞依賴關係`);
    console.log(`   3. 執行 'npm run arch:scan' 重新掃描註解`);
    console.log(`   4. 更新 ARCHITECTURE.md 中的 hash（位置已變更）`);
  }
}

// 主函數
const targetFile = process.argv[2];
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

if (!targetFile) {
  console.error('❌ 請指定要重組的檔案');
  console.log('\n使用方法：');
  console.log('  node scripts/arch-code-reorganizer-advanced.js <file> [--dry-run]');
  console.log('\n⚠️  警告：此工具會移動程式碼位置，建議先使用 --dry-run 預覽');
  process.exit(1);
}

if (dryRun) {
  console.log('🔍 預覽模式：不會修改檔案\n');
} else {
  console.log('⚠️  警告：此操作會移動程式碼位置！');
  console.log('   建議先使用 --dry-run 預覽\n');
}

reorganizeAdvanced(targetFile, dryRun);

export { reorganizeAdvanced };

