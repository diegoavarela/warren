const puppeteer = require('puppeteer');

async function captureSimple() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });

  try {
    const page = await browser.newPage();
    
    // Create a simplified company admin mockup with our AI chat section
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Company Admin - VTEX Solutions SRL</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50">
      <div class="container mx-auto px-4 py-4">
        <div class="mb-4">
          <h1 class="text-3xl font-bold text-gray-900">Administración de VTEX Solutions SRL</h1>
          <p class="text-gray-600 mt-2">Gestionando VTEX Solutions SRL • Tecnología</p>
        </div>

        <div class="space-y-6">
          <!-- AI Financial Chat Card - Compact -->
          <div class="border-2 border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <div class="w-6 h-6 text-purple-600 mr-2">💬</div>
                <h3 class="text-xl font-semibold text-gray-900">Chat Financiero con IA</h3>
              </div>
              <div class="flex items-center space-x-3 text-sm">
                <span class="bg-white px-3 py-2 rounded-lg border border-purple-200 font-medium">
                  <span class="font-bold text-purple-600 text-lg">5</span> 
                  <span class="text-gray-700 ml-1">Estados</span>
                </span>
                <span class="font-bold text-base text-green-600">
                  P&L <span class="text-lg">✓</span>
                </span>
                <span class="font-bold text-base text-gray-400">
                  CF <span class="text-lg">-</span>
                </span>
                <span class="text-sm px-3 py-2 rounded-lg font-medium bg-green-100 text-green-700">
                  GPT-4o
                </span>
              </div>
            </div>

            <div class="flex gap-3 items-center">
              <button class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center">
                💬 Abrir Chat IA
              </button>
              <div class="flex-1">
                <p class="text-xs text-gray-600">Pregunta sobre ingresos, gastos, tendencias y análisis</p>
              </div>
            </div>
          </div>

          <!-- P&L and Cash Flow Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- P&L Column -->
            <div class="border-2 border-blue-100 rounded-xl p-6">
              <div class="flex items-center mb-4">
                <div class="w-8 h-8 text-blue-600 mr-3">📊</div>
                <h3 class="text-xl font-semibold text-gray-900">Dashboard P&L</h3>
              </div>
              <div class="border-l-4 border-blue-500 pl-4 space-y-2 mb-4">
                <div class="text-sm text-gray-600"><strong>Última subida:</strong> 27 de jul de 2025</div>
                <div class="text-sm text-gray-600"><strong>Período:</strong> Jan-25 - Jul-25</div>
                <div class="text-sm text-gray-600"><strong>Plantilla:</strong> Standard Template v1.0</div>
              </div>
              <div class="flex gap-3">
                <button class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg">Ver Dashboard</button>
                <button class="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">Subir Nuevos Datos</button>
              </div>
            </div>

            <!-- Cash Flow Column -->
            <div class="border-2 border-green-100 rounded-xl p-6">
              <div class="flex items-center mb-4">
                <div class="w-8 h-8 text-green-600 mr-3">💰</div>
                <h3 class="text-xl font-semibold text-gray-900">Dashboard Cash Flow</h3>
              </div>
              <div class="text-center py-6">
                <div class="text-gray-500 mb-4">No hay datos subidos aún</div>
                <button class="bg-green-600 text-white px-4 py-2 rounded-lg">Subir Datos</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    await page.setContent(htmlContent);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshots
    await page.screenshot({ 
      path: '/Users/diegovarela/AI Agents/warren-v2/screenshots/mockup-company-admin.png',
      fullPage: true
    });

    console.log('Screenshot saved: screenshots/mockup-company-admin.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureSimple();