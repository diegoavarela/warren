#!/usr/bin/env node

/**
 * Bundle Size Analyzer
 * 
 * Analyzes the Next.js bundle to identify optimization opportunities
 * and measure the impact of lazy loading implementations.
 */

const fs = require('fs');
const path = require('path');

const NEXT_DIR = path.join(process.cwd(), '.next');
const BUILD_MANIFEST = path.join(NEXT_DIR, 'build-manifest.json');
const STATIC_DIR = path.join(NEXT_DIR, 'static');

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function analyzeBundleSize() {
  console.log('🔍 Analyzing Next.js Bundle Size...\n');
  
  if (!fs.existsSync(BUILD_MANIFEST)) {
    console.log('❌ Build manifest not found. Run "npm run build" first.');
    return;
  }
  
  const manifest = JSON.parse(fs.readFileSync(BUILD_MANIFEST, 'utf8'));
  
  // Analyze page bundles
  const pageAnalysis = [];
  let totalSize = 0;
  
  Object.entries(manifest.pages).forEach(([page, files]) => {
    const pageSize = files.reduce((size, file) => {
      const filePath = path.join(STATIC_DIR, file);
      return size + getFileSize(filePath);
    }, 0);
    
    pageAnalysis.push({
      page,
      size: pageSize,
      files: files.length,
      mainFile: files[0] || 'N/A'
    });
    
    totalSize += pageSize;
  });
  
  // Sort by size
  pageAnalysis.sort((a, b) => b.size - a.size);
  
  console.log('📊 Page Bundle Analysis:');
  console.log('='.repeat(80));
  console.log(`${'Page'.padEnd(40)} ${'Size'.padEnd(12)} ${'Files'.padEnd(8)} Main Bundle`);
  console.log('-'.repeat(80));
  
  pageAnalysis.slice(0, 15).forEach(({ page, size, files, mainFile }) => {
    const displayPage = page.length > 35 ? page.substring(0, 32) + '...' : page;
    const displayFile = mainFile.length > 20 ? '...' + mainFile.substring(mainFile.length - 17) : mainFile;
    
    console.log(
      `${displayPage.padEnd(40)} ${formatBytes(size).padEnd(12)} ${files.toString().padEnd(8)} ${displayFile}`
    );
  });
  
  console.log('-'.repeat(80));
  console.log(`${'TOTAL'.padEnd(40)} ${formatBytes(totalSize).padEnd(12)} ${pageAnalysis.length.toString().padEnd(8)} pages`);
  
  // Identify optimization opportunities
  console.log('\n💡 Optimization Recommendations:');
  console.log('='.repeat(50));
  
  const largePages = pageAnalysis.filter(p => p.size > 500000); // > 500KB
  if (largePages.length > 0) {
    console.log(`🔴 Large bundles (>500KB): ${largePages.length} pages`);
    largePages.slice(0, 5).forEach(p => {
      console.log(`   • ${p.page}: ${formatBytes(p.size)}`);
    });
    console.log('   → Consider lazy loading heavy components');
  }
  
  const dashboardPages = pageAnalysis.filter(p => p.page.includes('/dashboard/'));
  if (dashboardPages.length > 0) {
    const avgDashboardSize = dashboardPages.reduce((sum, p) => sum + p.size, 0) / dashboardPages.length;
    console.log(`📈 Dashboard pages average: ${formatBytes(avgDashboardSize)}`);
    if (avgDashboardSize > 300000) {
      console.log('   → Dashboard bundles are large, lazy loading is beneficial');
    }
  }
  
  // Check for code splitting effectiveness
  const chunkedFiles = Object.values(manifest.pages).flat().filter(f => f.includes('chunks/'));
  const uniqueChunks = [...new Set(chunkedFiles)];
  
  console.log(`📦 Code splitting: ${uniqueChunks.length} unique chunks`);
  if (uniqueChunks.length < pageAnalysis.length * 0.5) {
    console.log('   → More code splitting opportunities available');
  }
  
  // Performance score
  const avgPageSize = totalSize / pageAnalysis.length;
  let score = 100;
  
  if (avgPageSize > 1000000) score -= 30; // 1MB+
  else if (avgPageSize > 500000) score -= 20; // 500KB+
  else if (avgPageSize > 250000) score -= 10; // 250KB+
  
  if (largePages.length > pageAnalysis.length * 0.2) score -= 20;
  if (uniqueChunks.length < pageAnalysis.length * 0.3) score -= 15;
  
  console.log(`\n🎯 Bundle Performance Score: ${score}/100`);
  
  if (score >= 80) console.log('✅ Excellent bundle optimization');
  else if (score >= 60) console.log('⚠️ Good, but room for improvement');
  else console.log('🔴 Bundle optimization needed');
  
  console.log('\n📋 Next Steps:');
  console.log('• Implement lazy loading for heavy components');
  console.log('• Use dynamic imports for large dependencies');
  console.log('• Consider route-level code splitting');
  console.log('• Optimize images and static assets');
  
  return {
    totalSize,
    pageCount: pageAnalysis.length,
    averageSize: avgPageSize,
    largestPage: pageAnalysis[0],
    score
  };
}

// Run analysis if called directly
if (require.main === module) {
  analyzeBundleSize();
}

module.exports = { analyzeBundleSize, formatBytes };