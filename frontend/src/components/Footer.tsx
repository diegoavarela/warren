import { useState, useEffect } from 'react';
import { VortexLogo } from './VortexLogo';

interface TeamInfo {
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

export function Footer() {
  const [_teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);

  useEffect(() => {
    fetchTeamInfo();
  }, []);

  const fetchTeamInfo = async () => {
    try {
      const response = await fetch('/api/team/info');
      if (response.ok) {
        const data = await response.json();
        setTeamInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch team info:', error);
      // Set fallback data
      setTeamInfo({
        companyName: 'Vortex',
        contactInfo: 'contact@vort-ex.com',
        description: 'Professional financial management solutions.',
        technologies: ['React', 'TypeScript', 'Node.js', 'Excel Analysis']
      });
    }
  };

  return (
    <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm">
            © 2025 Vortex LLC
          </div>
          
          {/* Center Links */}
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <a 
              href="/terms"
              className="text-gray-400 hover:text-green-400 transition-colors text-sm"
            >
              Terms & Conditions
            </a>
            <a 
              href="/privacy"
              className="text-gray-400 hover:text-green-400 transition-colors text-sm"
            >
              Privacy Policy
            </a>
            <a 
              href="/cookies"
              className="text-gray-400 hover:text-green-400 transition-colors text-sm"
            >
              Manage Cookies
            </a>
          </div>

          {/* Powered by Vortex */}
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <span className="text-gray-400 text-sm">Powered by</span>
            <VortexLogo className="h-6 w-6" />
            <span className="text-green-400 font-medium text-sm">Vortex</span>
          </div>
        </div>
      </div>
    </footer>
  );
}