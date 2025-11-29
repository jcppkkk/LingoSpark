#!/usr/bin/env node

/**
 * ARCHITECTURE 註解掃描工具
 * 
 * 掃描程式碼中的 @ARCH 註解並提取資訊
 * 
 * 使用方法：
 *   node scripts/arch-annotation-scanner.js [file]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 計算字串的 SHA-256 hash
function calculateHash(content) {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex').substring(0, 32);
}

// 解析註解標記
function parseArchAnnotation(line) {
  // 格式: // @ARCH: <模組> - <類型>: <功能> [選項]
  // 或: // @ARCH:START <模組> - <類型>: <功能>
  // 或: // @ARCH:END <模組> - <類型>: <功能>
  // 也支援 JSX 註解: {/* @ARCH: ... */}
  
  // 檢查 JSX 註解格式
  const jsxStartMatch = line.match(/\{\/\*\s*@ARCH:START\s+(.+?)\s*\*\/\}/);
  const jsxEndMatch = line.match(/\{\/\*\s*@ARCH:END\s+(.+?)\s*\*\/\}/);
  const jsxSingleMatch = line.match(/\{\/\*\s*@ARCH:\s*(.+?)\s*\*\/\}/);
  
  // 檢查標準註解格式
  const startMatch = line.match(/\/\/\s*@ARCH:START\s+(.+)/);
  const endMatch = line.match(/\/\/\s*@ARCH:END\s+(.+)/);
  const singleMatch = line.match(/\/\/\s*@ARCH:\s*(.+)/);
  
  if (jsxStartMatch || startMatch) {
    return { type: 'START', content: (jsxStartMatch?.[1] || startMatch[1]).trim() };
  } else if (jsxEndMatch || endMatch) {
    return { type: 'END', content: (jsxEndMatch?.[1] || endMatch[1]).trim() };
  } else if (jsxSingleMatch || singleMatch) {
    return { type: 'SINGLE', content: (jsxSingleMatch?.[1] || singleMatch[1]).trim() };
  }
  
  return null;
}

// 解析註解內容
function parseAnnotationContent(content) {
  // 格式: <模組> - <類型>: <功能>
  // 或簡化格式: <模組>.<類型>.<功能>
  
  const match1 = content.match(/^(.+?)\s*-\s*(FEAT|UX|UI):\s*(.+)$/);
  const match2 = content.match(/^(.+?)\.(FEAT|UX|UI)\.(.+)$/);
  
  if (match1) {
    return {
      module: match1[1].trim(),
      type: match1[2],
      feature: match1[3].trim()
    };
  } else if (match2) {
    return {
      module: match2[1].trim(),
      type: match2[2],
      feature: match2[3].trim()
    };
  }
  
  // 如果格式不符合，嘗試簡單解析
  const parts = content.split(/[-:]/);
  if (parts.length >= 3) {
    return {
      module: parts[0].trim(),
      type: parts[1].trim(),
      feature: parts.slice(2).join(':').trim()
    };
  }
  
  return null;
}

// 掃描檔案中的註解
function scanFileAnnotations(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const annotations = [];
  
  let currentBlock = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const annotation = parseArchAnnotation(line);
    
    if (!annotation) continue;
    
    const parsed = parseAnnotationContent(annotation.content);
    if (!parsed) {
      console.warn(`⚠️  無法解析註解: ${line.trim()}`);
      continue;
    }
    
    if (annotation.type === 'START') {
      currentBlock = {
        module: parsed.module,
        type: parsed.type,
        feature: parsed.feature,
        startLine: i + 1,
        endLine: null,
        file: filePath
      };
    } else if (annotation.type === 'END') {
      if (currentBlock && 
          currentBlock.module === parsed.module &&
          currentBlock.type === parsed.type &&
          currentBlock.feature === parsed.feature) {
        currentBlock.endLine = i + 1;
        
        // 計算區段 hash
        const sectionCode = lines.slice(currentBlock.startLine - 1, currentBlock.endLine).join('\n');
        currentBlock.hash = calculateHash(sectionCode);
        
        annotations.push(currentBlock);
        currentBlock = null;
      } else {
        console.warn(`⚠️  找不到對應的 START 標記: ${line.trim()}`);
      }
    } else if (annotation.type === 'SINGLE') {
      // 單行註解，嘗試找到對應的程式碼區塊
      // 預設為下一行到空行或下一個註解
      let endLine = i + 2; // 至少包含下一行
      for (let j = i + 2; j < lines.length; j++) {
        if (lines[j].trim() === '' || parseArchAnnotation(lines[j])) {
          endLine = j;
          break;
        }
      }
      
      const sectionCode = lines.slice(i, endLine).join('\n');
      const hash = calculateHash(sectionCode);
      
      annotations.push({
        module: parsed.module,
        type: parsed.type,
        feature: parsed.feature,
        startLine: i + 1,
        endLine: endLine,
        file: filePath,
        hash: hash
      });
    }
  }
  
  // 計算檔案 hash
  const fileHash = calculateHash(content);
  
  return { annotations, fileHash };
}

// 主函數
function scanAnnotations(targetFile = null) {
  const componentsDir = path.join(__dirname, '..', 'components');
  const servicesDir = path.join(__dirname, '..', 'services');
  
  const results = [];
  
  if (targetFile) {
    // 掃描單一檔案
    const result = scanFileAnnotations(targetFile);
    if (result.annotations.length > 0) {
      results.push({
        file: targetFile,
        ...result
      });
    }
  } else {
    // 掃描所有檔案
    const scanDirectory = (dir, basePath = '') => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath, path.join(basePath, file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const relativePath = path.join(basePath, file);
          const result = scanFileAnnotations(relativePath);
          if (result.annotations.length > 0) {
            results.push({
              file: relativePath,
              ...result
            });
          }
        }
      }
    };
    
    scanDirectory(componentsDir, 'components');
    scanDirectory(servicesDir, 'services');
  }
  
  return results;
}

// 輸出結果
function formatResults(results) {
  console.log('📋 掃描結果：\n');
  
  if (results.length === 0) {
    console.log('ℹ️  未找到任何 @ARCH 註解標記');
    return;
  }
  
  for (const { file, annotations, fileHash } of results) {
    console.log(`📄 ${file}`);
    console.log(`   檔案 Hash: ${fileHash}`);
    console.log(`   找到 ${annotations.length} 個標記：\n`);
    
    for (const ann of annotations) {
      console.log(`   [${ann.type}] ${ann.module} - ${ann.feature}`);
      console.log(`      位置: ${ann.file}:${ann.startLine}-${ann.endLine}`);
      console.log(`      Hash: ${ann.hash}\n`);
    }
  }
}

// 執行
const targetFile = process.argv[2] || null;
const results = scanAnnotations(targetFile);
formatResults(results);

export { scanAnnotations, calculateHash, parseArchAnnotation };

