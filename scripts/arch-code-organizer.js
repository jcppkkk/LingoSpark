#!/usr/bin/env node

/**
 * ARCHITECTURE 程式碼組織工具
 * 
 * 根據 @ARCH 註解將同項目的程式碼組織到同一區段
 * 保持程式碼邏輯順序，但將相關功能分組
 * 
 * 使用方法：
 *   node scripts/arch-code-organizer.js [file] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanAnnotations } from './arch-annotation-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 組織策略：在檔案中添加區段標題，但不移動程式碼
function organizeWithSectionHeaders(filePath, dryRun = false) {
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
  for (const ann of annotations) {
    const key = `${ann.module}-${ann.type}`;
    if (!grouped[key]) {
      grouped[key] = {
        module: ann.module,
        type: ann.type,
        items: [],
        firstLine: ann.startLine
      };
    }
    grouped[key].items.push(ann);
    if (ann.startLine < grouped[key].firstLine) {
      grouped[key].firstLine = ann.startLine;
    }
  }

  // 按第一個出現的行號排序
  const sortedGroups = Object.values(grouped).sort((a, b) => a.firstLine - b.firstLine);

  // 建立新的內容
  const newLines = [];
  const sectionHeadersAdded = new Set();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // 檢查是否需要添加區段標題
    for (const group of sortedGroups) {
      // 如果這是該組的第一個項目的開始，且還沒添加標題
      const isFirstItem = group.items.some(item => item.startLine === lineNum);
      const isFirstInGroup = group.items[0].startLine === lineNum;
      
      if (isFirstInGroup && !sectionHeadersAdded.has(group.firstLine)) {
        // 在該行之前添加區段標題
        newLines.push('');
        newLines.push(`// ========================================`);
        newLines.push(`// ${group.module} - ${group.type} 相關功能`);
        newLines.push(`// ========================================`);
        newLines.push('');
        sectionHeadersAdded.add(group.firstLine);
        break;
      }
    }
    
    newLines.push(line);
  }

  if (dryRun) {
    console.log('\n📋 組織預覽（前 150 行）：\n');
    console.log(newLines.slice(0, 150).join('\n'));
    console.log('\n... (省略其餘內容)');
    console.log(`\n總共 ${newLines.length} 行（原始: ${lines.length} 行）`);
    console.log(`\n將添加 ${sortedGroups.length} 個區段標題`);
  } else {
    // 寫入檔案
    fs.writeFileSync(fullPath, newLines.join('\n'), 'utf-8');
    console.log(`✅ ${filePath} 已組織完成`);
    console.log(`   原始: ${lines.length} 行`);
    console.log(`   組織後: ${newLines.length} 行`);
    console.log(`   添加了 ${sortedGroups.length} 個區段標題`);
    console.log(`   處理了 ${annotations.length} 個註解標記`);
  }
}

// 主函數
const targetFile = process.argv[2];
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

if (!targetFile) {
  console.error('❌ 請指定要組織的檔案');
  console.log('\n使用方法：');
  console.log('  node scripts/arch-code-organizer.js <file> [--dry-run]');
  console.log('\n範例：');
  console.log('  node scripts/arch-code-organizer.js components/WordLibrary.tsx --dry-run');
  process.exit(1);
}

if (dryRun) {
  console.log('🔍 預覽模式：不會修改檔案\n');
}

organizeWithSectionHeaders(targetFile, dryRun);

export { organizeWithSectionHeaders };

