"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import PracticalHybridTester from "@/components/PracticalHybridTester";
import { BeakerIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

function HybridParserTestPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useAuth();

  const handleTestingComplete = (results: any[], validatedAccounts: any[]) => {
    // Find the best model based on validation results
    const bestResult = results[0]; // For now, just use first result
    
    // Store results and navigate to dashboard
    sessionStorage.setItem('hybridParserResult', JSON.stringify({
      fileName: 'practical-test-results.xlsx',
      classifications: bestResult.classifications,
      model: bestResult.model,
      confidence: 90, // Based on validation
      validatedAccounts: validatedAccounts
    }));

    router.push('/dashboard/company-admin/pnl');
  };

  return (
    <ProtectedRoute>
      <PracticalHybridTester onComplete={handleTestingComplete} />
    </ProtectedRoute>
  );
}

export default HybridParserTestPage;