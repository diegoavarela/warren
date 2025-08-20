/**
 * Smart Layout Detector
 * 
 * Advanced layout detection and optimization for dashboard cards.
 * Ensures optimal display across different screen sizes and data ranges.
 */

import React from 'react';

export interface LayoutConstraints {
  cardWidth: number;
  cardHeight: number;
  maxTextLength: number;
  viewportWidth: number;
  viewportHeight: number;
  gridColumns: number;
}

export interface LayoutMetrics {
  textOverflow: boolean;
  cardOverflow: boolean;
  readabilityScore: number; // 0-1
  optimalFontSize: number;
  recommendedUnits: 'normal' | 'K' | 'M' | 'B';
  layoutAdjustments: string[];
}

export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

export class SmartLayoutDetector {
  private static readonly BREAKPOINTS: ResponsiveBreakpoints = {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
    wide: 1280
  };

  private static readonly OPTIMAL_CARD_RATIOS = {
    mobile: { width: 280, height: 120 },
    tablet: { width: 320, height: 140 },
    desktop: { width: 360, height: 160 },
    wide: { width: 400, height: 180 }
  };

  /**
   * Detect current viewport size and return device category
   */
  static detectViewport(): keyof ResponsiveBreakpoints {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    
    if (width < this.BREAKPOINTS.mobile) return 'mobile';
    if (width < this.BREAKPOINTS.tablet) return 'tablet';
    if (width < this.BREAKPOINTS.desktop) return 'desktop';
    return 'wide';
  }

  /**
   * Calculate optimal card dimensions for current viewport
   */
  static getOptimalCardSize(viewport?: keyof ResponsiveBreakpoints): { width: number; height: number } {
    const device = viewport || this.detectViewport();
    return this.OPTIMAL_CARD_RATIOS[device];
  }

  /**
   * Analyze layout metrics for a given text content and constraints
   */
  static analyzeLayout(
    text: string,
    value: number,
    constraints: LayoutConstraints
  ): LayoutMetrics {
    const fontSize = this.calculateOptimalFontSize(text, constraints);
    const textMetrics = this.measureText(text, fontSize);
    
    const textOverflow = textMetrics.width > constraints.cardWidth * 0.9;
    const cardOverflow = textMetrics.height > constraints.cardHeight * 0.8;
    
    const readabilityScore = this.calculateReadabilityScore(
      text, 
      fontSize, 
      textMetrics, 
      constraints
    );
    
    const recommendedUnits = this.recommendUnitsForLayout(value, constraints);
    const layoutAdjustments = this.generateLayoutAdjustments(
      textOverflow,
      cardOverflow,
      readabilityScore,
      constraints
    );

    return {
      textOverflow,
      cardOverflow,
      readabilityScore,
      optimalFontSize: fontSize,
      recommendedUnits,
      layoutAdjustments
    };
  }

  /**
   * Calculate optimal font size for given text and constraints
   */
  private static calculateOptimalFontSize(
    text: string,
    constraints: LayoutConstraints
  ): number {
    const baseSize = constraints.cardWidth < 300 ? 16 : 20;
    const lengthAdjustment = Math.max(0.7, 1 - (text.length / 20));
    
    return Math.round(baseSize * lengthAdjustment);
  }

  /**
   * Measure text dimensions (simplified calculation)
   */
  private static measureText(text: string, fontSize: number): { width: number; height: number } {
    // Approximate text width calculation
    const charWidth = fontSize * 0.6; // Average character width ratio
    const width = text.length * charWidth;
    const height = fontSize * 1.2; // Line height
    
    return { width, height };
  }

  /**
   * Calculate readability score based on multiple factors
   */
  private static calculateReadabilityScore(
    text: string,
    fontSize: number,
    textMetrics: { width: number; height: number },
    constraints: LayoutConstraints
  ): number {
    let score = 1.0;
    
    // Penalize for text overflow
    if (textMetrics.width > constraints.cardWidth * 0.9) {
      score -= 0.3;
    }
    
    // Penalize for too small font size
    if (fontSize < 14) {
      score -= 0.2;
    }
    
    // Penalize for too large font size
    if (fontSize > 24) {
      score -= 0.1;
    }
    
    // Penalize for very long text
    if (text.length > 15) {
      score -= 0.2;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Recommend optimal units based on layout constraints
   */
  private static recommendUnitsForLayout(
    value: number,
    constraints: LayoutConstraints
  ): 'normal' | 'K' | 'M' | 'B' {
    const absValue = Math.abs(value);
    const isSmallCard = constraints.cardWidth < 300;
    
    if (isSmallCard) {
      // Prefer shorter representations for small cards
      if (absValue >= 1000000000) return 'B';
      if (absValue >= 1000000) return 'M';
      if (absValue >= 10000) return 'K';
      return 'normal';
    } else {
      // Standard recommendations for larger cards
      if (absValue >= 1000000000) return 'B';
      if (absValue >= 1000000) return 'M';
      if (absValue >= 100000) return 'K';
      return 'normal';
    }
  }

  /**
   * Generate specific layout adjustment recommendations
   */
  private static generateLayoutAdjustments(
    textOverflow: boolean,
    cardOverflow: boolean,
    readabilityScore: number,
    constraints: LayoutConstraints
  ): string[] {
    const adjustments: string[] = [];
    
    if (textOverflow) {
      adjustments.push('Consider shorter units (K, M, B)');
      adjustments.push('Reduce font size');
    }
    
    if (cardOverflow) {
      adjustments.push('Increase card height');
      adjustments.push('Use multi-line layout');
    }
    
    if (readabilityScore < 0.6) {
      adjustments.push('Improve text readability');
      adjustments.push('Optimize font size');
    }
    
    if (constraints.cardWidth < 280) {
      adjustments.push('Consider compact card layout');
    }
    
    return adjustments;
  }

  /**
   * Generate responsive grid layout based on viewport
   */
  static generateResponsiveGrid(itemCount: number): {
    mobile: string;
    tablet: string;
    desktop: string;
  } {
    if (itemCount <= 2) {
      return {
        mobile: 'grid-cols-1',
        tablet: 'grid-cols-2',
        desktop: 'grid-cols-2'
      };
    } else if (itemCount <= 4) {
      return {
        mobile: 'grid-cols-1',
        tablet: 'grid-cols-2',
        desktop: 'grid-cols-2 lg:grid-cols-4'
      };
    } else if (itemCount <= 6) {
      return {
        mobile: 'grid-cols-1',
        tablet: 'grid-cols-2',
        desktop: 'grid-cols-3'
      };
    } else {
      return {
        mobile: 'grid-cols-1',
        tablet: 'grid-cols-2',
        desktop: 'grid-cols-3 xl:grid-cols-4'
      };
    }
  }

  /**
   * Real-time layout monitoring hook data
   */
  static createLayoutMonitor() {
    if (typeof window === 'undefined') return null;
    
    return {
      observe: (element: HTMLElement, callback: (metrics: LayoutMetrics) => void) => {
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            const text = element.textContent || '';
            const value = parseFloat(text.replace(/[^0-9.-]/g, '')) || 0;
            
            const constraints: LayoutConstraints = {
              cardWidth: width,
              cardHeight: height,
              maxTextLength: 15,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              gridColumns: 3
            };
            
            const metrics = this.analyzeLayout(text, value, constraints);
            callback(metrics);
          }
        });
        
        resizeObserver.observe(element);
        
        return () => resizeObserver.disconnect();
      }
    };
  }
}

/**
 * Hook-style utility for React components
 */
export function useSmartLayout(
  ref: React.RefObject<HTMLElement>,
  value: number,
  text: string,
  onLayoutChange?: (metrics: LayoutMetrics) => void
) {
  if (typeof window === 'undefined') return null;
  
  const monitor = SmartLayoutDetector.createLayoutMonitor();
  
  React.useEffect(() => {
    if (!monitor || !ref.current) return;
    
    const cleanup = monitor.observe(ref.current, (metrics) => {
      onLayoutChange?.(metrics);
    });
    
    return cleanup;
  }, [monitor, ref, value, text, onLayoutChange]);
  
  return SmartLayoutDetector.detectViewport();
}