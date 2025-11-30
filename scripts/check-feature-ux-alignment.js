#!/usr/bin/env node

/**
 * Feature -> UX 合理性檢查工具
 * 
 * 檢查 UX 路徑是否涵蓋所有功能，以及 UX 設計是否符合 feature 的一般性期望
 * 
 * 使用方法：
 *   node scripts/check-feature-ux-alignment.js
 *   或
 *   npm run tdd:check-feature-ux
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEATURES_DIR = path.join(__dirname, '..', 'docs', 'features');

// 解析功能介紹
function parseFeatureIntroduction(content) {
  // 提取功能介紹部分（通常在 ## 功能介紹 標題下）
  const introMatch = content.match(/## 功能介紹\s*\n\n(.+?)(?=\n##|\n###|$)/s);
  if (!introMatch) {
    return null;
  }

  const introText = introMatch[1].trim();
  
  // 提取關鍵功能點（通常在「關鍵功能」或「主要功能」區段）
  const keyFeaturesMatch = content.match(/## 關鍵功能\s*\n\n((?:- .+?\n)+)/s) || 
                          content.match(/## 主要功能\s*\n\n((?:- .+?\n)+)/s);
  const keyFeatures = keyFeaturesMatch ? 
    keyFeaturesMatch[1].split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim()) : [];

  return {
    introduction: introText,
    keyFeatures
  };
}

// 提取所有 UX 路徑
function extractUXPaths(content) {
  const uxPaths = [];
  const regex = /### (UX\d{4}):\s*(.+?)\n\n\*\*觸發條件\*\*：(.+?)\n\n\*\*操作步驟\*\*：\n((?:\d+\.\s*.+?\n)+)\n\*\*預期結果\*\*：\n((?:-\s*.+?\n)+)/gs;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const [, number, name, trigger, steps, expectedResults] = match;
    uxPaths.push({
      number,
      name: name.trim(),
      trigger: trigger.trim(),
      steps: steps.trim().split('\n').filter(line => line.trim()).map(line => line.replace(/^\d+\.\s*/, '').trim()),
      expectedResults: expectedResults.trim().split('\n').filter(line => line.trim()).map(line => line.replace(/^-\s*/, '').trim())
    });
  }

  return uxPaths;
}

// 分析功能介紹中的關鍵詞
function extractKeywords(text) {
  // 提取動詞和名詞組合（簡化版）
  const verbs = ['管理', '搜尋', '篩選', '排序', '查看', '編輯', '刪除', '新增', '輸入', '上傳', '識別', '分析', '預覽', '儲存', '生成', '播放', '切換', '選擇', '導航'];
  const keywords = [];
  
  for (const verb of verbs) {
    if (text.includes(verb)) {
      keywords.push(verb);
    }
  }

  return keywords;
}

// 檢查 UX 路徑是否涵蓋關鍵功能
function checkFeatureCoverage(feature, uxPaths) {
  const issues = [];
  
  // 提取功能介紹中的關鍵詞
  const featureKeywords = extractKeywords(feature.introduction);
  
  // 檢查每個關鍵功能是否有對應的 UX 路徑
  for (const keyFeature of feature.keyFeatures) {
    const featureKeywordsInKey = extractKeywords(keyFeature);
    const hasMatchingUX = uxPaths.some(ux => {
      const uxKeywords = extractKeywords(ux.name + ' ' + ux.trigger);
      return featureKeywordsInKey.some(k => uxKeywords.includes(k));
    });

    if (!hasMatchingUX) {
      issues.push({
        type: 'missing_ux',
        feature: keyFeature,
        message: `關鍵功能「${keyFeature}」沒有對應的 UX 路徑`
      });
    }
  }

  return issues;
}

// 檢查 UX 設計是否符合一般性期望
function checkUXExpectations(feature, uxPaths) {
  const issues = [];
  
  // 檢查常見的 UX 最佳實踐
  const commonExpectations = [
    {
      name: '錯誤處理',
      check: (ux) => {
        // 檢查是否有錯誤處理的預期結果
        return ux.expectedResults.some(r => 
          r.includes('錯誤') || r.includes('失敗') || r.includes('重試')
        );
      },
      message: 'UX 路徑應該包含錯誤處理的預期結果'
    },
    {
      name: '即時反饋',
      check: (ux) => {
        // 檢查是否有即時反饋（狀態顯示、載入狀態等）
        return ux.expectedResults.some(r => 
          r.includes('狀態') || r.includes('顯示') || r.includes('更新')
        );
      },
      message: 'UX 路徑應該包含即時反饋的預期結果'
    },
    {
      name: '操作確認',
      check: (ux) => {
        // 檢查重要操作是否有確認步驟
        const importantActions = ['刪除', '清除', '重置'];
        const hasImportantAction = ux.steps.some(s => 
          importantActions.some(action => s.includes(action))
        );
        if (hasImportantAction) {
          return ux.steps.some(s => s.includes('確認') || s.includes('對話框'));
        }
        return true; // 不重要操作不需要確認
      },
      message: '重要操作（如刪除）應該包含確認步驟'
    }
  ];

  for (const ux of uxPaths) {
    for (const expectation of commonExpectations) {
      if (!expectation.check(ux)) {
        issues.push({
          type: 'expectation',
          ux: ux.number,
          name: ux.name,
          expectation: expectation.name,
          message: `${ux.number}: ${expectation.message}`
        });
      }
    }
  }

  return issues;
}

// 主檢查函數
function checkFeatureUXAlignment() {
  console.log('🔍 檢查 Feature -> UX 合理性...\n');

  const featureFiles = fs.readdirSync(FEATURES_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md');

  if (featureFiles.length === 0) {
    console.log('⚠️  未找到任何功能文件');
    return { success: false, exitCode: 1 };
  }

  const results = {
    total: featureFiles.length,
    aligned: [],
    misaligned: []
  };

  // 檢查每個功能文件
  for (const file of featureFiles) {
    const filePath = path.join(FEATURES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const feature = parseFeatureIntroduction(content);
    if (!feature) {
      console.log(`⚠️  無法解析功能介紹: ${file}`);
      continue;
    }

    const uxPaths = extractUXPaths(content);
    
    if (uxPaths.length === 0) {
      console.log(`⚠️  未找到 UX 路徑: ${file}`);
      continue;
    }

    // 檢查功能覆蓋
    const coverageIssues = checkFeatureCoverage(feature, uxPaths);
    
    // 檢查 UX 期望
    const expectationIssues = checkUXExpectations(feature, uxPaths);
    
    const allIssues = [...coverageIssues, ...expectationIssues];
    
    if (allIssues.length === 0) {
      results.aligned.push({
        file,
        uxCount: uxPaths.length
      });
    } else {
      results.misaligned.push({
        file,
        uxCount: uxPaths.length,
        issues: allIssues
      });
    }
  }

  // 輸出結果
  console.log('📊 檢查結果：\n');
  console.log(`✅ 完全符合: ${results.aligned.length}`);
  console.log(`⚠️  需要調整: ${results.misaligned.length}\n`);

  // 顯示需要調整的項目
  if (results.misaligned.length > 0) {
    console.log('⚠️  需要調整的功能：\n');
    for (const item of results.misaligned) {
      console.log(`  📄 ${item.file} (${item.uxCount} 個 UX 路徑)`);
      
      const coverageIssues = item.issues.filter(i => i.type === 'missing_ux');
      const expectationIssues = item.issues.filter(i => i.type === 'expectation');
      
      if (coverageIssues.length > 0) {
        console.log('    ❌ 功能覆蓋問題：');
        for (const issue of coverageIssues) {
          console.log(`      - ${issue.message}`);
        }
      }
      
      if (expectationIssues.length > 0) {
        console.log('    ⚠️  UX 期望問題：');
        for (const issue of expectationIssues) {
          console.log(`      - ${issue.message}`);
        }
      }
      
      console.log('');
    }
  }

  // 顯示完全符合的項目（可選）
  if (results.aligned.length > 0 && process.argv.includes('--verbose')) {
    console.log('✅ 完全符合的功能：\n');
    for (const item of results.aligned) {
      console.log(`  📄 ${item.file} (${item.uxCount} 個 UX 路徑)`);
    }
    console.log('');
  }

  // 返回結果
  const success = results.misaligned.length === 0;
  
  if (!success) {
    console.log('💡 提示：使用 --verbose 查看所有符合的功能');
    console.log('💡 提示：確保 UX 路徑涵蓋所有關鍵功能，並符合一般性期望\n');
  }

  return {
    success,
    exitCode: success ? 0 : 1,
    results
  };
}

// 執行檢查
const result = checkFeatureUXAlignment();
process.exit(result.exitCode);

