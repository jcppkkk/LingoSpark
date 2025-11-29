#!/usr/bin/env node

/**
 * ARCHITECTURE 註解自動生成工具
 * 
 * 使用 AI 自動識別功能區塊並生成註解建議
 * 
 * 使用方法：
 *   node scripts/arch-annotation-generator.js [file] [--interactive]
 *   npm run arch:generate [file] [--interactive]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from "@google/genai";
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 讀取環境變數（支援 .env.local）
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
    return envVars;
  }
  return {};
}

// 初始化 AI
const envVars = loadEnvFile();
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || envVars.GEMINI_API_KEY || envVars.API_KEY;
if (!apiKey) {
  console.error('❌ 錯誤：請設定 Gemini API Key');
  console.error('');
  console.error('方式 1：設定環境變數');
  console.error('  export API_KEY=your_gemini_api_key');
  console.error('  或');
  console.error('  export GEMINI_API_KEY=your_gemini_api_key');
  console.error('');
  console.error('方式 2：在 .env.local 檔案中設定');
  console.error('  GEMINI_API_KEY=your_gemini_api_key');
  console.error('');
  console.error('取得 API Key：');
  console.error('  https://aistudio.google.com/app/apikey');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Schema for annotation suggestions
const annotationSchema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { 
            type: Type.STRING, 
            enum: ["UI", "FEAT", "UX"],
            description: "註解類型：UI（使用者介面）、FEAT（功能特性）、UX（使用者體驗）"
          },
          name: { 
            type: Type.STRING,
            description: "功能名稱（繁體中文）"
          },
          startLine: { 
            type: Type.INTEGER,
            description: "起始行號（1-based）"
          },
          endLine: { 
            type: Type.INTEGER,
            description: "結束行號（1-based）"
          },
          description: {
            type: Type.STRING,
            description: "功能描述（繁體中文）"
          },
          code: {
            type: Type.STRING,
            description: "對應的程式碼片段"
          }
        },
        required: ["type", "name", "startLine", "endLine", "description"]
      }
    }
  },
  required: ["suggestions"]
};

// 讀取檔案內容
function readFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`檔案不存在: ${filePath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

// 分析程式碼結構，識別功能區塊
function analyzeCodeStructure(content, filePath) {
  const lines = content.split('\n');
  const blocks = [];
  
  // 識別組件名稱
  const componentMatch = content.match(/(?:export\s+(?:default\s+)?function|const)\s+(\w+)/);
  const componentName = componentMatch ? componentMatch[1] : path.basename(filePath, path.extname(filePath));
  
  // 簡單的啟發式識別
  let currentBlock = null;
  let inJSX = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // 檢測 JSX 開始
    if (trimmed.includes('<') && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
      inJSX = true;
    }
    
    // 檢測函數定義
    if (trimmed.match(/^(export\s+)?(async\s+)?function\s+\w+|const\s+\w+\s*=\s*(async\s+)?\(|const\s+\w+\s*=\s*(async\s+)?\(/)) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: 'FEAT',
        startLine: i + 1,
        endLine: i + 1,
        code: line
      };
    }
    
    // 檢測 UI 元素（按鈕、表單等）
    if (inJSX && (trimmed.includes('<button') || trimmed.includes('<form') || trimmed.includes('<input'))) {
      if (currentBlock && currentBlock.type !== 'UI') {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: 'UI',
        startLine: i + 1,
        endLine: i + 1,
        code: line
      };
    }
    
    // 檢測狀態管理（UX）
    if (trimmed.match(/useState|useEffect|onNavigate|handle/)) {
      if (currentBlock && currentBlock.type !== 'UX') {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: 'UX',
        startLine: i + 1,
        endLine: i + 1,
        code: line
      };
    }
  }
  
  if (currentBlock) {
    blocks.push(currentBlock);
  }
  
  return { componentName, blocks };
}

// 使用 AI 生成註解建議
async function generateAnnotations(content, filePath, componentName) {
  const prompt = `
你是一個專業的程式碼分析工具。請分析以下 React/TypeScript 程式碼，識別需要添加 @ARCH 註解的功能區塊。

程式碼檔案：${filePath}
組件名稱：${componentName}

程式碼內容：
\`\`\`typescript
${content}
\`\`\`

請識別以下類型的區塊：
1. **UI**：使用者介面元素（按鈕、表單、卡片、列表等）
2. **FEAT**：功能特性（資料載入、API 調用、資料處理邏輯等）
3. **UX**：使用者體驗流程（狀態管理、導航邏輯、互動流程等）

對於每個識別的區塊，請提供：
- 類型（UI/FEAT/UX）
- 功能名稱（繁體中文，簡潔明確）
- 起始行號和結束行號
- 功能描述（繁體中文）
- 對應的程式碼片段

注意：
- 只識別重要的功能區塊，不要為每一行都生成註解
- 功能名稱應該簡潔且具有描述性
- 確保行號準確
- 使用繁體中文

輸出格式請遵循提供的 JSON Schema。
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: annotationSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI 沒有返回回應");
    
    const data = JSON.parse(text);
    return data.suggestions || [];
  } catch (error) {
    console.error('❌ AI 生成註解時發生錯誤:', error);
    throw error;
  }
}

// 檢查是否已有註解
function hasExistingAnnotation(content, startLine, endLine) {
  const lines = content.split('\n');
  const relevantLines = lines.slice(Math.max(0, startLine - 3), endLine);
  return relevantLines.some(line => /@ARCH:/i.test(line));
}

// 插入註解到程式碼
function insertAnnotation(content, suggestion, componentName, useSimplifiedFormat = true) {
  const lines = content.split('\n');
  const insertLine = suggestion.startLine - 1;
  
  // 決定註解格式
  const annotationFormat = useSimplifiedFormat
    ? `// @ARCH: ${componentName}.${suggestion.type}.${suggestion.name}`
    : `// @ARCH: ${componentName} - ${suggestion.type}: ${suggestion.name}`;
  
  // 檢查是否在 JSX 中
  const line = lines[insertLine];
  const isJSX = line && (line.includes('<') || line.includes('{/*'));
  
  if (isJSX && line.trim().startsWith('<')) {
    // JSX 註解格式
    const jsxAnnotation = `{/* @ARCH: ${componentName}.${suggestion.type}.${suggestion.name} */}`;
    lines.splice(insertLine, 0, jsxAnnotation);
  } else {
    // 標準註解格式
    lines.splice(insertLine, 0, annotationFormat);
  }
  
  return lines.join('\n');
}

// 互動模式：詢問用戶是否接受建議
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

// 收集檔案列表（支援檔案、目錄、多檔案）
function collectFiles(inputPaths) {
  const files = [];
  const baseDir = path.join(__dirname, '..');
  
  for (const inputPath of inputPaths) {
    const fullPath = path.join(baseDir, inputPath);
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  路徑不存在: ${inputPath}`);
      continue;
    }
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isFile()) {
      // 單一檔案
      if (inputPath.endsWith('.tsx') || inputPath.endsWith('.ts')) {
        files.push(inputPath);
      } else {
        console.warn(`⚠️  跳過非 TypeScript 檔案: ${inputPath}`);
      }
    } else if (stat.isDirectory()) {
      // 目錄：遞迴掃描
      const scanDirectory = (dir, basePath = '') => {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          const entryStat = fs.statSync(entryPath);
          
          if (entryStat.isDirectory()) {
            scanDirectory(entryPath, path.join(basePath, entry));
          } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
            const relativePath = path.join(basePath, entry);
            files.push(relativePath);
          }
        }
      };
      
      // 計算相對路徑
      const relativePath = path.relative(baseDir, fullPath);
      scanDirectory(fullPath, relativePath);
    }
  }
  
  return [...new Set(files)]; // 去重
}

// 處理單一檔案
async function processFile(filePath, isInteractive, useSimplifiedFormat, rl = null) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📖 處理檔案: ${filePath}`);
    console.log('='.repeat(60));
    
    const content = readFile(filePath);
    
    console.log('🔍 分析程式碼結構...');
    const { componentName, blocks } = analyzeCodeStructure(content, filePath);
    console.log(`   組件名稱: ${componentName}`);
    console.log(`   識別到 ${blocks.length} 個潛在區塊`);
    
    console.log('🤖 使用 AI 生成註解建議...');
    const suggestions = await generateAnnotations(content, filePath, componentName);
    console.log(`   ✅ 生成 ${suggestions.length} 個註解建議`);
    
    if (suggestions.length === 0) {
      console.log('ℹ️  未找到需要添加註解的功能區塊');
      return { accepted: 0, skipped: 0 };
    }
    
    let newContent = content;
    let acceptedCount = 0;
    let skippedCount = 0;
    
    if (isInteractive && rl) {
      for (const suggestion of suggestions) {
        // 檢查是否已有註解
        if (hasExistingAnnotation(content, suggestion.startLine, suggestion.endLine)) {
          console.log(`\n⏭️  跳過 ${suggestion.type} - ${suggestion.name}（已有註解）`);
          skippedCount++;
          continue;
        }
        
        console.log(`\n📋 建議 ${acceptedCount + skippedCount + 1}/${suggestions.length}:`);
        console.log(`   類型: ${suggestion.type}`);
        console.log(`   名稱: ${suggestion.name}`);
        console.log(`   位置: ${filePath}:${suggestion.startLine}-${suggestion.endLine}`);
        console.log(`   描述: ${suggestion.description}`);
        console.log(`\n   程式碼片段:`);
        const codeLines = content.split('\n').slice(suggestion.startLine - 1, suggestion.endLine);
        codeLines.forEach((line, idx) => {
          console.log(`   ${suggestion.startLine + idx}: ${line}`);
        });
        
        const answer = await askQuestion(rl, '\n   是否接受此建議？(y/n/s=跳過/a=全部接受): ');
        
        if (answer === 'a' || answer === 'accept-all') {
          // 接受所有剩餘建議
          for (const remaining of suggestions.slice(acceptedCount + skippedCount)) {
            if (!hasExistingAnnotation(content, remaining.startLine, remaining.endLine)) {
              newContent = insertAnnotation(newContent, remaining, componentName, useSimplifiedFormat);
              acceptedCount++;
            } else {
              skippedCount++;
            }
          }
          break;
        } else if (answer === 'y' || answer === 'yes') {
          newContent = insertAnnotation(newContent, suggestion, componentName, useSimplifiedFormat);
          acceptedCount++;
          console.log('   ✅ 已添加註解');
        } else if (answer === 's' || answer === 'skip') {
          skippedCount++;
          console.log('   ⏭️  已跳過');
        } else {
          skippedCount++;
          console.log('   ❌ 已拒絕');
        }
      }
    } else {
      // 非互動模式：自動添加所有建議
      for (const suggestion of suggestions) {
        if (hasExistingAnnotation(content, suggestion.startLine, suggestion.endLine)) {
          skippedCount++;
          continue;
        }
        
        newContent = insertAnnotation(newContent, suggestion, componentName, useSimplifiedFormat);
        acceptedCount++;
      }
    }
    
    // 寫入檔案
    if (acceptedCount > 0) {
      const fullPath = path.join(__dirname, '..', filePath);
      fs.writeFileSync(fullPath, newContent, 'utf-8');
      console.log(`\n✅ 已添加 ${acceptedCount} 個註解到 ${filePath}`);
    } else {
      console.log(`\nℹ️  未添加任何註解（${skippedCount} 個已跳過）`);
    }
    
    return { accepted: acceptedCount, skipped: skippedCount };
  } catch (error) {
    console.error(`❌ 處理 ${filePath} 時發生錯誤:`, error.message);
    return { accepted: 0, skipped: 0, error: true };
  }
}

// 主函數
async function main() {
  const args = process.argv.slice(2);
  const inputPaths = args.filter(arg => !arg.startsWith('--'));
  const isInteractive = args.includes('--interactive');
  const useSimplifiedFormat = !args.includes('--standard-format');
  
  if (inputPaths.length === 0) {
    console.log('使用方法：');
    console.log('  node scripts/arch-annotation-generator.js <file|dir> [file2] [dir2] ... [--interactive] [--standard-format]');
    console.log('  npm run arch:generate <file|dir> [file2] [dir2] ... [--interactive] [--standard-format]');
    console.log('');
    console.log('參數：');
    console.log('  <file>              單一檔案路徑');
    console.log('  <dir>               目錄路徑（會遞迴掃描所有 .tsx 和 .ts 檔案）');
    console.log('  可以同時指定多個檔案或目錄');
    console.log('');
    console.log('選項：');
    console.log('  --interactive        互動模式，逐個審查建議（支援 a=全部接受）');
    console.log('  --standard-format    使用標準格式（預設使用簡化格式）');
    console.log('');
    console.log('範例：');
    console.log('  npm run arch:generate components/Dashboard.tsx');
    console.log('  npm run arch:generate components/');
    console.log('  npm run arch:generate components/ services/');
    console.log('  npm run arch:generate components/Dashboard.tsx components/WordLibrary.tsx');
    process.exit(1);
  }
  
  // 收集所有檔案
  const files = collectFiles(inputPaths);
  
  if (files.length === 0) {
    console.error('❌ 未找到任何 TypeScript 檔案');
    process.exit(1);
  }
  
  console.log(`\n📋 找到 ${files.length} 個檔案：`);
  files.forEach((file, idx) => {
    console.log(`   ${idx + 1}. ${file}`);
  });
  
  let rl = null;
  if (isInteractive) {
    rl = createReadlineInterface();
  }
  
  let totalAccepted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n[${i + 1}/${files.length}]`);
      
      const result = await processFile(file, isInteractive, useSimplifiedFormat, rl);
      totalAccepted += result.accepted || 0;
      totalSkipped += result.skipped || 0;
      if (result.error) {
        totalErrors++;
      }
    }
    
    // 總結
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 處理完成總結');
    console.log('='.repeat(60));
    console.log(`   處理檔案數: ${files.length}`);
    console.log(`   已添加註解: ${totalAccepted} 個`);
    console.log(`   已跳過: ${totalSkipped} 個`);
    if (totalErrors > 0) {
      console.log(`   ⚠️  錯誤: ${totalErrors} 個檔案`);
    }
    console.log(`\n💡 提示：執行 'npm run arch:scan' 查看所有生成的註解`);
    
  } catch (error) {
    console.error('❌ 發生錯誤:', error.message);
    process.exit(1);
  } finally {
    if (rl) {
      rl.close();
    }
  }
}

main();

