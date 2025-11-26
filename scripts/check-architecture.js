#!/usr/bin/env node

/**
 * ARCHITECTURE.md 同步檢查工具
 * 
 * 檢查程式碼變更是否已反映在 ARCHITECTURE.md 中
 * 
 * 使用方法：
 *   node scripts/check-architecture.js
 *   或
 *   npm run check-architecture
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHITECTURE_FILE = path.join(__dirname, '..', 'ARCHITECTURE.md');
const COMPONENTS_DIR = path.join(__dirname, '..', 'components');
const SERVICES_DIR = path.join(__dirname, '..', 'services');

// 從 ARCHITECTURE.md 提取已記錄的檔案
function extractDocumentedFiles(content) {
  const files = new Set();
  
  // 提取 components/ 路徑
  const componentMatches = content.matchAll(/`components\/[^`]+\.tsx?`/g);
  for (const match of componentMatches) {
    files.add(match[0].replace(/`/g, ''));
  }
  
  // 提取 services/ 路徑
  const serviceMatches = content.matchAll(/`services\/[^`]+\.ts`/g);
  for (const match of serviceMatches) {
    files.add(match[0].replace(/`/g, ''));
  }
  
  return files;
}

// 取得實際存在的檔案
function getActualFiles() {
  const files = new Set();
  
  // 掃描 components 目錄
  if (fs.existsSync(COMPONENTS_DIR)) {
    const components = fs.readdirSync(COMPONENTS_DIR)
      .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
      .map(f => `components/${f}`);
    components.forEach(f => files.add(f));
  }
  
  // 掃描 services 目錄
  if (fs.existsSync(SERVICES_DIR)) {
    const services = fs.readdirSync(SERVICES_DIR)
      .filter(f => f.endsWith('.ts'))
      .map(f => `services/${f}`);
    services.forEach(f => files.add(f));
  }
  
  return files;
}

// 檢查檔案中的 export 函數
function extractExportedFunctions(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) return [];
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const functions = [];
  
  // 匹配 export function 或 export const function
  const functionRegex = /export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const funcName = match[1] || match[2];
    if (funcName) functions.push(funcName);
  }
  
  // 匹配 export default
  if (content.includes('export default')) {
    functions.push('default');
  }
  
  return functions;
}

// 檢查 ARCHITECTURE.md 中是否提到函數
function isFunctionDocumented(architectureContent, filePath, functionName) {
  // 簡單檢查：函數名是否出現在文檔中
  const functionPattern = new RegExp(`\\b${functionName}\\b`, 'i');
  const filePattern = new RegExp(filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  
  // 檢查函數名和檔案路徑是否同時出現在同一區段
  const sections = architectureContent.split(/\n##\s+/);
  for (const section of sections) {
    if (filePattern.test(section) && functionPattern.test(section)) {
      return true;
    }
  }
  
  return false;
}

// 主檢查函數
function checkArchitectureSync() {
  console.log('🔍 檢查 ARCHITECTURE.md 同步狀態...\n');
  
  if (!fs.existsSync(ARCHITECTURE_FILE)) {
    console.error('❌ ARCHITECTURE.md 不存在！');
    process.exit(1);
  }
  
  const architectureContent = fs.readFileSync(ARCHITECTURE_FILE, 'utf-8');
  const documentedFiles = extractDocumentedFiles(architectureContent);
  const actualFiles = getActualFiles();
  
  // 檢查未記錄的檔案
  const undocumentedFiles = [...actualFiles].filter(f => !documentedFiles.has(f));
  
  // 檢查已記錄但可能遺漏的函數
  const missingFunctions = [];
  
  for (const file of actualFiles) {
    const functions = extractExportedFunctions(file);
    for (const func of functions) {
      if (func === 'default') continue; // 跳過 default export
      if (!isFunctionDocumented(architectureContent, file, func)) {
        missingFunctions.push({ file, function: func });
      }
    }
  }
  
  // 輸出結果
  let hasIssues = false;
  
  if (undocumentedFiles.length > 0) {
    hasIssues = true;
    console.log('⚠️  發現未記錄的檔案：');
    undocumentedFiles.forEach(f => {
      console.log(`   - ${f}`);
    });
    console.log('');
  }
  
  if (missingFunctions.length > 0) {
    hasIssues = true;
    console.log('⚠️  發現可能未記錄的函數：');
    missingFunctions.forEach(({ file, function: func }) => {
      console.log(`   - ${file}::${func}()`);
    });
    console.log('');
  }
  
  if (!hasIssues) {
    console.log('✅ ARCHITECTURE.md 看起來是同步的！');
    console.log(`   已記錄 ${documentedFiles.size} 個檔案`);
    return 0;
  }
  
  console.log('💡 提示：請檢查上述項目並更新 ARCHITECTURE.md');
  console.log('   參考：.cursor/rules/architecture-maintenance.mdc\n');
  
  return 1;
}

// 執行檢查
const exitCode = checkArchitectureSync();
process.exit(exitCode);

export { checkArchitectureSync };

