import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const BRAND_DIR = path.join(PUBLIC_DIR, 'brand');

async function optimizeImage(inputPath, outputPath, options = {}) {
  const { width, height, quality = 80 } = options;
  
  let pipeline = sharp(inputPath);
  
  if (width || height) {
    pipeline = pipeline.resize(width, height, { 
      fit: width && height ? 'cover' : 'inside', 
      withoutEnlargement: true,
      position: 'center'
    });
  }
  
  await pipeline
    .png({ quality, compressionLevel: 9, adaptiveFiltering: true, palette: true })
    .toFile(outputPath);
}

async function createWebP(inputPath, outputPath, quality = 75) {
  await sharp(inputPath)
    .webp({ quality, effort: 6 })
    .toFile(outputPath);
}

async function createAVIF(inputPath, outputPath, quality = 60) {
  try {
    await sharp(inputPath)
      .avif({ quality, effort: 4 })
      .toFile(outputPath);
  } catch (e) {
    // AVIF may not be supported on all systems
  }
}

async function processBrandImages() {
  const files = fs.readdirSync(BRAND_DIR).filter(f => f.endsWith('.png'));
  
  console.log(`Processing ${files.length} brand PNG files...`);
  
  for (const file of files) {
    const inputPath = path.join(BRAND_DIR, file);
    const baseName = file.replace(/\.png$/, '');
    const stats = fs.statSync(inputPath);
    
    // Determine target size based on filename
    let targetWidth = null;
    let targetHeight = null;
    
    if (baseName.includes('wasellogo-64')) { targetWidth = 64; targetHeight = 64; }
    else if (baseName.includes('wasellogo-96')) { targetWidth = 96; targetHeight = 96; }
    else if (baseName.includes('wasellogo-160')) { targetWidth = 160; targetHeight = 160; }
    else if (baseName.includes('wasellogo-280')) { targetWidth = 280; targetHeight = 280; }
    else if (baseName.includes('wasellogo-512')) { targetWidth = 512; targetHeight = 512; }
    else if (baseName.includes('wasel-symbol')) { targetWidth = 280; targetHeight = null; }
    else if (baseName.includes('wasel-app-icon')) { targetWidth = 512; targetHeight = 512; }
    else if (baseName.includes('wasel-logo') || baseName.includes('wasel-og') || baseName.includes('wasel-social') || baseName.includes('wasel-w-mark')) {
      targetWidth = 1200; targetHeight = null; }
    
    // Optimize PNG
    const optimizedPng = path.join(BRAND_DIR, `${baseName}-optimized.png`);
    await optimizeImage(inputPath, optimizedPng, { width: targetWidth, height: targetHeight, quality: 85 });
    
    // Create WebP
    const webpPath = path.join(BRAND_DIR, `${baseName}.webp`);
    await createWebP(optimizedPng, webpPath, 75);
    
    // Create AVIF
    const avifPath = path.join(BRAND_DIR, `${baseName}.avif`);
    await createAVIF(optimizedPng, avifPath, 60);
    
    const originalSize = stats.size;
    const optimizedSize = fs.statSync(optimizedPng).size;
    const webpSize = fs.statSync(webpPath).size;
    
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    console.log(`${file}: ${(originalSize / 1024).toFixed(1)}KB -> PNG: ${(optimizedSize / 1024).toFixed(1)}KB (${savings}% saved), WebP: ${(webpSize / 1024).toFixed(1)}KB`);
    
    // Replace original with optimized
    fs.renameSync(optimizedPng, inputPath);
  }
}

async function processIcons() {
  const iconFiles = fs.readdirSync(PUBLIC_DIR).filter(f => 
    (f.startsWith('icon-') || f.startsWith('apple-touch-icon') || f.startsWith('favicon')) && f.endsWith('.png')
  );
  
  console.log(`\nProcessing ${iconFiles.length} icon files...`);
  
  for (const file of iconFiles) {
    const inputPath = path.join(PUBLIC_DIR, file);
    const baseName = file.replace(/\.png$/, '');
    const stats = fs.statSync(inputPath);
    
    let targetSize = null;
    if (baseName.includes('192')) targetSize = 192;
    else if (baseName.includes('32')) targetSize = 32;
    else if (baseName.includes('16')) targetSize = 16;
    else if (baseName.includes('apple-touch-icon')) targetSize = 180;
    
    const optimizedPng = path.join(PUBLIC_DIR, `${baseName}-optimized.png`);
    
    if (targetSize) {
      await optimizeImage(inputPath, optimizedPng, { width: targetSize, height: targetSize, quality: 85 });
    } else {
      await optimizeImage(inputPath, optimizedPng, { quality: 85 });
    }
    
    const webpPath = path.join(PUBLIC_DIR, `${baseName}.webp`);
    await createWebP(optimizedPng, webpPath, 75);
    
    const originalSize = stats.size;
    const optimizedSize = fs.statSync(optimizedPng).size;
    const webpSize = fs.statSync(webpPath).size;
    
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    console.log(`${file}: ${(originalSize / 1024).toFixed(1)}KB -> PNG: ${(optimizedSize / 1024).toFixed(1)}KB (${savings}% saved), WebP: ${(webpSize / 1024).toFixed(1)}KB`);
    
    fs.renameSync(optimizedPng, inputPath);
  }
}

async function main() {
  await processBrandImages();
  await processIcons();
  console.log('\nImage optimization complete!');
}

main().catch(console.error);
