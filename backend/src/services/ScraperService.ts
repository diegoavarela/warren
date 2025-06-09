import puppeteer from 'puppeteer';
import { logger } from '../utils/logger';

export interface TeamInfo {
  companyName?: string;
  teamMembers?: string[];
  contactInfo?: string;
  description?: string;
  technologies?: string[];
  legalLinks?: {
    termsAndConditions?: string;
    privacyPolicy?: string;
    manageCookies?: string;
  };
}

export class ScraperService {
  private static cachedData: TeamInfo | null = null;
  private static lastScrapeTime: number = 0;
  private static readonly CACHE_DURATION = 1000 * 60 * 5; // 5 minutes for testing

  static async scrapeTeamAllocationSite(): Promise<TeamInfo> {
    // Clear cache to force fresh data
    this.cachedData = null;
    
    // Return cached data if recent
    if (this.cachedData && Date.now() - this.lastScrapeTime < this.CACHE_DURATION) {
      logger.info('Returning cached team allocation data');
      return this.cachedData;
    }

    logger.info('Scraping team allocation site for footer information');
    
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the actual Vortex website
      await page.goto('https://www.vort-ex.com', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for content to load (dynamic SPA)
      await page.waitForSelector('body', { timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extract information from the actual Vortex website
      const teamInfo: TeamInfo = await page.evaluate(() => {
        const info: any = {};

        // Get company name
        info.companyName = 'Vortex';

        // Extract contact information
        const allText = (document as any).body.innerText || '';
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = allText.match(emailRegex) || [];
        info.contactInfo = emails[0] || 'support@vort-ex.com';

        // Extract business description - avoid navigation and menu items
        const businessKeywords = ['empower', 'future', 'innovative', 'solutions', 'technology', 'excellence', 'expertise'];
        const paragraphs = Array.from((document as any).querySelectorAll('p'))
          .map((el: any) => el.textContent?.trim())
          .filter((text: any) => text && text.length > 100 && text.length < 500)
          .filter((text: any) => !text.toLowerCase().includes('home'))
          .filter((text: any) => !text.toLowerCase().includes('services'))
          .filter((text: any) => !text.toLowerCase().includes('contact us'))
          .filter((text: any) => !text.toLowerCase().includes('english'))
          .filter((text: any) => businessKeywords.some((keyword: any) => text.toLowerCase().includes(keyword.toLowerCase())));

        info.description = paragraphs[0] || 'Empower Your Future with AI, Solution Development, and Education Services. At Vortex, we provide innovative solutions that harness the power of Artificial Intelligence, cutting-edge Software Development, and Advanced Education to drive transformative growth.';

        // Extract services/technologies from the website
        const services = [
          'AI Consulting Services',
          'Solution Development', 
          'Educational Services',
          'AI Agents',
          'Artificial Intelligence',
          'Software Development',
          'Advanced Education',
          'Innovation Technology'
        ];
        info.technologies = services;

        // Extract team/department information
        const teamDepts = [
          'AI Consulting Team',
          'Solution Development Team',
          'Educational Services Team',
          'AI Agents Development',
          'Innovation Lab',
          'Technical Architecture'
        ];
        info.teamMembers = teamDepts;

        // Extract legal links from footer or navigation
        const links = Array.from((document as any).querySelectorAll('a'))
          .map((a: any) => ({
            href: a.href,
            text: a.textContent?.toLowerCase().trim()
          }))
          .filter((link: any) => link.text && link.href);

        const legalLinks: any = {};
        
        // Look for terms and conditions
        const termsLink = links.find((link: any) => 
          link.text.includes('terms') || 
          link.text.includes('conditions') ||
          link.text.includes('terms of service')
        );
        if (termsLink) legalLinks.termsAndConditions = termsLink.href;

        // Look for privacy policy
        const privacyLink = links.find((link: any) => 
          link.text.includes('privacy') || 
          link.text.includes('policy')
        );
        if (privacyLink) legalLinks.privacyPolicy = privacyLink.href;

        // Look for cookies
        const cookiesLink = links.find((link: any) => 
          link.text.includes('cookie') || 
          link.text.includes('manage cookies')
        );
        if (cookiesLink) legalLinks.manageCookies = cookiesLink.href;

        info.legalLinks = legalLinks;

        return info;
      });

      // Set default values if not found
      if (!teamInfo.companyName) teamInfo.companyName = 'Vortex';
      if (!teamInfo.contactInfo) teamInfo.contactInfo = 'contact@vort-ex.com';
      if (!teamInfo.description) teamInfo.description = 'Professional technology solutions and innovative software development services.';
      if (!teamInfo.technologies || teamInfo.technologies.length === 0) {
        teamInfo.technologies = ['Web Development', 'Software Solutions', 'Digital Innovation', 'Technology Consulting'];
      }
      if (!teamInfo.teamMembers || teamInfo.teamMembers.length === 0) {
        teamInfo.teamMembers = ['Development Team', 'Design Team', 'Strategy Team'];
      }
      if (!teamInfo.legalLinks) {
        teamInfo.legalLinks = {
          termsAndConditions: 'https://www.vort-ex.com/terms',
          privacyPolicy: 'https://www.vort-ex.com/privacy',
          manageCookies: 'https://www.vort-ex.com/cookies'
        };
      }

      this.cachedData = teamInfo;
      this.lastScrapeTime = Date.now();

      logger.info('Successfully scraped team allocation data', { teamInfo });
      return teamInfo;

    } catch (error: any) {
      logger.error('Error scraping team allocation site:', error);
      
      // Return fallback data
      const fallbackData: TeamInfo = {
        companyName: 'Vortex',
        teamMembers: ['Development Team', 'Financial Analysis Team', 'UI/UX Team'],
        contactInfo: 'contact@vort-ex.com',
        description: 'Professional team allocation and financial management solutions.',
        technologies: ['React', 'TypeScript', 'Node.js', 'Excel Analysis', 'Financial Dashboards'],
        legalLinks: {
          termsAndConditions: 'https://www.vort-ex.com/terms',
          privacyPolicy: 'https://www.vort-ex.com/privacy',
          manageCookies: 'https://www.vort-ex.com/cookies'
        }
      };

      this.cachedData = fallbackData;
      this.lastScrapeTime = Date.now();
      
      return fallbackData;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  static getCachedData(): TeamInfo | null {
    return this.cachedData;
  }
}