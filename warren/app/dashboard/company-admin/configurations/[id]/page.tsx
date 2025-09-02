'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ConfigurationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const configId = params.id as string;

  // Redirect to edit page immediately - view page is redundant
  useEffect(() => {
    if (configId) {
      router.replace(`/dashboard/company-admin/configurations/${configId}/edit`);
    }
  }, [configId, router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-3 border-blue-600 rounded-full border-t-transparent mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to configuration editor...</p>
      </div>
    </div>
  );
}