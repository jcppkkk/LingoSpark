#!/usr/bin/env node

/**
 * Husky 設定腳本
 * 
 * 設定 husky 和 pre-commit hook
 * 
 * 使用方法：
 *   node scripts/setup-husky.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HUSKY_DIR = path.join(__dirname, '..', '.husky');
const PRE_COMMIT_HOOK = path.join(HUSKY_DIR, 'pre-commit');

// 初始化 husky
function initHusky() {
  try {
    // 確保 .husky 目錄存在
    if (!fs.existsSync(HUSKY_DIR)) {
      fs.mkdirSync(HUSKY_DIR, { recursive: true });
    }
    
    // 初始化 husky
    execSync('npx husky init', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    
    console.log('✅ Husky 初始化完成');
  } catch (error) {
    console.error('❌ Husky 初始化失敗:', error.message);
    process.exit(1);
  }
}

// 建立 pre-commit hook
function createPreCommitHook() {
  const hookContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# ARCHITECTURE 註解驗證
echo "🔍 檢查 ARCHITECTURE 註解..."
npm run arch:validate

# 如果驗證失敗，阻止提交
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ 提交被阻止：請修復 ARCHITECTURE 註解問題"
  echo "💡 提示：使用 --no-verify 可以跳過檢查（不建議）"
  exit 1
fi

# 基礎架構檢查（可選，僅警告）
echo "🔍 檢查 ARCHITECTURE.md 同步狀態..."
npm run check-architecture:enhanced || true
`;

  fs.writeFileSync(PRE_COMMIT_HOOK, hookContent);
  fs.chmodSync(PRE_COMMIT_HOOK, '755');
  
  console.log('✅ Pre-commit hook 已建立');
}

// 主函數
function setup() {
  console.log('🚀 設定 Husky 和 Pre-commit Hook...\n');
  
  initHusky();
  createPreCommitHook();
  
  console.log('\n✅ 設定完成！');
  console.log('\n📋 下一步：');
  console.log('   1. 檢查 .arch-annotation-config.json 配置');
  console.log('   2. 在 Dashboard 組件中添加註解標記（試點）');
  console.log('   3. 測試 pre-commit hook：git commit');
}

setup();

