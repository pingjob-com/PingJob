import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    googletag: any;
  }
}

export type AdSlotType = 'responsive_in_feed' | 'medium_rectangle' | 'leaderboard' | 'wide_skyscraper';

interface GoogleAdManagerProps {
  slotType: AdSlotType;
  className?: string;
}

const AD_CONFIG = {
  responsive_in_feed: {
    slotPath: '/23331199163/responsive_in-feed',
    size: 'fluid' as const,
    divId: 'div-gpt-ad-responsive-in-feed',
    style: { minHeight: '100px', width: '100%' }
  },
  medium_rectangle: {
    slotPath: '/23331199163/medium_ractangle',
    size: [300, 250] as [number, number],
    divId: 'div-gpt-ad-medium-rectangle',
    style: { minWidth: '300px', minHeight: '250px' }
  },
  leaderboard: {
    slotPath: '/23331199163/leaderboard',
    size: [728, 90] as [number, number],
    divId: 'div-gpt-ad-leaderboard',
    style: { minWidth: '728px', minHeight: '90px' }
  },
  wide_skyscraper: {
    slotPath: '/23331199163/wide_skycraper',
    size: [160, 600] as [number, number],
    divId: 'div-gpt-ad-wide-skyscraper',
    style: { minWidth: '160px', minHeight: '600px' }
  }
};

let slotCounter = 0;

export default function GoogleAdManager({ slotType, className = '' }: GoogleAdManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<any>(null);
  const uniqueId = useRef(`${AD_CONFIG[slotType].divId}-${++slotCounter}`);

  useEffect(() => {
    const config = AD_CONFIG[slotType];
    
    if (typeof window === 'undefined' || !window.googletag) {
      return;
    }

    window.googletag.cmd.push(() => {
      try {
        if (slotRef.current) {
          window.googletag.destroySlots([slotRef.current]);
        }

        const size = config.size === 'fluid' ? ['fluid'] : config.size;
        slotRef.current = window.googletag.defineSlot(
          config.slotPath,
          size,
          uniqueId.current
        );
        
        if (slotRef.current) {
          slotRef.current.addService(window.googletag.pubads());
          window.googletag.display(uniqueId.current);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('GAM error:', error);
        }
      }
    });

    return () => {
      if (slotRef.current && window.googletag) {
        window.googletag.cmd.push(() => {
          try {
            window.googletag.destroySlots([slotRef.current]);
            slotRef.current = null;
          } catch (error) {
            // Ignore cleanup errors
          }
        });
      }
    };
  }, [slotType]);

  const config = AD_CONFIG[slotType];

  if (import.meta.env.DEV) {
    return (
      <div 
        className={`bg-blue-50 border-2 border-dashed border-blue-300 flex items-center justify-center min-h-[100px] w-full rounded-lg ${className}`}
        style={config.style}
      >
        <span className="text-blue-600 text-sm font-medium">
          📊 Google Ad Manager: {slotType}
        </span>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      id={uniqueId.current}
      className={className}
      style={config.style}
    />
  );
}

export function initializeGAM() {
  if (typeof window === 'undefined') return;

  window.googletag = window.googletag || { cmd: [] };
  
  if (!document.querySelector('script[src*="securepubads.g.doubleclick.net"]')) {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }

  window.googletag.cmd.push(() => {
    window.googletag.pubads().enableSingleRequest();
    window.googletag.pubads().collapseEmptyDivs();
    window.googletag.enableServices();
  });
}
