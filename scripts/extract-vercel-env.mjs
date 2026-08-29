#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

console.log('🔍 Extracting VITE_* environment variables for Vercel...\n');

const envPath = path.join(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found. Please create one from .env.example');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const viteVars = [];

for (const rawLine of envContent.split(/\r?\n/)) {
  const line = rawLine.trim();
  
  if (!line || line.startsWith('#')) continue;
  
  const normalizedLine = line.startsWith('export ') ? line.slice(7).trim() : line;
  const separatorIndex = normalizedLine.indexOf('=');
  
  if (separatorIndex <= 0) continue;
  
  const key = normalizedLine.slice(0, separatorIndex).trim();
  
  // Only include VITE_* prefixed variables
  if (!key.startsWith('VITE_')) continue;
  
  let value = normalizedLine.slice(separatorIndex + 1).trim();
  const hasMatchingQuotes =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  
  if (hasMatchingQuotes) {
    value = value.slice(1, -1);
  }
  
  viteVars.push({ key, value });
}

if (viteVars.length === 0) {
  console.log('⚠️  No VITE_* variables found in .env file');
  process.exit(0);
}

console.log('📋 Copy these variables to Vercel Dashboard:\n');
console.log('=' .repeat(80));

for (const { key, value } of viteVars) {
  console.log(`${key}=${value}`);
}

console.log('=' .repeat(80));
console.log(`\n✅ Found ${viteVars.length} VITE_* variables`);
console.log('\n📝 Instructions:');
console.log('1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
console.log('2. Click "Add New" for each variable above');
console.log('3. Select environment scope (Production, Preview, Development)');
console.log('4. Redeploy your project\n');
