/**
 * Bundle Size Analysis Configuration
 * Tracks and validates bundle sizes to prevent bloat
 */

import fs from 'fs';
import path from 'path';

/**
 * Parse build output to extract chunk sizes
 */
export function analyzeBuildOutput(buildDir: string = './dist'): Record<string, number> {
  const sizes: Record<string, number> = {};

  if (!fs.existsSync(buildDir)) {
    console.warn(`Build directory not found: ${buildDir}`);
    return sizes;
  }

  const assetsDir = path.join(buildDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    return sizes;
  }

  const files = fs.readdirSync(assetsDir);

  for (const file of files) {
    const filePath = path.join(assetsDir, file);
    const stats = fs.statSync(filePath);
    sizes[file] = stats.size;
  }

  return sizes;
}

/**
 * Calculate total bundle size
 */
export function calculateTotalSize(sizes: Record<string, number>): number {
  return Object.values(sizes).reduce((total, size) => total + size, 0);
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Group chunks by category
 */
export function groupChunksByCategory(files: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    'react-core': [],
    'ui-primitives': [],
    'data-layer': [],
    'maps': [],
    'charts': [],
    'forms': [],
    'monitoring': [],
    'payments': [],
    'pages': [],
    'other': [],
  };

  for (const file of files) {
    if (file.includes('react-core')) groups['react-core'].push(file);
    else if (file.includes('ui-primitives')) groups['ui-primitives'].push(file);
    else if (file.includes('data-layer')) groups['data-layer'].push(file);
    else if (file.includes('maps')) groups['maps'].push(file);
    else if (file.includes('charts')) groups['charts'].push(file);
    else if (file.includes('forms')) groups['forms'].push(file);
    else if (file.includes('monitoring')) groups['monitoring'].push(file);
    else if (file.includes('payments')) groups['payments'].push(file);
    else if (file.includes('Page')) groups['pages'].push(file);
    else groups['other'].push(file);
  }

  return Object.fromEntries(Object.entries(groups).filter(([_, groupFiles]) => groupFiles.length > 0));
}

/**
 * Generate bundle analysis report
 */
export function generateBundleReport(buildDir: string = './dist'): string {
  const sizes = analyzeBuildOutput(buildDir);
  const total = calculateTotalSize(sizes);
  const files = Object.keys(sizes);
  const groups = groupChunksByCategory(files);

  let report = '\n📦 Bundle Analysis Report\n';
  report += '═'.repeat(50) + '\n\n';

  report += `Total Size: ${formatBytes(total)}\n`;
  report += `Total Files: ${files.length}\n\n`;

  // By category
  report += '📊 Size by Category:\n';
  report += '─'.repeat(50) + '\n';

  for (const [category, categoryFiles] of Object.entries(groups)) {
    const categoryTotal = categoryFiles.reduce((sum, file) => sum + sizes[file], 0);
    const percentage = ((categoryTotal / total) * 100).toFixed(1);
    report += `${category.padEnd(20)} ${formatBytes(categoryTotal).padStart(12)} (${percentage}%)\n`;
  }

  // Top 10 largest
  report += '\n🔝 Top 10 Largest Files:\n';
  report += '─'.repeat(50) + '\n';

  const sorted = files.sort((a, b) => sizes[b] - sizes[a]).slice(0, 10);
  for (const file of sorted) {
    report += `${file.padEnd(35)} ${formatBytes(sizes[file]).padStart(12)}\n`;
  }

  report += '\n' + '═'.repeat(50) + '\n';

  return report;
}

/**
 * Compare with baseline and check budget
 */
export function compareToBudget(sizes: Record<string, number>, baselines?: Record<string, number>): {
  violations: string[];
  warnings: string[];
  info: string[];
} {
  const result = { violations: [], warnings: [], info: [] };

  const total = calculateTotalSize(sizes);
  const JS_BUDGET = 500 * 1024; // 500 KB

  if (total > JS_BUDGET) {
    result.violations.push(`Total JS exceeds budget: ${formatBytes(total)} > ${formatBytes(JS_BUDGET)}`);
  } else if (total > JS_BUDGET * 0.9) {
    result.warnings.push(`Total JS approaching budget: ${formatBytes(total)}`);
  } else {
    result.info.push(`✓ Total JS within budget: ${formatBytes(total)}`);
  }

  // Compare to baseline if provided
  if (baselines) {
    const baselineTotal = calculateTotalSize(baselines);
    const diff = total - baselineTotal;
    const diffPercent = ((diff / baselineTotal) * 100).toFixed(1);

    if (diff > 50 * 1024) { // 50 KB regression
      result.violations.push(`Bundle size regression: +${formatBytes(diff)} (+${diffPercent}%)`);
    } else if (diff > 0) {
      result.warnings.push(`Bundle size increase: +${formatBytes(diff)} (+${diffPercent}%)`);
    } else if (diff < 0) {
      result.info.push(`✓ Bundle size improved: ${formatBytes(Math.abs(diff))} (${diffPercent}%)`);
    }
  }

  return result;
}

/**
 * Export bundle metrics to file
 */
export function exportBundleMetrics(buildDir: string = './dist', outputFile: string = './bundle-metrics.json'): void {
  const sizes = analyzeBuildOutput(buildDir);
  const total = calculateTotalSize(sizes);
  const timestamp = new Date().toISOString();

  const metrics = {
    timestamp,
    total,
    sizes,
    byCategory: Object.entries(groupChunksByCategory(Object.keys(sizes))).reduce(
      (acc, [category, files]) => {
        acc[category] = files.reduce((sum, file) => sum + sizes[file], 0);
        return acc;
      },
      {} as Record<string, number>,
    ),
  };

  fs.writeFileSync(outputFile, JSON.stringify(metrics, null, 2));
  // Bundle metrics exported successfully
}
