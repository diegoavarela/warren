import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { CompanyConfig } from './configurationService'

interface ScreenCapturePDFOptions {
  elementId: string
  fileName: string
  company: CompanyConfig
  title: string
  orientation?: 'portrait' | 'landscape'
  includeHeader?: boolean
  includeFooter?: boolean
}

export class ScreenCapturePDFService {
  /**
   * Captures the exact screen content and exports it as a PDF
   */
  public static async captureAndExport(options: ScreenCapturePDFOptions): Promise<void> {
    const {
      elementId,
      fileName,
      company,
      title,
      orientation = 'portrait',
      includeHeader = true,
      includeFooter = true
    } = options

    try {
      // Show loading indicator
      this.showLoadingOverlay()

      // Get the element to capture
      const element = document.getElementById(elementId)
      if (!element) {
        throw new Error(`Element with ID ${elementId} not found`)
      }

      // Prepare element for capture
      await this.prepareElementForCapture(element)

      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        scrollX: 0,
        scrollY: -window.scrollY,
        foreignObjectRendering: true,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Remove any elements that shouldn't be in the PDF
          const elementsToRemove = clonedDoc.querySelectorAll('.no-print, .pdf-hide')
          elementsToRemove.forEach(el => el.remove())
          
          // Ensure all images are loaded
          const images = clonedDoc.getElementsByTagName('img')
          Array.from(images).forEach(img => {
            if (!img.complete) {
              img.style.display = 'none'
            }
          })
        }
      })

      // Create PDF
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
        compress: true
      })

      // Calculate dimensions
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const contentWidth = pageWidth - (2 * margin)
      const contentHeight = pageHeight - (2 * margin) - (includeHeader ? 20 : 0) - (includeFooter ? 15 : 0)

      // Add header if requested
      if (includeHeader) {
        await this.addHeader(pdf, company, title, margin, pageWidth)
      }

      // Calculate image dimensions to fit the page
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(contentWidth / (imgWidth * 0.264583), contentHeight / (imgHeight * 0.264583))
      
      const scaledWidth = (imgWidth * 0.264583) * ratio
      const scaledHeight = (imgHeight * 0.264583) * ratio
      
      // Center the image on the page
      const xOffset = margin + (contentWidth - scaledWidth) / 2
      const yOffset = margin + (includeHeader ? 20 : 0)

      // Handle multi-page if content is too tall
      const totalPages = Math.ceil(scaledHeight / contentHeight)
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage()
          if (includeHeader) {
            await this.addHeader(pdf, company, title, margin, pageWidth)
          }
        }

        // Calculate the portion of image to show on this page
        const sourceY = (page * contentHeight / ratio) / 0.264583
        const sourceHeight = Math.min(contentHeight / ratio / 0.264583, imgHeight - sourceY)
        const pageImgHeight = sourceHeight * 0.264583 * ratio

        // Add the image portion
        pdf.addImage(
          imgData,
          'PNG',
          xOffset,
          yOffset,
          scaledWidth,
          pageImgHeight,
          undefined,
          'FAST',
          0
        )

        // Add footer if requested
        if (includeFooter) {
          this.addFooter(pdf, page + 1, totalPages, pageHeight, pageWidth)
        }
      }

      // Set document properties
      pdf.setProperties({
        title: `${company.name} - ${title}`,
        author: company.name,
        creator: 'Warren Financial Dashboard'
      })

      // Save the PDF
      pdf.save(fileName)

      // Restore element state
      this.restoreElementAfterCapture(element)

    } catch (error) {
      console.error('Failed to generate PDF:', error)
      throw error
    } finally {
      // Hide loading indicator
      this.hideLoadingOverlay()
    }
  }

  /**
   * Capture multiple elements and combine them into a single PDF
   */
  public static async captureMultipleElements(
    elementIds: string[],
    fileName: string,
    company: CompanyConfig,
    title: string
  ): Promise<void> {
    try {
      this.showLoadingOverlay()

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      })

      // Set document properties
      pdf.setProperties({
        title: `${company.name} - ${title}`,
        author: company.name,
        creator: 'Warren Financial Dashboard'
      })

      let firstPage = true

      for (const elementId of elementIds) {
        const element = document.getElementById(elementId)
        if (!element) continue

        if (!firstPage) {
          pdf.addPage()
        }
        firstPage = false

        // Capture element
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        })

        const imgData = canvas.toDataURL('image/png')
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const margin = 10
        
        const imgWidth = canvas.width
        const imgHeight = canvas.height
        const ratio = Math.min(
          (pageWidth - 2 * margin) / (imgWidth * 0.264583),
          (pageHeight - 2 * margin) / (imgHeight * 0.264583)
        )
        
        const scaledWidth = (imgWidth * 0.264583) * ratio
        const scaledHeight = (imgHeight * 0.264583) * ratio
        
        const xOffset = margin + ((pageWidth - 2 * margin) - scaledWidth) / 2
        const yOffset = margin

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, scaledWidth, scaledHeight)
      }

      pdf.save(fileName)

    } catch (error) {
      console.error('Failed to generate PDF:', error)
      throw error
    } finally {
      this.hideLoadingOverlay()
    }
  }

  private static async prepareElementForCapture(element: HTMLElement): Promise<void> {
    // Store original styles
    element.dataset.originalOverflow = element.style.overflow
    element.dataset.originalHeight = element.style.height
    element.dataset.originalMaxHeight = element.style.maxHeight
    
    // Expand element to show all content
    element.style.overflow = 'visible'
    element.style.height = 'auto'
    element.style.maxHeight = 'none'
    
    // Wait for any layout changes
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private static restoreElementAfterCapture(element: HTMLElement): void {
    // Restore original styles
    if (element.dataset.originalOverflow !== undefined) {
      element.style.overflow = element.dataset.originalOverflow
      delete element.dataset.originalOverflow
    }
    if (element.dataset.originalHeight !== undefined) {
      element.style.height = element.dataset.originalHeight
      delete element.dataset.originalHeight
    }
    if (element.dataset.originalMaxHeight !== undefined) {
      element.style.maxHeight = element.dataset.originalMaxHeight
      delete element.dataset.originalMaxHeight
    }
  }

  private static async addHeader(
    pdf: jsPDF,
    company: CompanyConfig,
    title: string,
    margin: number,
    pageWidth: number
  ): Promise<void> {
    // Add company logo if available
    if (company.logo) {
      try {
        // Add logo (you might need to handle logo loading differently)
        pdf.addImage(company.logo, 'PNG', margin, margin, 20, 20)
      } catch (error) {
        console.warn('Failed to add logo to PDF:', error)
      }
    }

    // Add company name and title
    pdf.setFontSize(16)
    pdf.setTextColor(company.primaryColor || '#1e40af')
    pdf.text(company.name, pageWidth / 2, margin + 5, { align: 'center' })
    
    pdf.setFontSize(12)
    pdf.setTextColor('#4b5563')
    pdf.text(title, pageWidth / 2, margin + 12, { align: 'center' })
    
    // Add separator line
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, margin + 18, pageWidth - margin, margin + 18)
  }

  private static addFooter(
    pdf: jsPDF,
    currentPage: number,
    totalPages: number,
    pageHeight: number,
    pageWidth: number
  ): void {
    const footerY = pageHeight - 10
    
    // Add page numbers
    pdf.setFontSize(10)
    pdf.setTextColor('#9ca3af')
    pdf.text(
      `Page ${currentPage} of ${totalPages}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    )
    
    // Add timestamp
    const timestamp = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    pdf.text(timestamp, pageWidth - 10, footerY, { align: 'right' })
  }

  private static showLoadingOverlay(): void {
    const overlay = document.createElement('div')
    overlay.id = 'pdf-loading-overlay'
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center'
    overlay.innerHTML = `
      <div class="bg-white rounded-lg p-6 shadow-xl">
        <div class="flex items-center space-x-3">
          <svg class="animate-spin h-8 w-8 text-violet-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-lg font-medium text-gray-900">Generating PDF...</span>
        </div>
        <p class="mt-2 text-sm text-gray-500">This may take a few moments</p>
      </div>
    `
    document.body.appendChild(overlay)
  }

  private static hideLoadingOverlay(): void {
    const overlay = document.getElementById('pdf-loading-overlay')
    if (overlay) {
      overlay.remove()
    }
  }
}