#!/usr/bin/env node

/**
 * 過濾測試報告，移除冗長的 HTML 內容
 * 只保留關鍵的錯誤訊息和測試結果摘要
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORT_FILE = path.join(__dirname, '..', 'test-report.txt');

function filterReport(content) {
  const lines = content.split('\n');
  const filtered = [];
  let inHtmlBlock = false;
  let htmlLineCount = 0;
  let lastErrorLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 檢測 HTML 區塊開始標記
    if (trimmed === 'Ignored nodes: comments, script, style' || 
        (trimmed.startsWith('<') && !inHtmlBlock)) {
      inHtmlBlock = true;
      htmlLineCount = 0;
      
      // 保留錯誤訊息（在 HTML 之前的那一行）
      if (lastErrorLine && !lastErrorLine.includes('Ignored nodes')) {
        filtered.push(lastErrorLine);
      }
      
      // 跳過 "Ignored nodes" 這一行
      if (trimmed === 'Ignored nodes: comments, script, style') {
        continue;
      }
      
      // 只保留前幾行 HTML 作為示例
      if (htmlLineCount < 5) {
        filtered.push(line);
        htmlLineCount++;
      } else if (htmlLineCount === 5) {
        filtered.push('  ... (HTML DOM 結構已省略，共省略數百行)');
        filtered.push('  ... (如需查看完整 HTML，請使用: npm run test:run:verbose)');
        htmlLineCount++;
      }
      continue;
    }

    // 在 HTML 區塊中
    if (inHtmlBlock) {
      // 如果遇到非 HTML 行，結束 HTML 區塊
      if (!trimmed.startsWith('<') && trimmed !== '' && !trimmed.startsWith('...')) {
        inHtmlBlock = false;
        htmlLineCount = 0;
        
        // 繼續處理這一行
        filtered.push(line);
      }
      continue;
    }

    // 保存可能是錯誤訊息的行（在 HTML 之前）
    if (trimmed.startsWith('→') || 
        trimmed.startsWith('Error:') ||
        trimmed.startsWith('TestingLibraryElementError:')) {
      lastErrorLine = line;
      filtered.push(line);
      continue;
    }

    // 檢測測試標記，重置狀態
    if (trimmed.startsWith('×') || 
        trimmed.startsWith('✓') || 
        trimmed.startsWith('FAIL') ||
        trimmed.includes('Test Files') || 
        trimmed.includes('Tests') ||
        trimmed.includes('Duration') ||
        trimmed.includes('Start at')) {
      lastErrorLine = '';
      inHtmlBlock = false;
      htmlLineCount = 0;
    }

    // 保留所有非 HTML 內容
    filtered.push(line);
  }

  return filtered.join('\n');
}

function main() {
  if (!fs.existsSync(REPORT_FILE)) {
    console.error(`❌ 找不到測試報告: ${REPORT_FILE}`);
    console.log('💡 請先執行: npm run test:run');
    process.exit(1);
  }

  const content = fs.readFileSync(REPORT_FILE, 'utf-8');
  const filtered = filterReport(content);

  fs.writeFileSync(REPORT_FILE, filtered, 'utf-8');
}

main();

