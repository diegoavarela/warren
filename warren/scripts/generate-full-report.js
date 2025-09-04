const fs = require('fs');
const path = require('path');

// Combined report generator
class FullReportGenerator {
  constructor() {
    this.screenshotsDir = './screenshots';
    this.dashboardDir = './screenshots/dashboard';
    this.results = {
      timestamp: new Date().toISOString(),
      publicPages: {},
      dashboardPages: {},
      totalScreenshots: 0,
      viewports: {}
    };
  }

  async generateReport() {
    console.log('📋 Generating comprehensive responsive testing report...');
    
    // Read public page screenshots
    this.scanPublicPages();
    
    // Read dashboard screenshots
    this.scanDashboardPages();
    
    // Generate HTML report
    const htmlContent = this.generateHTML();
    const reportPath = path.join(this.screenshotsDir, 'warren-full-responsive-report.html');
    
    fs.writeFileSync(reportPath, htmlContent);
    
    console.log('✅ Comprehensive report generated:');
    console.log(`   🌐 HTML Report: ${reportPath}`);
    console.log(`   📸 Total Screenshots: ${this.results.totalScreenshots}`);
    console.log(`   📱 Public Pages: ${Object.keys(this.results.publicPages).length}`);
    console.log(`   📊 Dashboard Pages: ${Object.keys(this.results.dashboardPages).length}`);
    
    return reportPath;
  }

  scanPublicPages() {
    if (!fs.existsSync(this.screenshotsDir)) return;
    
    const files = fs.readdirSync(this.screenshotsDir);
    
    files.forEach(file => {
      if (file.endsWith('.png') && !file.includes('dashboard')) {
        const parts = file.replace('.png', '').split('_');
        if (parts.length >= 3) {
          const pageName = parts[0];
          const viewport = parts[1];
          const dimensions = parts[2];
          
          if (!this.results.publicPages[pageName]) {
            this.results.publicPages[pageName] = {};
          }
          
          this.results.publicPages[pageName][viewport] = {
            filename: file,
            dimensions: dimensions,
            path: file
          };
          
          this.results.totalScreenshots++;
          this.results.viewports[viewport] = true;
        }
      }
    });
  }

  scanDashboardPages() {
    if (!fs.existsSync(this.dashboardDir)) return;
    
    const files = fs.readdirSync(this.dashboardDir);
    
    files.forEach(file => {
      if (file.endsWith('.png')) {
        const parts = file.replace('.png', '').split('_');
        if (parts.length >= 3) {
          const pageName = parts[0];
          const viewport = parts[1];
          const dimensions = parts[2];
          
          if (!this.results.dashboardPages[pageName]) {
            this.results.dashboardPages[pageName] = {};
          }
          
          this.results.dashboardPages[pageName][viewport] = {
            filename: file,
            dimensions: dimensions,
            path: `dashboard/${file}`
          };
          
          this.results.totalScreenshots++;
          this.results.viewports[viewport] = true;
        }
      }
    });
  }

  getPageDisplayName(pageName) {
    const names = {
      'landing-page': 'Landing Page',
      'login-page': 'Login Page',
      'main-dashboard': 'Main Dashboard',
      'pnl-dashboard': 'P&L Dashboard',
      'cashflow-dashboard': 'Cash Flow Dashboard',
      'uploads-dashboard': 'Uploads & History'
    };
    return names[pageName] || pageName;
  }

  getViewportDisplayName(viewport) {
    const names = {
      'mobile-se': 'iPhone SE (375×667)',
      'mobile-12': 'iPhone 12 (390×844)',
      'mobile-14': 'iPhone 14 Pro (430×932)',
      'tablet': 'iPad (768×1024)',
      'tablet-air': 'iPad Air (820×1180)',
      'tablet-landscape': 'Tablet Landscape (1024×768)',
      'desktop-small': 'Small Desktop (1366×768)',
      'desktop-fhd': 'Full HD Desktop (1920×1080)',
      'desktop-2k': '2K Desktop (2560×1440)',
      'tv-4k': '4K TV (3840×2160)'
    };
    return names[viewport] || viewport;
  }

  generateHTML() {
    const publicPageNames = Object.keys(this.results.publicPages);
    const dashboardPageNames = Object.keys(this.results.dashboardPages);
    const viewportNames = Object.keys(this.results.viewports);
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warren - Complete Responsive Test Report</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; padding: 20px; background: #f8fafc; line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { 
            background: linear-gradient(135deg, #3b82f6, #10b981); 
            color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem;
            text-align: center;
        }
        .header h1 { margin: 0 0 0.5rem 0; font-size: 2.5rem; }
        .header p { margin: 0; opacity: 0.9; font-size: 1.1rem; }
        .summary { 
            background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .stat-card { 
            background: #f8fafc; padding: 1.5rem; border-radius: 8px; text-align: center;
            border-left: 4px solid #3b82f6;
        }
        .stat-number { font-size: 2rem; font-weight: bold; color: #1f2937; }
        .stat-label { color: #6b7280; font-size: 0.9rem; margin-top: 0.5rem; }
        .section { 
            background: white; margin-bottom: 2rem; border-radius: 12px; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;
        }
        .section-header { 
            background: #1f2937; color: white; padding: 1.5rem; 
            font-size: 1.3rem; font-weight: 600;
        }
        .section-content { padding: 2rem; }
        .page-group { margin-bottom: 3rem; }
        .page-title { 
            font-size: 1.5rem; font-weight: 700; color: #1f2937; 
            margin-bottom: 1.5rem; padding-bottom: 0.5rem;
            border-bottom: 3px solid #e5e7eb;
        }
        .screenshot-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
            gap: 1.5rem; 
        }
        .screenshot-item { 
            border: 2px solid #e5e7eb; border-radius: 8px; 
            background: white; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;
        }
        .screenshot-item:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            border-color: #3b82f6;
        }
        .screenshot-item img { 
            width: 100%; height: auto; display: block; 
            cursor: pointer; transition: opacity 0.2s;
        }
        .screenshot-item img:hover { opacity: 0.95; }
        .screenshot-info { padding: 1rem; }
        .screenshot-title { font-weight: 600; color: #1f2937; margin-bottom: 0.5rem; }
        .screenshot-meta { font-size: 0.85rem; color: #6b7280; }
        .device-icon { display: inline-block; margin-right: 0.5rem; }
        .public-badge { 
            background: #10b981; color: white; padding: 0.25rem 0.75rem; 
            border-radius: 999px; font-size: 0.75rem; font-weight: 500;
        }
        .auth-badge { 
            background: #f59e0b; color: white; padding: 0.25rem 0.75rem; 
            border-radius: 999px; font-size: 0.75rem; font-weight: 500;
        }
        .modal { 
            display: none; position: fixed; z-index: 1000; left: 0; top: 0; 
            width: 100%; height: 100%; background: rgba(0,0,0,0.9);
            cursor: pointer;
        }
        .modal img { 
            display: block; margin: auto; max-width: 95%; max-height: 95%; 
            margin-top: 2.5%; border-radius: 8px;
        }
        .close { 
            position: absolute; top: 20px; right: 30px; color: #fff; 
            font-size: 40px; font-weight: bold; cursor: pointer;
        }
        .timestamp { 
            text-align: center; margin-top: 2rem; color: #6b7280; 
            font-size: 0.9rem; padding: 1rem;
        }
        @media (max-width: 768px) {
            .stats { grid-template-columns: repeat(2, 1fr); }
            .screenshot-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 Warren - Complete Responsive Test Report</h1>
            <p>Comprehensive visual testing across all devices and screen sizes</p>
        </div>
        
        <div class="summary">
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${this.results.totalScreenshots}</div>
                    <div class="stat-label">Total Screenshots</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${publicPageNames.length}</div>
                    <div class="stat-label">Public Pages</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${dashboardPageNames.length}</div>
                    <div class="stat-label">Dashboard Pages</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${viewportNames.length}</div>
                    <div class="stat-label">Device Sizes</div>
                </div>
            </div>
        </div>`;

    // Public Pages Section
    if (publicPageNames.length > 0) {
      html += `
        <div class="section">
            <div class="section-header">
                🌐 Public Pages <span class="public-badge">No Authentication Required</span>
            </div>
            <div class="section-content">`;
      
      publicPageNames.forEach(pageName => {
        const pageData = this.results.publicPages[pageName];
        const displayName = this.getPageDisplayName(pageName);
        
        html += `
                <div class="page-group">
                    <div class="page-title">${displayName}</div>
                    <div class="screenshot-grid">`;
        
        Object.keys(pageData).forEach(viewport => {
          const screenshot = pageData[viewport];
          const deviceIcon = this.getDeviceIcon(viewport);
          const viewportName = this.getViewportDisplayName(viewport);
          
          html += `
                        <div class="screenshot-item">
                            <img src="${screenshot.path}" alt="${displayName} - ${viewport}" onclick="openModal('${screenshot.path}', '${displayName} - ${viewportName}')">
                            <div class="screenshot-info">
                                <div class="screenshot-title">${deviceIcon} ${viewport}</div>
                                <div class="screenshot-meta">${viewportName}</div>
                            </div>
                        </div>`;
        });
        
        html += `
                    </div>
                </div>`;
      });
      
      html += `
            </div>
        </div>`;
    }

    // Dashboard Pages Section  
    if (dashboardPageNames.length > 0) {
      html += `
        <div class="section">
            <div class="section-header">
                📊 Dashboard Pages <span class="auth-badge">Authentication Required</span>
            </div>
            <div class="section-content">`;
      
      dashboardPageNames.forEach(pageName => {
        const pageData = this.results.dashboardPages[pageName];
        const displayName = this.getPageDisplayName(pageName);
        
        html += `
                <div class="page-group">
                    <div class="page-title">${displayName}</div>
                    <div class="screenshot-grid">`;
        
        Object.keys(pageData).forEach(viewport => {
          const screenshot = pageData[viewport];
          const deviceIcon = this.getDeviceIcon(viewport);
          const viewportName = this.getViewportDisplayName(viewport);
          
          html += `
                        <div class="screenshot-item">
                            <img src="${screenshot.path}" alt="${displayName} - ${viewport}" onclick="openModal('${screenshot.path}', '${displayName} - ${viewportName}')">
                            <div class="screenshot-info">
                                <div class="screenshot-title">${deviceIcon} ${viewport}</div>
                                <div class="screenshot-meta">${viewportName}</div>
                            </div>
                        </div>`;
        });
        
        html += `
                    </div>
                </div>`;
      });
      
      html += `
            </div>
        </div>`;
    }

    html += `
        <div class="timestamp">
            Generated on ${new Date(this.results.timestamp).toLocaleString()}
        </div>
    </div>

    <!-- Modal for full-size images -->
    <div id="imageModal" class="modal" onclick="closeModal()">
        <span class="close" onclick="closeModal()">&times;</span>
        <img id="modalImg" src="" alt="">
    </div>

    <script>
        function openModal(src, alt) {
            document.getElementById('imageModal').style.display = 'block';
            document.getElementById('modalImg').src = src;
            document.getElementById('modalImg').alt = alt;
        }
        
        function closeModal() {
            document.getElementById('imageModal').style.display = 'none';
        }
        
        // Close modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    </script>
</body>
</html>`;

    return html;
  }

  getDeviceIcon(viewport) {
    if (viewport.includes('mobile')) return '📱';
    if (viewport.includes('tablet')) return '📱';
    if (viewport.includes('desktop')) return '💻';
    if (viewport.includes('tv')) return '📺';
    return '💻';
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new FullReportGenerator();
  generator.generateReport().catch(console.error);
}

module.exports = FullReportGenerator;