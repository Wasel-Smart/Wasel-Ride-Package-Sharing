#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const BUMP_TYPES = ['patch', 'minor', 'major'];

const ALLOWED_DOWNLOAD_DOMAINS = ['npmjs.com', 'registry.npmjs.org', 'github.com', 'raw.githubusercontent.com'];

function isValidDownloadUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const privateRanges = [/^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./, /^169\.254\./];
    if (privateRanges.some(p => p.test(parsed.hostname))) return false;
    return ALLOWED_DOWNLOAD_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function exec(cmd, args) {
  const cmdArgs = Array.isArray(args) ? args : [];
  return execFileSync(cmd, cmdArgs, { encoding: 'utf8', stdio: 'pipe' }).trim();
}

function getCurrentVersion() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  return pkg.version;
}

function getLastTag() {
  try {
    return exec('git', ['describe', '--tags', '--abbrev=0']);
  } catch {
    return null;
  }
}

function getCommitsSinceTag(tag) {
  const args = tag ? ['log', `${tag}..HEAD`, '--pretty=format:- %s (%h)', '--no-merges'] : ['log', '--pretty=format:- %s (%h)', '--no-merges'];
  try {
    return exec('git', args).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function determineBumpType(commits) {
  const hasBreaking = commits.some(c => 
    /^(feat|feature)(\(.*\))?!:/.test(c) || /BREAKING CHANGE/.test(c)
  );
  const hasFeature = commits.some(c => /^(feat|feature)(\(.*\))?:/.test(c));
  
  if (hasBreaking) return 'major';
  if (hasFeature) return 'minor';
  return 'patch';
}

function updateChangelog(version, commits) {
  const entry = [
    `## v${version}`,
    '',
    '### Changes',
    ...commits,
    ''
  ].join('\n');

  const changelogPath = 'CHANGELOG.md';
  const existing = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : '';
  writeFileSync(changelogPath, entry + '\n' + existing);
}

async function release(bumpType) {
  console.log('🚀 Starting incremental release...\n');

  // Validate bump type
  if (!BUMP_TYPES.includes(bumpType)) {
    console.error(`❌ Invalid bump type: ${bumpType}`);
    console.error(`   Valid types: ${BUMP_TYPES.join(', ')}`);
    process.exit(1);
  }

  // Check git status
  try {
    const status = exec('git', ['status', '--porcelain']);
    if (status) {
      console.error('❌ Working directory not clean. Commit or stash changes first.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Git error:', error.message);
    process.exit(1);
  }

  // Run quality checks
  console.log('🔍 Running quality checks...');
  try {
    exec('npm', ['run', 'verify:ci']);
    console.log('✅ Quality checks passed\n');
  } catch (error) {
    console.error('❌ Quality checks failed');
    process.exit(1);
  }

  // Get current version and commits
  const currentVersion = getCurrentVersion();
  const lastTag = getLastTag();
  const commits = getCommitsSinceTag(lastTag);

  console.log(`📦 Current version: ${currentVersion}`);
  console.log(`📝 Commits since ${lastTag || 'start'}: ${commits.length}\n`);

  // Bump version
  console.log(`⬆️  Bumping ${bumpType} version...`);
  const newVersion = exec('npm', ['version', bumpType, '--no-git-tag-version']).replace('v', '');
  console.log(`✅ New version: ${newVersion}\n`);

  // Update changelog
  console.log('📄 Updating CHANGELOG.md...');
  updateChangelog(newVersion, commits);
  console.log('✅ Changelog updated\n');

  // Commit and tag
  console.log('💾 Creating release commit and tag...');
  exec('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md']);
  exec('git', ['commit', '-m', `chore: release v${newVersion}`]);
  exec('git', ['tag', `v${newVersion}`]);
  console.log('✅ Release committed and tagged\n');

  // Push
  console.log('🚢 Pushing to remote...');
  exec('git', ['push', 'origin', 'master', '--tags']);
  console.log('✅ Pushed to remote\n');

  console.log(`🎉 Release v${newVersion} complete!`);
  console.log(`   Vercel will auto-deploy from master branch`);
}

// Parse CLI args
const bumpType = process.argv[2] || determineBumpType(getCommitsSinceTag(getLastTag()));

release(bumpType).catch(error => {
  console.error('❌ Release failed:', error.message);
  process.exit(1);
});
