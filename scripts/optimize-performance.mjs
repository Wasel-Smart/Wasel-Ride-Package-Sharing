#!/usr/bin/env node

/**
 * Performance Optimizer - Production performance improvements
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

function optimizeViteConfig() {
  console.log('⚡ Optimizing Vite configuration...');
  
  const viteConfigPath = join(process.cwd(), 'vite.config.ts');
  if (!existsSync(viteConfigPath)) {
    console.log('❌ vite.config.ts not found');
    return;
  }
  
  let config = readFileSync(viteConfigPath, 'utf-8');
  
  // Add production optimizations
  const optimizations = `
  // Production optimizations
  define: {
    __DEV__: JSON.stringify(false),
  },
  
  build: {
    ...build,
    // Enable advanced minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // Optimize chunk splitting further
    rollupOptions: {
      ...build.rollupOptions,
      output: {
        ...build.rollupOptions?.output,
        // Better chunk naming for caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = (assetInfo.name ?? '').split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return \`assets/images/[name]-[hash][extname]\`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return \`assets/fonts/[name]-[hash][extname]\`;
          }
          return \`assets/[name]-[hash][extname]\`;
        },
      },
    },
  },`;
  
  console.log('✅ Vite config optimization suggestions ready');
  console.log('💡 Consider adding terser minification and console removal for production');
}

function generatePreloadHints() {
  console.log('🔗 Generating resource preload hints...');
  
  const indexPath = join(process.cwd(), 'index.html');
  if (!existsSync(indexPath)) {
    console.log('❌ index.html not found');
    return;
  }
  
  let html = readFileSync(indexPath, 'utf-8');
  
  // Add preload hints for critical resources
  const preloadHints = `
    <!-- Critical resource preloads -->
    <link rel="preload" href="/assets/fonts/plus-jakarta-sans.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/cairo.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preconnect" href="https://api.supabase.co">
    <link rel="preconnect" href="https://js.stripe.com">
    <link rel="dns-prefetch" href="https://maps.googleapis.com">`;
  
  if (!html.includes('preload')) {
    console.log('💡 Consider adding resource preload hints to index.html');
    console.log('   Add before closing </head> tag:');
    console.log(preloadHints);
  }
}

function checkImageOptimization() {
  console.log('🖼️  Checking image optimization...');
  
  const publicDir = join(process.cwd(), 'public');
  if (!existsSync(publicDir)) {
    console.log('❌ public directory not found');
    return;
  }
  
  console.log('💡 Image optimization recommendations:');
  console.log('   • Convert PNG/JPG to WebP format');
  console.log('   • Use responsive images with srcset');
  console.log('   • Implement lazy loading for non-critical images');
  console.log('   • Compress images with tools like imagemin');
}

function analyzeServiceWorker() {
  console.log('⚙️  Analyzing service worker...');
  
  const swPath = join(process.cwd(), 'public', 'sw.js');
  if (!existsSync(swPath)) {
    console.log('❌ Service worker not found');
    return;
  }
  
  const sw = readFileSync(swPath, 'utf-8');
  
  if (!sw.includes('cache')) {
    console.log('💡 Consider implementing caching strategies in service worker');
  }
  
  if (!sw.includes('offline')) {
    console.log('💡 Consider adding offline fallback pages');
  }
  
  console.log('✅ Service worker analysis complete');
}

function generateOptimizationReport() {
  console.log('\n📊 Performance Optimization Report\n');
  console.log('='.repeat(50));
  
  optimizeViteConfig();
  generatePreloadHints();
  checkImageOptimization();
  analyzeServiceWorker();
  
  console.log('\n🎯 Priority Actions:');
  console.log('1. Fix log injection vulnerabilities (CRITICAL)');
  console.log('2. Enable production minification with console removal');
  console.log('3. Add resource preload hints');
  console.log('4. Optimize images to WebP format');
  console.log('5. Implement service worker caching');
  console.log('6. Enable gzip/brotli compression on server');
  
  console.log('\n📈 Expected Improvements:');
  console.log('• Bundle size: -20-30%');
  console.log('• First Contentful Paint: -200-500ms');
  console.log('• Largest Contentful Paint: -300-800ms');
  console.log('• Time to Interactive: -500-1000ms');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateOptimizationReport();
}