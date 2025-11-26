#!/usr/bin/env node

/**
 * ARCHITECTURE Hash 檢查工具
 * 
 * 比對程式碼中的註解標記 hash 與 ARCHITECTURE.md 中記錄的 hash
 * 
 * 使用方法：
 *   node scripts/arch-hash-checker.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanAnnotations, calculateHash } from './arch-annotation-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHITECTURE_FILE = path.join(__dirname, '..', 'ARCHITECTURE.md');

// 從 ARCHITECTURE.md 提取 hash 資訊
function extractHashesFromArchitecture() {
  if (!fs.existsSync(ARCHITECTURE_FILE)) {
    return {};
  }
  
  const content = fs.readFileSync(ARCHITECTURE_FILE, 'utf-8');
  const hashes = {};
  
  // 匹配格式: Hash: `abc123...` 或 | Hash: `abc123...`
  const hashPattern = /Hash:\s*`([a-f0-9]{32})`/g;
  const locationPattern = /`([^`]+):(\d+)-(\d+)`/g;
  
  // 提取所有 hash 和位置資訊
  const sections = content.split(/\n###\s+/);
  
  for (const section of sections) {
    // 提取模組名稱
    const moduleMatch = section.match(/^([^\n]+)/);
    if (!moduleMatch) continue;
    
    const moduleName = moduleMatch[1].replace(/[📊➕📚🎴🧪]/g, '').trim();
    
    // 提取 hash 和位置
    let match;
    const locations = [];
    
    while ((match = locationPattern.exec(section)) !== null) {
      locations.push({
        file: match[1],
        startLine: parseInt(match[2]),
        endLine: parseInt(match[3])
      });
    }
    
    let hashMatch;
    const hashesInSection = [];
    while ((hashMatch = hashPattern.exec(section)) !== null) {
      hashesInSection.push(hashMatch[1]);
    }
    
    // 配對位置和 hash
    for (let i = 0; i < Math.min(locations.length, hashesInSection.length); i++) {
      const key = `${locations[i].file}:${locations[i].startLine}-${locations[i].endLine}`;
      hashes[key] = {
        module: moduleName,
        hash: hashesInSection[i],
        location: locations[i]
      };
    }
  }
  
  return hashes;
}

// 比對 hash
function checkHashes() {
  console.log('🔍 檢查 ARCHITECTURE.md Hash 同步狀態...\n');
  
  // 掃描程式碼中的註解
  const scanResults = scanAnnotations();
  
  if (scanResults.length === 0) {
    console.log('ℹ️  未找到任何 @ARCH 註解標記');
    console.log('💡 提示：請在程式碼中添加 @ARCH 註解標記');
    return 0;
  }
  
  // 提取文檔中的 hash
  const documentedHashes = extractHashesFromArchitecture();
  
  // 比對
  let hasIssues = false;
  const issues = [];
  const missing = [];
  
  for (const { file, annotations, fileHash } of scanResults) {
    for (const ann of annotations) {
      const key = `${ann.file}:${ann.startLine}-${ann.endLine}`;
      const documented = documentedHashes[key];
      
      if (!documented) {
        missing.push({
          file: ann.file,
          module: ann.module,
          type: ann.type,
          feature: ann.feature,
          location: `${ann.startLine}-${ann.endLine}`,
          hash: ann.hash
        });
        hasIssues = true;
      } else if (documented.hash !== ann.hash) {
        issues.push({
          file: ann.file,
          module: ann.module,
          type: ann.type,
          feature: ann.feature,
          location: `${ann.startLine}-${ann.endLine}`,
          documentedHash: documented.hash,
          actualHash: ann.hash
        });
        hasIssues = true;
      }
    }
  }
  
  // 輸出結果
  if (missing.length > 0) {
    console.log('⚠️  發現未記錄的標記：');
    for (const item of missing) {
      console.log(`   ${item.file}:${item.location} - ${item.module}.${item.type}.${item.feature}`);
      console.log(`      Hash: ${item.hash}`);
    }
    console.log('');
  }
  
  if (issues.length > 0) {
    console.log('⚠️  發現 Hash 不匹配：');
    for (const item of issues) {
      console.log(`   ${item.file}:${item.location} - ${item.module}.${item.type}.${item.feature}`);
      console.log(`      文檔中: ${item.documentedHash}`);
      console.log(`      實際: ${item.actualHash}`);
    }
    console.log('');
  }
  
  if (!hasIssues) {
    console.log('✅ 所有 Hash 都匹配！');
    console.log(`   檢查了 ${scanResults.reduce((sum, r) => sum + r.annotations.length, 0)} 個標記\n`);
    return 0;
  }
  
  console.log('💡 提示：請更新 ARCHITECTURE.md 中的 Hash');
  console.log('   或執行更新工具：node scripts/arch-hash-updater.js\n');
  
  return 1;
}

// 執行檢查
const exitCode = checkHashes();
process.exit(exitCode);

export { checkHashes, extractHashesFromArchitecture };

