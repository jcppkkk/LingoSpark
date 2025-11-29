#!/usr/bin/env node

/**
 * ARCHITECTURE.md 增強版同步檢查工具
 * 
 * 檢查程式碼變更是否已反映在 ARCHITECTURE.md 中
 * 包含 PRD/UX/UI 層面的變更檢測
 * 
 * 使用方法：
 *   node scripts/check-architecture-enhanced.js
 *   或
 *   npm run check-architecture:enhanced
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHITECTURE_FILE = path.join(__dirname, '..', 'ARCHITECTURE.md');
const COMPONENTS_DIR = path.join(__dirname, '..', 'components');
const SERVICES_DIR = path.join(__dirname, '..', 'services');
const TYPES_FILE = path.join(__dirname, '..', 'types.ts');
const APP_FILE = path.join(__dirname, '..', 'App.tsx');
const CONSTANTS_FILE = path.join(__dirname, '..', 'constants.ts');

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

// 檢查 AppView enum 變更
function checkAppViewChanges(architectureContent) {
  if (!fs.existsSync(TYPES_FILE)) return [];
  
  const typesContent = fs.readFileSync(TYPES_FILE, 'utf-8');
  const appViewMatches = typesContent.match(/enum\s+AppView\s*\{([^}]+)\}/s);
  
  if (!appViewMatches) return [];
  
  const enumValues = appViewMatches[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .map(line => {
      const match = line.match(/(\w+)\s*=/);
      return match ? match[1] : null;
    })
    .filter(Boolean);
  
  // 檢查 ARCHITECTURE.md 中是否提到所有 AppView 值
  const missingViews = [];
  for (const view of enumValues) {
    // 檢查是否在路由區段或應用程式流程中提到
    const viewPattern = new RegExp(`\\b${view}\\b`, 'i');
    if (!viewPattern.test(architectureContent)) {
      missingViews.push(view);
    }
  }
  
  return missingViews;
}

// 檢查 Interface/Type 變更
function checkInterfaceChanges(architectureContent) {
  if (!fs.existsSync(TYPES_FILE)) return [];
  
  const typesContent = fs.readFileSync(TYPES_FILE, 'utf-8');
  const interfaceRegex = /export\s+(?:interface|type)\s+(\w+)/g;
  const interfaces = [];
  let match;
  
  while ((match = interfaceRegex.exec(typesContent)) !== null) {
    interfaces.push(match[1]);
  }
  
  // 檢查是否在資料模型區段中提到
  const missingInterfaces = [];
  for (const iface of interfaces) {
    // 跳過一些內部使用的 interface
    if (['DashboardProps', 'WordLibraryProps', 'ErrorTestProps'].includes(iface)) {
      continue;
    }
    
    const ifacePattern = new RegExp(`\\b${iface}\\b`, 'i');
    if (!ifacePattern.test(architectureContent)) {
      missingInterfaces.push(iface);
    }
  }
  
  return missingInterfaces;
}

// 檢查組件中的主要 UI 元素（按鈕、表單等）
function checkUIElements(filePath, architectureContent) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath) || !filePath.includes('components/')) return [];
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const issues = [];
  
  // 檢測主要 UI 元素
  const buttonCount = (content.match(/<button/g) || []).length;
  const inputCount = (content.match(/<input/g) || []).length;
  
  // 檢查是否有導航相關的 onClick
  // 檢查是否有表單提交
  
  // 檢查是否有檔案上傳
  const hasFileUpload = /type=["']file["']|input.*file/i.test(content);
  
  // 簡單檢查：如果組件有這些元素但文檔中沒有提到，可能需要更新
  // 這是一個啟發式檢查，不是絕對準確的
  const componentName = path.basename(filePath, path.extname(filePath));
  const componentSection = architectureContent.match(
    new RegExp(`### [^#]*${componentName}[^#]*`, 'i')
  );
  
  if (componentSection) {
    const sectionContent = componentSection[0];
    
    // 檢查 UI 元素描述
    if (buttonCount > 0 && !/按鈕|button/i.test(sectionContent)) {
      issues.push(`可能缺少按鈕描述（檢測到 ${buttonCount} 個按鈕）`);
    }
    
    if (inputCount > 0 && !/輸入|input|表單/i.test(sectionContent)) {
      issues.push(`可能缺少輸入欄位描述（檢測到 ${inputCount} 個輸入）`);
    }
    
    if (hasFileUpload && !/上傳|upload|圖片|image/i.test(sectionContent)) {
      issues.push('可能缺少檔案上傳功能描述');
    }
  }
  
  return issues;
}

// 檢查路由配置
function checkRoutingChanges(architectureContent) {
  if (!fs.existsSync(APP_FILE)) return [];
  
  const appContent = fs.readFileSync(APP_FILE, 'utf-8');
  const issues = [];
  
  // 檢查是否有新的 case 在 switch 中
  const switchMatches = appContent.match(/switch\s*\([^)]+\)\s*\{([^}]+)\}/s);
  if (switchMatches) {
    const cases = switchMatches[1].match(/case\s+AppView\.(\w+)/g) || [];
    const viewNames = cases.map(c => c.match(/AppView\.(\w+)/)[1]);
    
    // 檢查是否所有視圖都在文檔中
    for (const view of viewNames) {
      const viewPattern = new RegExp(`\\b${view}\\b`, 'i');
      if (!viewPattern.test(architectureContent)) {
        issues.push(`路由視圖 "${view}" 可能未在文檔中記錄`);
      }
    }
  }
  
  return issues;
}

// 檢查常數變更（可能影響功能）
function checkConstantsChanges(architectureContent) {
  if (!fs.existsSync(CONSTANTS_FILE)) return [];
  
  const constantsContent = fs.readFileSync(CONSTANTS_FILE, 'utf-8');
  const issues = [];
  
  // 檢查功能開關
  const featureFlags = constantsContent.match(/export\s+const\s+(\w+)\s*=/g) || [];
  const flagNames = featureFlags.map(f => f.match(/const\s+(\w+)/)[1]);
  
  // 檢查是否在文檔中提到重要的常數
  for (const flag of flagNames) {
    if (flag.includes('ENABLE') || flag.includes('FEATURE')) {
      const flagPattern = new RegExp(`\\b${flag}\\b`, 'i');
      if (!flagPattern.test(architectureContent)) {
        issues.push(`功能開關 "${flag}" 可能未在文檔中記錄`);
      }
    }
  }
  
  return issues;
}

// 主檢查函數
function checkArchitectureSync() {
  console.log('🔍 檢查 ARCHITECTURE.md 同步狀態（增強版）...\n');
  
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
      if (func === 'default') continue;
      const functionPattern = new RegExp(`\\b${func}\\b`, 'i');
      const filePattern = new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const sections = architectureContent.split(/\n##\s+/);
      let isDocumented = false;
      for (const section of sections) {
        if (filePattern.test(section) && functionPattern.test(section)) {
          isDocumented = true;
          break;
        }
      }
      if (!isDocumented) {
        missingFunctions.push({ file, function: func });
      }
    }
  }
  
  // 新增檢查：AppView 變更
  const missingViews = checkAppViewChanges(architectureContent);
  
  // 新增檢查：Interface 變更
  const missingInterfaces = checkInterfaceChanges(architectureContent);
  
  // 新增檢查：路由變更
  const routingIssues = checkRoutingChanges(architectureContent);
  
  // 新增檢查：常數變更
  const constantsIssues = checkConstantsChanges(architectureContent);
  
  // 新增檢查：UI 元素（僅對主要組件）
  const uiIssues = [];
  const mainComponents = ['Dashboard', 'WordLibrary', 'LearningMode', 'FlashcardComponent'];
  for (const comp of mainComponents) {
    const compFile = `components/${comp}.tsx`;
    if (actualFiles.has(compFile)) {
      const issues = checkUIElements(compFile, architectureContent);
      if (issues.length > 0) {
        uiIssues.push({ file: compFile, issues });
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
  
  if (missingViews.length > 0) {
    hasIssues = true;
    console.log('⚠️  發現未記錄的路由視圖：');
    missingViews.forEach(v => {
      console.log(`   - AppView.${v}`);
    });
    console.log('   💡 請檢查「路由與視圖」和「應用程式流程」區段\n');
  }
  
  if (missingInterfaces.length > 0) {
    hasIssues = true;
    console.log('⚠️  發現未記錄的資料模型：');
    missingInterfaces.forEach(i => {
      console.log(`   - ${i}`);
    });
    console.log('   💡 請檢查「資料模型」區段\n');
  }
  
  if (routingIssues.length > 0) {
    hasIssues = true;
    console.log('⚠️  路由配置檢查：');
    routingIssues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
    console.log('');
  }
  
  if (constantsIssues.length > 0) {
    hasIssues = true;
    console.log('⚠️  功能開關檢查：');
    constantsIssues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
    console.log('');
  }
  
  if (uiIssues.length > 0) {
    hasIssues = true;
    console.log('⚠️  UI 元素檢查（啟發式）：');
    uiIssues.forEach(({ file, issues: fileIssues }) => {
      console.log(`   ${file}:`);
      fileIssues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    });
    console.log('   💡 這是啟發式檢查，請手動確認 UI 元素描述是否完整\n');
  }
  
  if (!hasIssues) {
    console.log('✅ ARCHITECTURE.md 看起來是同步的！');
    console.log(`   已記錄 ${documentedFiles.size} 個檔案`);
    console.log('   ✅ 路由視圖檢查通過');
    console.log('   ✅ 資料模型檢查通過');
    console.log('   ✅ 路由配置檢查通過');
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

