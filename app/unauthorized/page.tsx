"use client";

import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { locale } = useLocale();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardBody className="text-center py-12">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {locale?.startsWith('es') ? 'Acceso No Autorizado' : 'Unauthorized Access'}
          </h1>
          
          <p className="text-gray-600 mb-8">
            {locale?.startsWith('es') 
              ? 'No tienes permisos para acceder a esta página.'
              : 'You do not have permission to access this page.'}
          </p>
          
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => router.push('/dashboard')}
            >
              {locale?.startsWith('es') ? 'Ir al Dashboard' : 'Go to Dashboard'}
            </Button>
            
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              {locale?.startsWith('es') ? 'Iniciar Sesión' : 'Sign In'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}