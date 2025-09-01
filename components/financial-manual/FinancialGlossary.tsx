"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  MagnifyingGlassIcon, 
  BookOpenIcon, 
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { useTranslations } from '@/lib/locales/loader';
import { useLocaleText } from '@/hooks/useLocaleText';

interface FinancialGlossaryProps {
  locale: string;
}

interface GlossaryTerm {
  term: string;
  definition: string;
  example: string;
}

export function FinancialGlossary({ locale }: FinancialGlossaryProps) {
  const { t, loading } = useTranslations(locale, 'financial-manual');
  const { t: commonT } = useLocaleText();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-12 bg-gray-200 rounded w-full"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const glossaryData = (t('glossary') || { title: '', terms: [] }) as { title: string; terms: GlossaryTerm[] };
  const terms = glossaryData?.terms || [];

  // Filter terms based on search
  const filteredTerms = terms.filter(term =>
    term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    term.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group terms by first letter for better organization
  const groupedTerms = filteredTerms.reduce((groups, term) => {
    const firstLetter = term.term.charAt(0).toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(term);
    return groups;
  }, {} as Record<string, GlossaryTerm[]>);

  const sortedLetters = Object.keys(groupedTerms).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full p-3">
            <BookOpenIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {glossaryData.title || commonT('Financial Glossary', 'Glosario Financiero')}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {commonT(
            'Quick reference for financial terms and concepts to help you better understand your business metrics.',
            'Referencia rápida para términos y conceptos financieros para ayudarte a entender mejor las métricas de tu negocio.'
          )}
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardBody className="p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={commonT('Search financial terms...', 'Buscar términos financieros...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </CardBody>
      </Card>

      {/* Results Summary */}
      {searchTerm && (
        <div className="text-sm text-gray-600">
          {commonT(
            `Found ${filteredTerms.length} term${filteredTerms.length !== 1 ? 's' : ''} matching "${searchTerm}"`,
            `Encontrados ${filteredTerms.length} término${filteredTerms.length !== 1 ? 's' : ''} que coinciden con "${searchTerm}"`
          )}
        </div>
      )}

      {/* No Results */}
      {filteredTerms.length === 0 && searchTerm && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardBody className="text-center p-8">
            <MagnifyingGlassIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              {commonT('No terms found', 'No se encontraron términos')}
            </h3>
            <p className="text-yellow-800">
              {commonT(
                'Try a different search term or browse all available terms below.',
                'Prueba un término de búsqueda diferente o navega todos los términos disponibles abajo.'
              )}
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchTerm('')}
              className="mt-4"
            >
              {commonT('Clear search', 'Limpiar búsqueda')}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Terms List */}
      <div className="space-y-6">
        {sortedLetters.map(letter => (
          <div key={letter}>
            {/* Letter Header */}
            <div className="flex items-center mb-4">
              <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                <span className="text-indigo-600 font-bold text-sm">{letter}</span>
              </div>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Terms for this letter */}
            <div className="space-y-4">
              {groupedTerms[letter].map((term, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardBody className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="bg-indigo-50 rounded-full p-2 mt-1">
                        <LightBulbIcon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {term.term}
                        </h3>
                        <p className="text-gray-700 mb-3">
                          {term.definition}
                        </p>
                        <div className="bg-indigo-50 rounded-lg p-3 border-l-4 border-indigo-400">
                          <p className="text-sm text-indigo-800">
                            <strong>{commonT('Example', 'Ejemplo')}:</strong> {term.example}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Help Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardBody className="text-center p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {commonT('Need More Help?', '¿Necesitas Más Ayuda?')}
          </h3>
          <p className="text-gray-600 mb-4">
            {commonT(
              'If you can\'t find a term you\'re looking for, try asking our AI assistant for definitions and explanations.',
              'Si no puedes encontrar un término que buscas, prueba preguntando a nuestro asistente de IA por definiciones y explicaciones.'
            )}
          </p>
          <div className="flex justify-center space-x-4">
            <Button
              variant="primary"
              onClick={() => {
                const companyId = sessionStorage.getItem('selectedCompanyId');
                if (companyId) {
                  sessionStorage.setItem('selectedCompanyId', companyId);
                  window.location.href = '/dashboard/company-admin/financial-chat';
                } else {
                  window.location.href = '/dashboard/company-admin';
                }
              }}
            >
              {commonT('Ask AI Assistant', 'Preguntar al Asistente IA')}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              {commonT('Go Back', 'Volver')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}