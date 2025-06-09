import puppeteer from 'puppeteer';
import { logger } from '../utils/logger';

export interface LegalContent {
  title: string;
  content: string;
  lastUpdated?: string;
}

export interface LegalPages {
  termsAndConditions?: LegalContent;
  privacyPolicy?: LegalContent;
  cookiePolicy?: LegalContent;
}

export class LegalContentService {
  private static cachedPages: LegalPages | null = null;
  private static lastScrapeTime: number = 0;
  private static readonly CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

  static async scrapeLegalContent(): Promise<LegalPages> {
    // Return cached data if recent
    if (this.cachedPages && Date.now() - this.lastScrapeTime < this.CACHE_DURATION) {
      logger.info('Returning cached legal content');
      return this.cachedPages;
    }

    logger.info('Scraping legal content from vort-ex.com');
    
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const legalPages: LegalPages = {};

      // Scrape Terms & Conditions
      try {
        const termsContent = await this.scrapePage(browser, 'https://www.vort-ex.com/terms');
        if (termsContent) {
          legalPages.termsAndConditions = termsContent;
        }
      } catch (error) {
        logger.warn('Failed to scrape terms page:', error);
      }

      // Scrape Privacy Policy
      try {
        const privacyContent = await this.scrapePage(browser, 'https://www.vort-ex.com/privacy-policy');
        if (privacyContent) {
          legalPages.privacyPolicy = privacyContent;
        }
      } catch (error) {
        logger.warn('Failed to scrape privacy page:', error);
      }

      // Scrape Cookie Policy
      try {
        const cookieContent = await this.scrapePage(browser, 'https://www.vort-ex.com/cookies');
        if (cookieContent) {
          legalPages.cookiePolicy = cookieContent;
        }
      } catch (error) {
        logger.warn('Failed to scrape cookie page:', error);
      }

      // Set fallback content if nothing was scraped
      if (!legalPages.termsAndConditions) {
        legalPages.termsAndConditions = this.getFallbackTerms();
      }
      if (!legalPages.privacyPolicy) {
        legalPages.privacyPolicy = this.getFallbackPrivacy();
      }
      if (!legalPages.cookiePolicy) {
        legalPages.cookiePolicy = this.getFallbackCookies();
      }

      this.cachedPages = legalPages;
      this.lastScrapeTime = Date.now();

      logger.info('Successfully scraped legal content');
      return legalPages;

    } catch (error: any) {
      logger.error('Error scraping legal content:', error);
      
      // Return fallback data
      const fallbackPages: LegalPages = {
        termsAndConditions: this.getFallbackTerms(),
        privacyPolicy: this.getFallbackPrivacy(),
        cookiePolicy: this.getFallbackCookies()
      };

      this.cachedPages = fallbackPages;
      this.lastScrapeTime = Date.now();
      
      return fallbackPages;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private static async scrapePage(browser: any, url: string): Promise<LegalContent | null> {
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForSelector('body', { timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const content = await page.evaluate(() => {
        // Get title
        const title = (document as any).querySelector('h1')?.textContent?.trim() || 
                     (document as any).title || 
                     'Legal Information';

        // Extract main content paragraphs
        const paragraphs = Array.from((document as any).querySelectorAll('p, div'))
          .map((el: any) => el.textContent?.trim())
          .filter((text: any) => text && text.length > 50)
          .filter((text: any) => !text.toLowerCase().includes('home'))
          .filter((text: any) => !text.toLowerCase().includes('services'))
          .filter((text: any) => !text.toLowerCase().includes('contact us'))
          .filter((text: any) => !text.toLowerCase().includes('english'))
          .slice(0, 10); // Limit to first 10 relevant paragraphs

        const content = paragraphs.join('\n\n');

        // Look for last updated date
        const allText = (document as any).body.innerText || '';
        const dateMatch = allText.match(/last updated:?\s*([^\n]+)/i) || 
                         allText.match(/effective date:?\s*([^\n]+)/i) ||
                         allText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        
        return {
          title,
          content: content || 'Content not available',
          lastUpdated: dateMatch ? dateMatch[1] : new Date().toLocaleDateString()
        };
      });

      return content;

    } catch (error) {
      logger.warn(`Failed to scrape ${url}:`, error);
      return null;
    } finally {
      await page.close();
    }
  }

  private static getFallbackTerms(): LegalContent {
    return {
      title: 'Terms and Conditions',
      content: `Welcome to Warren Financial Dashboard by Vortex.

These Terms and Conditions govern your use of our financial dashboard service.

By accessing or using Warren, you agree to be bound by these terms.

1. ACCEPTANCE OF TERMS
By using this service, you acknowledge that you have read, understood, and agree to be bound by these terms.

2. SERVICE DESCRIPTION
Warren is a financial dashboard tool designed for executive-level financial analysis and reporting.

3. USER RESPONSIBILITIES
- You are responsible for maintaining the confidentiality of your account
- You must use the service in compliance with applicable laws
- You may not share access with unauthorized users

4. INTELLECTUAL PROPERTY
All content and software are owned by Vortex and protected by intellectual property laws.

5. LIMITATION OF LIABILITY
Vortex shall not be liable for any indirect, incidental, or consequential damages.

6. TERMINATION
We reserve the right to terminate accounts for violation of these terms.

For questions, contact us at support@vort-ex.com.`,
      lastUpdated: new Date().toLocaleDateString()
    };
  }

  private static getFallbackPrivacy(): LegalContent {
    return {
      title: 'Privacy Policy',
      content: `Privacy Policy for Warren Financial Dashboard

At Vortex, we are committed to protecting your privacy and personal information.

INFORMATION WE COLLECT
- Account information (name, email, role)
- Financial data uploaded to the dashboard
- Usage analytics and system logs

HOW WE USE YOUR INFORMATION
- To provide and maintain the Warren service
- To analyze and improve system performance
- To communicate important updates

DATA SECURITY
- All data is encrypted in transit and at rest
- Access is restricted to authorized personnel only
- Regular security audits are conducted

DATA RETENTION
- Account data is retained while your account is active
- Financial data is retained according to your settings
- Logs are retained for security and analytical purposes

YOUR RIGHTS
- You can request access to your personal data
- You can request correction of inaccurate information
- You can request deletion of your account

CONTACT US
For privacy-related questions, contact privacy@vort-ex.com.`,
      lastUpdated: new Date().toLocaleDateString()
    };
  }

  private static getFallbackCookies(): LegalContent {
    return {
      title: 'Cookie Policy',
      content: `Cookie Policy for Warren Financial Dashboard

This policy explains how we use cookies and similar technologies.

WHAT ARE COOKIES
Cookies are small text files stored on your device when you visit our website.

TYPES OF COOKIES WE USE

Essential Cookies:
- Authentication tokens
- Session management
- Security features

Analytics Cookies:
- Usage statistics
- Performance monitoring
- Error tracking

Preference Cookies:
- Language settings
- Dashboard customizations
- User interface preferences

MANAGING COOKIES
You can control cookies through your browser settings:
- Chrome: Settings > Privacy and Security > Cookies
- Firefox: Preferences > Privacy & Security
- Safari: Preferences > Privacy

Note: Disabling essential cookies may affect functionality.

THIRD-PARTY COOKIES
We may use third-party services that set their own cookies for analytics and performance monitoring.

UPDATES TO THIS POLICY
We may update this policy periodically. Changes will be posted on this page.

For questions about cookies, contact support@vort-ex.com.`,
      lastUpdated: new Date().toLocaleDateString()
    };
  }

  static getCachedPages(): LegalPages | null {
    return this.cachedPages;
  }
}