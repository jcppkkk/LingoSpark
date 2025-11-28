#!/usr/bin/env node

/**
 * ARCHITECTURE 註解驗證工具
 * 
 * 檢查變更的檔案是否需要添加 @ARCH 註解標記
 * 用於 pre-commit hook
 * 
 * 使用方法：
 *   node scripts/arch-annotation-validator.js [--strict]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, '..', '.arch-annotation-config.json');

// 讀取配置
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return {
      enabled: false,
      mode: 'progressive',
      strictMode: false,
      phases: {}
    };
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

// 獲取 Git 變更的檔案
function getChangedFiles() {
  try {
    // 獲取 staged 檔案
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(f => f);
    
    // 獲取 modified 檔案（未 staged）
    const modifiedFiles = execSync('git diff --name-only --diff-filter=ACMR', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(f => f);
    
    return { staged: stagedFiles, modified: modifiedFiles };
  } catch (error) {
    // 如果不在 Git 倉庫中，返回空陣列
    return { staged: [], modified: [] };
  }
}

// 檢查檔案是否需要註解
function needsAnnotation(filePath, config) {
  // 檢查排除規則
  if (config.exclusions) {
    for (const pattern of config.exclusions.patterns || []) {
      if (filePath.match(new RegExp(pattern.replace('*', '.*')))) {
        return false;
      }
    }
    if (config.exclusions.files.includes(filePath)) {
      return false;
    }
  }
  
  // 只檢查 components 和 services
  if (!filePath.startsWith('components/') && !filePath.startsWith('services/')) {
    return false;
  }
  
  // 只檢查 .tsx 和 .ts 檔案
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) {
    return false;
  }
  
  // 檢查當前階段
  const activePhase = Object.values(config.phases || {}).find(p => p.status === 'active');
  if (!activePhase) {
    return false;
  }
  
  // 檢查是否在當前階段的組件列表中
  const componentName = path.basename(filePath, path.extname(filePath));
  if (activePhase.components.includes('*')) {
    return true;
  }
  if (activePhase.components.includes(componentName)) {
    return true;
  }
  
  return false;
}

// 檢查檔案是否有註解
function hasAnnotations(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  // 檢查是否有 @ARCH 註解
  return /@ARCH:/i.test(content);
}

// 檢測變更類型
function detectChangeType(filePath) {
  try {
    // 獲取檔案的 diff
    const diff = execSync(`git diff --cached ${filePath}`, { encoding: 'utf-8' });
    
    const hasUIChange = /<button|<input|<form|<select|onClick|onSubmit/i.test(diff);
    const hasFeatureChange = /export\s+(?:async\s+)?function|export\s+const\s+\w+\s*=\s*(?:async\s+)?\(/i.test(diff);
    const hasUXChange = /useState|useEffect|onNavigate|handle/i.test(diff);
    
    return {
      ui: hasUIChange,
      feat: hasFeatureChange,
      ux: hasUXChange
    };
  } catch (error) {
    // 如果是新檔案，假設所有類型都可能變更
    return { ui: true, feat: true, ux: true };
  }
}

// 主驗證函數
async function validateAnnotations() {
  const config = loadConfig();
  
  if (!config.enabled) {
    console.log('ℹ️  ARCHITECTURE 註解驗證已停用');
    return 0;
  }
  
  const { staged, modified } = getChangedFiles();
  const allFiles = [...new Set([...staged, ...modified])];
  
  if (allFiles.length === 0) {
    return 0;
  }
  
  const activePhase = Object.values(config.phases || {}).find(p => p.status === 'active');
  if (!activePhase) {
    return 0;
  }
  
  const issues = [];
  const warnings = [];
  
  for (const file of allFiles) {
    if (!needsAnnotation(file, config)) {
      continue;
    }
    
    const hasAnnot = hasAnnotations(file);
    const changes = detectChangeType(file);
    const hasRelevantChanges = changes.ui || changes.feat || changes.ux;
    
    if (!hasAnnot && hasRelevantChanges) {
      const changeTypes = [];
      if (changes.ui) changeTypes.push('UI');
      if (changes.feat) changeTypes.push('FEAT');
      if (changes.ux) changeTypes.push('UX');
      
      const message = {
        file,
        changeTypes,
        phase: activePhase.name,
        strictness: activePhase.strictness
      };
      
      if (activePhase.strictness === 'error') {
        issues.push(message);
      } else {
        warnings.push(message);
      }
    }
  }
  
  // 輸出結果
  if (warnings.length > 0) {
    console.log('\n⚠️  ARCHITECTURE 註解提醒：\n');
    for (const { file, changeTypes } of warnings) {
      console.log(`   ${file}`);
      console.log(`   檢測到變更類型: ${changeTypes.join(', ')}`);
      console.log(`   建議添加 @ARCH 註解標記\n`);
    }
    console.log('💡 提示：添加註解可以幫助追蹤 PRD/UX/UI 變更');
    console.log('   參考：docs/annotations/examples.md\n');
  }
  
  if (issues.length > 0) {
    console.log('\n❌ ARCHITECTURE 註解檢查失敗：\n');
    for (const { file, changeTypes } of issues) {
      console.log(`   ${file}`);
      console.log(`   檢測到變更類型: ${changeTypes.join(', ')}`);
      console.log(`   必須添加 @ARCH 註解標記\n`);
    }
    console.log('💡 提示：請添加註解後再提交');
    console.log('   參考：docs/annotations/examples.md\n');
    return 1;
  }
  
  // 檢查註解格式錯誤（START/END 不匹配）
  // 在 error 模式下，檢查所有需要註解的檔案
  if (activePhase.strictness === 'error') {
    try {
      // 獲取所有需要檢查的檔案（不僅是變更的檔案）
      const componentsDir = path.join(__dirname, '..', 'components');
      const servicesDir = path.join(__dirname, '..', 'services');
      const filesToCheck = [];
      
      // 如果 phase3 是 active 且 components 是 "*"，檢查所有檔案
      if (activePhase.components.includes('*')) {
        if (fs.existsSync(componentsDir)) {
          const componentFiles = fs.readdirSync(componentsDir)
            .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
            .map(f => `components/${f}`);
          filesToCheck.push(...componentFiles);
        }
        if (fs.existsSync(servicesDir)) {
          const serviceFiles = fs.readdirSync(servicesDir)
            .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
            .map(f => `services/${f}`);
          filesToCheck.push(...serviceFiles);
        }
      } else {
        // 只檢查變更的檔案
        filesToCheck.push(...allFiles);
      }
      
      // 檢查所有檔案的格式錯誤
      for (const file of filesToCheck) {
        if (!needsAnnotation(file, config)) {
          continue;
        }
        
        // 讀取檔案內容檢查格式錯誤
        const fullPath = path.join(__dirname, '..', file);
        if (!fs.existsSync(fullPath)) {
          continue;
        }
        
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        const startBlocks = new Map();
        const formatErrors = [];
        
        // 檢查所有註解標記
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const startMatch = line.match(/\/\/\s*@ARCH:START\s+(.+)/) || 
                           line.match(/\{\/\*\s*@ARCH:START\s+(.+?)\s*\*\/\}/);
          const endMatch = line.match(/\/\/\s*@ARCH:END\s+(.+)/) || 
                          line.match(/\{\/\*\s*@ARCH:END\s+(.+?)\s*\*\/\}/);
          
          if (startMatch) {
            const key = startMatch[1].trim();
            startBlocks.set(key, i + 1);
          } else if (endMatch) {
            const key = endMatch[1].trim();
            if (!startBlocks.has(key)) {
              formatErrors.push({
                file,
                line: i + 1,
                message: `找不到對應的 START 標記: ${line.trim()}`
              });
            } else {
              startBlocks.delete(key);
            }
          }
        }
        
        // 如果有格式錯誤，在 error 模式下視為錯誤
        if (formatErrors.length > 0) {
          for (const error of formatErrors) {
            issues.push({
              file: error.file,
              changeTypes: ['格式錯誤'],
              phase: activePhase.name,
              strictness: activePhase.strictness,
              message: error.message,
              line: error.line
            });
          }
        }
      }
    } catch (error) {
      // 忽略 import 錯誤，但不影響其他檢查
      console.warn('⚠️  無法檢查註解格式:', error.message);
    }
  } else if (warnings.length === 0 && issues.length === 0) {
    // 在 warning 模式下，只給提示
    try {
      const { scanAnnotations } = await import('./arch-annotation-scanner.js');
      const scanResults = scanAnnotations();
      
      // 簡單檢查：如果有註解，建議執行 hash 檢查
      if (scanResults.length > 0) {
        console.log('💡 提示：建議執行 `npm run arch:check` 檢查 hash 同步狀態\n');
      }
    } catch (error) {
      // 忽略 import 錯誤
    }
  }
  
  // 如果有新的格式錯誤，重新輸出
  if (issues.length > 0) {
    const formatErrors = issues.filter(i => i.changeTypes && i.changeTypes.includes('格式錯誤'));
    if (formatErrors.length > 0) {
      console.log('\n❌ ARCHITECTURE 註解格式錯誤：\n');
      for (const { file, message, line } of formatErrors) {
        console.log(`   ${file}:${line || ''}`);
        console.log(`   ${message}\n`);
      }
      console.log('💡 提示：請修復註解格式錯誤（確保每個 @ARCH:END 都有對應的 @ARCH:START）');
      console.log('   參考：docs/annotations/examples.md\n');
    }
  }
  
  return issues.length > 0 ? 1 : 0;
}

// 執行驗證（使用 async wrapper）
async function main() {
  const exitCode = await validateAnnotations();
  process.exit(exitCode);
}

main().catch(error => {
  console.error('❌ 驗證過程發生錯誤:', error);
  process.exit(1);
});

