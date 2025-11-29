#!/usr/bin/env node

/**
 * ARCHITECTURE 程式碼重組工具
 * 
 * 根據 @ARCH 註解將同項目的程式碼重組到同一區段
 * 
 * 使用方法：
 *   node scripts/arch-code-reorganizer.js [file] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanAnnotations } from './arch-annotation-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 重組策略：按模組和類型分組
function reorganizeByArchAnnotations(filePath, dryRun = false) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ 檔案不存在: ${filePath}`);
    return;
  }

  // 掃描所有註解
  const scanResults = scanAnnotations(filePath);
  if (scanResults.length === 0 || scanResults[0].annotations.length === 0) {
    console.log(`ℹ️  ${filePath} 中沒有找到 @ARCH 註解`);
    return;
  }

  const annotations = scanResults[0].annotations;
  
  // 按模組和類型分組
  const grouped = {};
  for (const ann of annotations) {
    const key = `${ann.module}-${ann.type}`;
    if (!grouped[key]) {
      grouped[key] = {
        module: ann.module,
        type: ann.type,
        items: []
      };
    }
    grouped[key].items.push(ann);
  }

  // 讀取原始內容
  const originalContent = fs.readFileSync(fullPath, 'utf-8');
  const originalLines = originalContent.split('\n');

  // 建立重組後的內容
  const reorganized = [];
  const processedLines = new Set();
  
  // 按類型順序處理：UI -> FEAT -> UX
  const typeOrder = { 'UI': 1, 'FEAT': 2, 'UX': 3 };
  const sortedGroups = Object.values(grouped).sort((a, b) => {
    return typeOrder[a.type] - typeOrder[b.type];
  });

  // 添加檔案開頭（imports, interfaces 等）
  let lastProcessedLine = 0;
  
  for (const group of sortedGroups) {
    // 添加區段標題註解
    reorganized.push('');
    reorganized.push(`// ========================================`);
    reorganized.push(`// ${group.module} - ${group.type} 相關功能`);
    reorganized.push(`// ========================================`);
    reorganized.push('');

    // 按行號排序該組的項目
    const sortedItems = group.items.sort((a, b) => a.startLine - b.startLine);

    for (const item of sortedItems) {
      // 添加該項目的程式碼
      const itemLines = originalLines.slice(item.startLine - 1, item.endLine);
      reorganized.push(...itemLines);
      reorganized.push(''); // 添加空行分隔

      // 標記已處理的行
      for (let i = item.startLine - 1; i < item.endLine; i++) {
        processedLines.add(i);
      }
      
      if (item.endLine > lastProcessedLine) {
        lastProcessedLine = item.endLine;
      }
    }
  }

  // 添加未標記的程式碼（在最後）
  const unmarkedLines = [];
  for (let i = 0; i < originalLines.length; i++) {
    if (!processedLines.has(i)) {
      unmarkedLines.push(originalLines[i]);
    }
  }

  if (unmarkedLines.length > 0) {
    reorganized.push('');
    reorganized.push(`// ========================================`);
    reorganized.push(`// 其他程式碼（未標記）`);
    reorganized.push(`// ========================================`);
    reorganized.push('');
    reorganized.push(...unmarkedLines);
  }

  if (dryRun) {
    console.log('\n📋 重組預覽（前 100 行）：\n');
    console.log(reorganized.slice(0, 100).join('\n'));
    console.log('\n... (省略其餘內容)');
    console.log(`\n總共 ${reorganized.length} 行（原始: ${originalLines.length} 行）`);
  } else {
    // 寫入檔案
    fs.writeFileSync(fullPath, reorganized.join('\n'), 'utf-8');
    console.log(`✅ ${filePath} 已重組完成`);
    console.log(`   原始: ${originalLines.length} 行`);
    console.log(`   重組後: ${reorganized.length} 行`);
    console.log(`   處理了 ${annotations.length} 個註解標記`);
  }
}

// 主函數
const targetFile = process.argv[2];
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

if (!targetFile) {
  console.error('❌ 請指定要重組的檔案');
  console.log('\n使用方法：');
  console.log('  node scripts/arch-code-reorganizer.js <file> [--dry-run]');
  console.log('\n範例：');
  console.log('  node scripts/arch-code-reorganizer.js components/WordLibrary.tsx --dry-run');
  process.exit(1);
}

if (dryRun) {
  console.log('🔍 預覽模式：不會修改檔案\n');
}

reorganizeByArchAnnotations(targetFile, dryRun);

export { reorganizeByArchAnnotations };

