#!/usr/bin/env node

/**
 * 文檔更新助手
 * 
 * 分析變更的檔案，提示需要更新哪些文檔，並生成文檔模板
 * 
 * 使用方法：
 *   node scripts/doc-update-helper.js [檔案路徑...]
 *   或
 *   npm run doc:update [檔案路徑...]
 * 
 * 範例：
 *   npm run doc:update components/NewFeature.tsx
 *   npm run doc-update-helper.js services/newService.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHITECTURE_FILE = path.join(__dirname, '..', 'ARCHITECTURE.md');
const FEATURES_README = path.join(__dirname, '..', 'docs', 'features', 'README.md');
const FEATURES_DIR = path.join(__dirname, '..', 'docs', 'features');

// 組件名稱到功能檔案的映射
const COMPONENT_TO_FEATURE_FILE = {
  'Dashboard': 'dashboard.md',
  'WordLibrary': 'word-library.md',
  'LearningMode': 'learning-mode.md',
  'LearningModeTab': 'learning-mode.md',
  'BlockModeTab': 'learning-mode.md',
  'DictationModeTab': 'learning-mode.md',
  'FlashcardComponent': 'flashcard.md',
};

// 根據組件名稱獲取對應的功能檔案
function getFeatureFile(componentName) {
  if (!componentName) return null;
  
  // 直接匹配
  if (COMPONENT_TO_FEATURE_FILE[componentName]) {
    return path.join(FEATURES_DIR, COMPONENT_TO_FEATURE_FILE[componentName]);
  }
  
  // 嘗試模糊匹配（例如 DashboardTab -> Dashboard）
  for (const [key, value] of Object.entries(COMPONENT_TO_FEATURE_FILE)) {
    if (componentName.includes(key) || key.includes(componentName)) {
      return path.join(FEATURES_DIR, value);
    }
  }
  
  return null;
}

// 分析檔案類型
function analyzeFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ 檔案不存在: ${filePath}`);
    return null;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const isComponent = filePath.startsWith('components/') && filePath.endsWith('.tsx');
  const isService = filePath.startsWith('services/') && filePath.endsWith('.ts');
  const isType = filePath === 'types.ts';

  // 提取組件名稱
  let componentName = null;
  if (isComponent) {
    const defaultExportMatch = content.match(/export\s+default\s+function\s+(\w+)|export\s+default\s+const\s+(\w+)|export\s+default\s+(\w+)/);
    if (defaultExportMatch) {
      componentName = defaultExportMatch[1] || defaultExportMatch[2] || defaultExportMatch[3];
    } else {
      // 從檔案名推斷
      componentName = path.basename(filePath, '.tsx');
    }
  }

  // 提取服務函數
  const exportedFunctions = [];
  if (isService) {
    const functionRegex = /export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2];
      if (funcName) exportedFunctions.push(funcName);
    }
  }

  // 檢查是否有 @ARCH 註解
  const hasArchAnnotations = /@ARCH/.test(content);

  // 檢查是否定義了新的型別
  const newTypes = [];
  if (isType) {
    const interfaceRegex = /export\s+interface\s+(\w+)/g;
    const typeRegex = /export\s+type\s+(\w+)/g;
    const enumRegex = /export\s+enum\s+(\w+)/g;
    
    let match;
    while ((match = interfaceRegex.exec(content)) !== null) {
      newTypes.push({ name: match[1], type: 'interface' });
    }
    while ((match = typeRegex.exec(content)) !== null) {
      newTypes.push({ name: match[1], type: 'type' });
    }
    while ((match = enumRegex.exec(content)) !== null) {
      newTypes.push({ name: match[1], type: 'enum' });
    }
  }

  return {
    filePath,
    isComponent,
    isService,
    isType,
    componentName,
    exportedFunctions,
    hasArchAnnotations,
    newTypes,
  };
}

// 檢查文檔中是否已記錄
function isDocumented(filePath, componentName, functions, types) {
  let architectureContent = '';
  let featuresContent = '';

  if (fs.existsSync(ARCHITECTURE_FILE)) {
    architectureContent = fs.readFileSync(ARCHITECTURE_FILE, 'utf-8');
  }
  // 讀取所有功能檔案內容
  if (fs.existsSync(FEATURES_README)) {
    featuresContent = fs.readFileSync(FEATURES_README, 'utf-8');
    
    // 讀取所有功能檔案
    const featureFiles = ['dashboard.md', 'word-library.md', 'learning-mode.md', 'flashcard.md'];
    for (const featureFile of featureFiles) {
      const featurePath = path.join(FEATURES_DIR, featureFile);
      if (fs.existsSync(featurePath)) {
        featuresContent += '\n' + fs.readFileSync(featurePath, 'utf-8');
      }
    }
  }

  const allContent = architectureContent + '\n' + featuresContent;
  const filePattern = new RegExp(filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  const isFileDocumented = filePattern.test(allContent);
  
  const documentedFunctions = [];
  const undocumentedFunctions = [];
  
  if (functions) {
    for (const func of functions) {
      const funcPattern = new RegExp(`\\b${func}\\b`, 'i');
      if (funcPattern.test(allContent)) {
        documentedFunctions.push(func);
      } else {
        undocumentedFunctions.push(func);
      }
    }
  }

  const documentedTypes = [];
  const undocumentedTypes = [];
  
  if (types) {
    for (const type of types) {
      const typePattern = new RegExp(`\\b${type.name}\\b`, 'i');
      if (typePattern.test(allContent)) {
        documentedTypes.push(type);
      } else {
        undocumentedTypes.push(type);
      }
    }
  }

  return {
    isFileDocumented,
    documentedFunctions,
    undocumentedFunctions,
    documentedTypes,
    undocumentedTypes,
  };
}

// 生成文檔模板
function generateTemplate(analysis, docStatus) {
  const templates = [];

  if (analysis.isComponent && !docStatus.isFileDocumented) {
    const featureFile = getFeatureFile(analysis.componentName);
    const componentName = analysis.componentName;
    
    // 如果是新組件，需要同時更新 README.md 和對應的功能檔案
    if (featureFile && fs.existsSync(featureFile)) {
      // 更新現有功能檔案
      const featureTemplate = `## 程式碼位置

- 組件：\`${analysis.filePath}\`

## UI 元素

- [UI] [元素名稱]
  - 位置：\`${analysis.filePath}:行號\`
  - 功能：[功能說明]

## 關鍵功能

- [FEAT] [功能名稱]
  - 位置：\`${analysis.filePath}:行號\`
  - 功能：[功能說明]
`;
      templates.push({
        file: featureFile,
        section: '在對應功能檔案中新增或更新',
        template: featureTemplate,
        note: `此組件屬於現有功能模組，請更新 ${path.basename(featureFile)}`,
      });
    } else {
      // 新功能，需要更新 README.md 並創建新功能檔案
      const readmeTemplate = `### 🆕 ${componentName}

**功能描述**：[請描述此組件的功能]

**程式碼位置**：
- 組件：\`${analysis.filePath}\`

**UI 元素**：
- [UI] [元素名稱]
  - 位置：\`${analysis.filePath}:行號\`
  - 功能：[功能說明]

**關鍵功能**：
- [FEAT] [功能名稱]
  - 位置：\`${analysis.filePath}:行號\`
  - 功能：[功能說明]
`;
      templates.push({
        file: FEATURES_README,
        section: '功能列表',
        template: readmeTemplate,
        note: '同時需要在 docs/features/ 目錄下創建新的功能檔案',
      });
    }
  }

  if (analysis.isService && !docStatus.isFileDocumented) {
    const serviceName = path.basename(analysis.filePath, '.ts').replace(/([A-Z])/g, ' $1').trim();
    const serviceTemplate = `### ${serviceName} (Service Name)

**檔案**：\`${analysis.filePath}\`

**功能**：
${analysis.exportedFunctions.map(f => `- \`${f}()\` - [功能描述]`).join('\n')}
`;
    templates.push({
      file: ARCHITECTURE_FILE,
      section: '服務層架構',
      template: serviceTemplate,
    });
  }

  if (analysis.newTypes && analysis.newTypes.length > 0) {
    const typesTemplate = analysis.newTypes
      .filter(t => !docStatus.documentedTypes.some(dt => dt.name === t.name))
      .map(type => {
        return `### ${type.name}

\`\`\`typescript
// 請從 types.ts 複製型別定義
\`\`\`
`;
      }).join('\n');
    
    if (typesTemplate) {
      templates.push({
        file: ARCHITECTURE_FILE,
        section: '資料模型',
        template: typesTemplate,
      });
    }
  }

  return templates;
}

// 主函數
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('📝 文檔更新助手\n');
    console.log('使用方法：');
    console.log('  npm run doc:update <檔案路徑...>');
    console.log('  或');
    console.log('  node scripts/doc-update-helper.js <檔案路徑...>\n');
    console.log('範例：');
    console.log('  npm run doc:update components/NewFeature.tsx');
    console.log('  npm run doc:update services/newService.ts types.ts\n');
    return;
  }

  console.log('📝 分析檔案並生成文檔更新建議...\n');

  const analyses = [];
  for (const filePath of args) {
    const analysis = analyzeFile(filePath);
    if (analysis) {
      analyses.push(analysis);
    }
  }

  if (analyses.length === 0) {
    console.log('❌ 沒有有效的檔案需要分析');
    return;
  }

  // 分析每個檔案
  for (const analysis of analyses) {
    console.log(`\n📄 分析: ${analysis.filePath}`);
    console.log('─'.repeat(50));

    const docStatus = isDocumented(
      analysis.filePath,
      analysis.componentName,
      analysis.exportedFunctions,
      analysis.newTypes
    );

    // 顯示狀態
    if (docStatus.isFileDocumented) {
      console.log('✅ 檔案已在文檔中記錄');
    } else {
      console.log('⚠️  檔案尚未在文檔中記錄');
    }

    if (analysis.exportedFunctions.length > 0) {
      if (docStatus.undocumentedFunctions.length > 0) {
        console.log(`⚠️  未記錄的函數: ${docStatus.undocumentedFunctions.join(', ')}`);
      }
      if (docStatus.documentedFunctions.length > 0) {
        console.log(`✅ 已記錄的函數: ${docStatus.documentedFunctions.join(', ')}`);
      }
    }

    if (analysis.newTypes && analysis.newTypes.length > 0) {
      if (docStatus.undocumentedTypes.length > 0) {
        const types = docStatus.undocumentedTypes.map(t => t.name).join(', ');
        console.log(`⚠️  未記錄的型別: ${types}`);
      }
      if (docStatus.documentedTypes.length > 0) {
        const types = docStatus.documentedTypes.map(t => t.name).join(', ');
        console.log(`✅ 已記錄的型別: ${types}`);
      }
    }

    if (!analysis.hasArchAnnotations && analysis.isComponent) {
      console.log('💡 建議：添加 @ARCH 註解標記');
    }

    // 生成模板
    const templates = generateTemplate(analysis, docStatus);
    if (templates.length > 0) {
      console.log('\n📋 文檔更新建議：');
      for (const { file, section, template, note } of templates) {
        console.log(`\n需要更新: ${file}`);
        console.log(`區段: ${section}`);
        if (note) {
          console.log(`💡 ${note}`);
        }
        console.log('\n建議內容：');
        console.log('─'.repeat(50));
        console.log(template);
        console.log('─'.repeat(50));
      }
      
      // 如果是組件，提示可能需要更新多個檔案
      if (analysis.isComponent) {
        const featureFile = getFeatureFile(analysis.componentName);
        if (featureFile && fs.existsSync(featureFile)) {
          console.log(`\n💡 提示：此組件屬於現有功能模組，請更新對應的功能檔案：${path.basename(featureFile)}`);
          console.log(`   同時確認 docs/features/README.md 中的功能列表是否已包含此組件`);
        } else {
          console.log(`\n💡 提示：這是新功能組件，需要：`);
          console.log(`   1. 在 docs/features/README.md 的「功能列表」區段新增功能描述`);
          console.log(`   2. 在 docs/features/ 目錄下創建新的功能檔案（例如：${analysis.componentName.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase()}.md）`);
        }
      }
    }
  }

  console.log('\n\n💡 提示：');
  console.log('1. 根據上述建議更新文檔');
  console.log('2. 執行 npm run check-architecture 驗證');
  console.log('3. 參考 .cursor/rules/workflow.mdc 了解完整流程');
}

main();

