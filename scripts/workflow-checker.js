#!/usr/bin/env node

/**
 * 工作流程檢查工具
 * 
 * 檢查開發流程是否符合規則：
 * 1. 新增功能時是否已更新文檔
 * 2. 是否添加了 @ARCH 註解
 * 3. 文檔是否同步
 * 
 * 使用方法：
 *   node scripts/workflow-checker.js
 *   或
 *   npm run workflow:check
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHITECTURE_FILE = path.join(__dirname, '..', 'ARCHITECTURE.md');
const FEATURES_FILE = path.join(__dirname, '..', 'docs', 'features', 'README.md');

// 獲取 Git 變更的檔案
function getChangedFiles() {
  try {
    // 獲取 staged 檔案
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(f => f && (f.endsWith('.tsx') || f.endsWith('.ts')));
    
    // 獲取 modified 檔案（未 staged）
    const modifiedFiles = execSync('git diff --name-only --diff-filter=ACMR', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(f => f && (f.endsWith('.tsx') || f.endsWith('.ts')));
    
    return { staged: stagedFiles, modified: modifiedFiles };
  } catch (_error) {
    return { staged: [], modified: [] };
  }
}

// 檢查是否為新增檔案
function isNewFile(filePath) {
  try {
    const result = execSync(`git diff --cached --diff-filter=A --name-only`, { encoding: 'utf-8' });
    return result.includes(filePath);
  } catch {
    return false;
  }
}

// 檢查檔案是否有 @ARCH 註解
function hasArchAnnotations(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) return false;
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  return /@ARCH/.test(content);
}

// 檢查檔案是否在文檔中記錄
function isDocumented(filePath) {
  if (!fs.existsSync(ARCHITECTURE_FILE) || !fs.existsSync(FEATURES_FILE)) {
    return false;
  }

  const architectureContent = fs.readFileSync(ARCHITECTURE_FILE, 'utf-8');
  let featuresContent = fs.readFileSync(FEATURES_FILE, 'utf-8');
  
  // 讀取所有功能檔案內容
  const featuresDir = path.join(__dirname, '..', 'docs', 'features');
  const featureFiles = ['dashboard.md', 'word-library.md', 'learning-mode.md', 'flashcard.md', 'error-test.md'];
  for (const featureFile of featureFiles) {
    const featurePath = path.join(featuresDir, featureFile);
    if (fs.existsSync(featurePath)) {
      featuresContent += '\n' + fs.readFileSync(featurePath, 'utf-8');
    }
  }
  
  const allContent = architectureContent + '\n' + featuresContent;

  const filePattern = new RegExp(filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return filePattern.test(allContent);
}

// 分析檔案類型
function analyzeFile(filePath) {
  const isComponent = filePath.startsWith('components/') && filePath.endsWith('.tsx');
  const isService = filePath.startsWith('services/') && filePath.endsWith('.ts');
  const isType = filePath === 'types.ts';
  const isNew = isNewFile(filePath);
  const hasArch = hasArchAnnotations(filePath);
  const documented = isDocumented(filePath);

  return {
    filePath,
    isComponent,
    isService,
    isType,
    isNew,
    hasArch,
    documented,
  };
}

// 工作流程規則檢查
function checkWorkflowRules() {
  console.log('🔍 檢查工作流程規則...\n');

  const { staged, modified } = getChangedFiles();
  const allFiles = [...new Set([...staged, ...modified])];

  if (allFiles.length === 0) {
    console.log('✅ 沒有需要檢查的檔案變更');
    return 0;
  }

  const issues = [];
  const warnings = [];

  for (const filePath of allFiles) {
    const analysis = analyzeFile(filePath);

    // 規則 1: 新增組件必須添加 @ARCH 註解
    if (analysis.isNew && analysis.isComponent && !analysis.hasArch) {
      issues.push({
        file: filePath,
        rule: '新增組件必須添加 @ARCH 註解',
        severity: 'error',
        suggestion: `在 ${filePath} 中添加 @ARCH:START/END 標記`,
      });
    }

    // 規則 2: 新增組件必須在文檔中記錄
    if (analysis.isNew && analysis.isComponent && !analysis.documented) {
      issues.push({
        file: filePath,
        rule: '新增組件必須在對應的功能檔案中記錄（docs/features/*.md）',
        severity: 'error',
        suggestion: `執行: npm run doc:update ${filePath}`,
      });
    }

    // 規則 3: 新增服務必須在文檔中記錄
    if (analysis.isNew && analysis.isService && !analysis.documented) {
      issues.push({
        file: filePath,
        rule: '新增服務必須在 ARCHITECTURE.md 中記錄',
        severity: 'error',
        suggestion: `執行: npm run doc:update ${filePath}`,
      });
    }

    // 規則 4: 修改組件時建議添加 @ARCH 註解（如果是 UI/UX 變更）
    if (!analysis.isNew && analysis.isComponent && !analysis.hasArch) {
      warnings.push({
        file: filePath,
        rule: '修改組件時建議添加 @ARCH 註解（如果是 UI/UX 變更）',
        severity: 'warning',
        suggestion: `如果涉及 UI/UX 變更，請添加 @ARCH 註解`,
      });
    }

    // 規則 5: 修改 types.ts 必須更新資料模型文檔
    if (analysis.isType && !analysis.documented) {
      issues.push({
        file: filePath,
        rule: '修改 types.ts 必須更新 ARCHITECTURE.md 中的資料模型',
        severity: 'error',
        suggestion: `更新 ARCHITECTURE.md 的「資料模型」區段`,
      });
    }
  }

  // 輸出結果
  if (issues.length > 0) {
    console.log('❌ 發現工作流程違規：\n');
    issues.forEach(({ file, rule, suggestion }) => {
      console.log(`   📄 ${file}`);
      console.log(`   ⚠️  ${rule}`);
      console.log(`   💡 ${suggestion}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log('⚠️  建議改進：\n');
    warnings.forEach(({ file, suggestion }) => {
      console.log(`   📄 ${file}`);
      console.log(`   💡 ${suggestion}\n`);
    });
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ 工作流程檢查通過！');
    console.log(`   檢查了 ${allFiles.length} 個檔案`);
    return 0;
  }

  if (issues.length > 0) {
    console.log('\n📋 工作流程規則：');
    console.log('1. 新增組件 → 添加 @ARCH 註解 + 更新對應的功能檔案（docs/features/*.md）');
    console.log('2. 新增服務 → 更新 ARCHITECTURE.md');
    console.log('3. 修改 types.ts → 更新 ARCHITECTURE.md 資料模型');
    console.log('\n參考：.cursor/rules/workflow.mdc');
    return 1;
  }

  return 0;
}

// 執行檢查
const exitCode = checkWorkflowRules();
process.exit(exitCode);

export { checkWorkflowRules };

