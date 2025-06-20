const puppeteer = require('puppeteer');
const path = require('path');

async function createDashboardMockups() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null
  });

  const page = await browser.newPage();
  
  // Set high resolution viewport
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 2,
  });

  // Create HTML mockups for different dashboard views
  const mockups = [
    {
      name: 'landing-hero-dashboard.png',
      title: 'Warren - Main Dashboard',
      content: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px;">
          <div style="background: white; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 1400px; margin: 0 auto; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 30px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px; font-weight: bold;">WARREN</div>
                <div style="font-size: 14px; opacity: 0.9;">Financial Intelligence Platform</div>
              </div>
              <div style="font-size: 14px;">Welcome, Demo User</div>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 30px;">
              <!-- Key Metrics -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; margin-bottom: 8px;">$2.4M</div>
                  <div style="font-size: 14px; opacity: 0.9;">Current Cash Position</div>
                </div>
                <div style="background: linear-gradient(135deg, #f093fb, #f5576c); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; margin-bottom: 8px;">+18%</div>
                  <div style="font-size: 14px; opacity: 0.9;">Revenue Growth YTD</div>
                </div>
                <div style="background: linear-gradient(135deg, #4facfe, #00f2fe); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; margin-bottom: 8px;">6 Mo</div>
                  <div style="font-size: 14px; opacity: 0.9;">Cash Runway</div>
                </div>
                <div style="background: linear-gradient(135deg, #43e97b, #38f9d7); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; margin-bottom: 8px;">AI</div>
                  <div style="font-size: 14px; opacity: 0.9;">Excel Analysis</div>
                </div>
              </div>
              
              <!-- Charts Section -->
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                <!-- Cash Flow Chart -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #1a202c; font-size: 18px;">Cash Flow Trends (6 Month Forecast)</h3>
                  <div style="height: 200px; background: linear-gradient(45deg, #667eea20, #764ba220); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #667eea; font-weight: 600;">
                    📈 Interactive Cash Flow Chart
                  </div>
                </div>
                
                <!-- Recent Activity -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #1a202c; font-size: 18px;">Recent Activity</h3>
                  <div style="space-y: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: #4a5568; font-size: 14px;">Excel Import</span>
                      <span style="color: #38a169; font-size: 14px;">✓ Success</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: #4a5568; font-size: 14px;">AI Analysis</span>
                      <span style="color: #38a169; font-size: 14px;">✓ Complete</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                      <span style="color: #4a5568; font-size: 14px;">P&L Generated</span>
                      <span style="color: #667eea; font-size: 14px;">2 min ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    },
    {
      name: 'landing-wide-dashboard.png',
      title: 'Warren - Cash Flow Analysis',
      content: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px;">
          <div style="background: white; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 1400px; margin: 0 auto; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 30px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Cash Flow Analysis</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">AI-powered financial insights and forecasting</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <!-- Time Filters -->
              <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px;">6 Months</button>
                <button style="background: #e2e8f0; color: #4a5568; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px;">12 Months</button>
                <button style="background: #e2e8f0; color: #4a5568; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px;">Custom</button>
              </div>
              
              <!-- Main Chart -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
                <div style="height: 300px; background: linear-gradient(45deg, #667eea10, #764ba210); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #667eea; font-weight: 600; font-size: 18px;">
                  📊 Interactive Cash Flow Visualization<br/>
                  <span style="font-size: 14px; margin-top: 10px; display: block;">Inflows vs Outflows • Forecasting • Trend Analysis</span>
                </div>
              </div>
              
              <!-- Key Insights -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                <div style="background: #f7fafc; border-left: 4px solid #667eea; padding: 20px; border-radius: 8px;">
                  <h4 style="margin: 0 0 10px 0; color: #2d3748; font-size: 16px;">Lowest Cash Point</h4>
                  <div style="font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 5px;">$1.2M</div>
                  <div style="font-size: 14px; color: #718096;">Expected in March 2025</div>
                </div>
                <div style="background: #f7fafc; border-left: 4px solid #38a169; padding: 20px; border-radius: 8px;">
                  <h4 style="margin: 0 0 10px 0; color: #2d3748; font-size: 16px;">Biggest Cash Gain</h4>
                  <div style="font-size: 24px; font-weight: bold; color: #38a169; margin-bottom: 5px;">+$650K</div>
                  <div style="font-size: 14px; color: #718096;">Q2 2025 Revenue Boost</div>
                </div>
                <div style="background: #f7fafc; border-left: 4px solid #e53e3e; padding: 20px; border-radius: 8px;">
                  <h4 style="margin: 0 0 10px 0; color: #2d3748; font-size: 16px;">Largest Outflow</h4>
                  <div style="font-size: 24px; font-weight: bold; color: #e53e3e; margin-bottom: 5px;">-$480K</div>
                  <div style="font-size: 14px; color: #718096;">Equipment Purchase (Jan)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    },
    {
      name: 'landing-pnl-dashboard.png',
      title: 'Warren - P&L Dashboard',
      content: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px;">
          <div style="background: white; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 1400px; margin: 0 auto; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(90deg, #38a169 0%, #48bb78 100%); color: white; padding: 20px 30px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Profit & Loss Analysis</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Executive financial performance overview</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <!-- P&L Summary -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 25px;">
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                  <div style="font-size: 28px; font-weight: bold; color: #38a169; margin-bottom: 8px;">$3.2M</div>
                  <div style="font-size: 14px; color: #718096;">Total Revenue YTD</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                  <div style="font-size: 28px; font-weight: bold; color: #e53e3e; margin-bottom: 8px;">$2.1M</div>
                  <div style="font-size: 14px; color: #718096;">Total Costs YTD</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                  <div style="font-size: 28px; font-weight: bold; color: #667eea; margin-bottom: 8px;">$1.1M</div>
                  <div style="font-size: 14px; color: #718096;">Net Profit YTD</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                  <div style="font-size: 28px; font-weight: bold; color: #805ad5; margin-bottom: 8px;">34%</div>
                  <div style="font-size: 14px; color: #718096;">Profit Margin</div>
                </div>
              </div>
              
              <!-- Charts -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <!-- Revenue Breakdown -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #1a202c; font-size: 18px;">Revenue Breakdown</h3>
                  <div style="height: 200px; background: linear-gradient(45deg, #38a16920, #48bb7820); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #38a169; font-weight: 600;">
                    🥧 Revenue by Category<br/>
                    <span style="font-size: 14px; margin-top: 10px; display: block;">Interactive Pie Chart</span>
                  </div>
                </div>
                
                <!-- Cost Analysis -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #1a202c; font-size: 18px;">Cost Analysis</h3>
                  <div style="height: 200px; background: linear-gradient(45deg, #e53e3e20, #fc8181⁢20); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #e53e3e; font-weight: 600;">
                    📊 Cost Trends<br/>
                    <span style="font-size: 14px; margin-top: 10px; display: block;">Monthly Breakdown</span>
                  </div>
                </div>
              </div>
              
              <!-- Key Highlights -->
              <div style="margin-top: 20px; background: #edf2f7; border-radius: 12px; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #1a202c; font-size: 18px;">Financial Highlights</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; font-size: 14px;">
                  <div>✅ Revenue up 18% vs last quarter</div>
                  <div>⚠️ Operating costs increased 8%</div>
                  <div>📈 Profit margin improved by 2.3%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    },
    {
      name: 'landing-ai-analysis.png',
      title: 'Warren - AI Excel Analysis',
      content: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px;">
          <div style="background: white; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 1400px; margin: 0 auto; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(90deg, #805ad5 0%, #b794f6 100%); color: white; padding: 20px 30px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">AI-Powered Excel Analysis</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Intelligent mapping and data structure detection</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <!-- Analysis Status -->
              <div style="background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                  <span style="background: #38a169; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px;">✓</span>
                  <h3 style="margin: 0; color: #22543d; font-size: 18px;">Analysis Complete</h3>
                </div>
                <p style="margin: 0; color: #2f855a;">Successfully analyzed Cashflow_2025.xlsx and detected data structure with 95% confidence</p>
              </div>
              
              <!-- Mapping Results -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                <!-- Detected Structure -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #1a202c; font-size: 18px;">Detected Structure</h3>
                  <div style="space-y: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <span style="color: #4a5568; font-weight: 500;">Date Column:</span>
                      <span style="color: #805ad5; font-weight: 600;">Column A (Date)</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <span style="color: #4a5568; font-weight: 500;">Revenue:</span>
                      <span style="color: #38a169; font-weight: 600;">Column C (Income)</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <span style="color: #4a5568; font-weight: 500;">Expenses:</span>
                      <span style="color: #e53e3e; font-weight: 600;">Column D (Outflow)</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <span style="color: #4a5568; font-weight: 500;">Currency:</span>
                      <span style="color: #667eea; font-weight: 600;">USD Detected</span>
                    </div>
                  </div>
                </div>
                
                <!-- AI Confidence -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #1a202c; font-size: 18px;">AI Confidence Scores</h3>
                  <div style="space-y: 12px;">
                    <div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="color: #4a5568; font-size: 14px;">Date Detection</span>
                        <span style="color: #38a169; font-weight: 600;">98%</span>
                      </div>
                      <div style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="background: #38a169; height: 100%; width: 98%; border-radius: 3px;"></div>
                      </div>
                    </div>
                    <div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="color: #4a5568; font-size: 14px;">Revenue Mapping</span>
                        <span style="color: #38a169; font-weight: 600;">95%</span>
                      </div>
                      <div style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="background: #38a169; height: 100%; width: 95%; border-radius: 3px;"></div>
                      </div>
                    </div>
                    <div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="color: #4a5568; font-size: 14px;">Cost Mapping</span>
                        <span style="color: #38a169; font-weight: 600;">92%</span>
                      </div>
                      <div style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="background: #38a169; height: 100%; width: 92%; border-radius: 3px;"></div>
                      </div>
                    </div>
                    <div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="color: #4a5568; font-size: 14px;">Overall Structure</span>
                        <span style="color: #38a169; font-weight: 600;">95%</span>
                      </div>
                      <div style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="background: #38a169; height: 100%; width: 95%; border-radius: 3px;"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div style="display: flex; gap: 12px; justify-content: center;">
                <button style="background: #805ad5; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">Apply Mapping</button>
                <button style="background: #e2e8f0; color: #4a5568; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">Manual Edit</button>
                <button style="background: #fed7d7; color: #c53030; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">Re-analyze</button>
              </div>
            </div>
          </div>
        </div>
      `
    }
  ];

  for (const mockup of mockups) {
    console.log(`Creating ${mockup.name}...`);
    
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${mockup.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0;">
        ${mockup.content}
      </body>
      </html>
    `);
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for fonts to load
    
    await page.screenshot({
      path: path.join(__dirname, 'public/screenshots/', mockup.name),
      type: 'png',
      fullPage: true
    });
  }

  await browser.close();
  console.log('All dashboard mockups created successfully!');
}

createDashboardMockups().catch(console.error);