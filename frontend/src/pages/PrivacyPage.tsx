import { useState, useEffect } from 'react';
import { VortexLogo } from '../components/VortexLogo';

interface LegalContent {
  title: string;
  content: string;
  lastUpdated?: string;
}

export function PrivacyPage() {
  const [privacy, setPrivacy] = useState<LegalContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrivacy();
  }, []);

  const fetchPrivacy = async () => {
    try {
      const response = await fetch('/api/legal/privacy');
      if (response.ok) {
        const data = await response.json();
        setPrivacy(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch privacy policy:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-vortex-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <VortexLogo variant="horizontal" size="lg" className="mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {privacy?.title || 'Privacy Policy'}
          </h1>
          {privacy?.lastUpdated && (
            <p className="text-gray-600">
              Last updated: {privacy.lastUpdated}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 md:p-12">
          <div className="prose prose-lg max-w-none">
            {privacy?.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-6 text-gray-700 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-12">
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-vortex-green text-white rounded-lg hover:bg-vortex-green-dark transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}