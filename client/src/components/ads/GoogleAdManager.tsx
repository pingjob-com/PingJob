import { useEffect, useRef, useState } from 'react';

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
    size: ['fluid'],
    style: { minHeight: '100px', width: '100%' }
  },
  medium_rectangle: {
    slotPath: '/23331199163/medium_ractangle',
    size: [[300, 250]],
    style: { minWidth: '300px', minHeight: '250px' }
  },
  leaderboard: {
    slotPath: '/23331199163/leaderboard',
    size: [[728, 90]],
    style: { minWidth: '728px', minHeight: '90px' }
  },
  wide_skyscraper: {
    slotPath: '/23331199163/wide_skycraper',
    size: [[160, 600]],
    style: { minWidth: '160px', minHeight: '600px' }
  }
};

let globalSlotCounter = 0;

export default function GoogleAdManager({ slotType, className = '' }: GoogleAdManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<any>(null);
  const [divId] = useState(() => `gpt-ad-${slotType}-${++globalSlotCounter}-${Date.now()}`);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    
    const config = AD_CONFIG[slotType];
    
    if (typeof window === 'undefined') return;
    
    window.googletag = window.googletag || { cmd: [] };

    window.googletag.cmd.push(() => {
      try {
        if (!slotRef.current) {
          slotRef.current = window.googletag.defineSlot(
            config.slotPath,
            config.size,
            divId
          );
          
          if (slotRef.current) {
            slotRef.current.addService(window.googletag.pubads());
            window.googletag.display(divId);
            window.googletag.pubads().refresh([slotRef.current]);
            isInitialized.current = true;
          }
        }
      } catch (error) {
        console.error('GAM slot error:', error);
      }
    });

    return () => {
      if (slotRef.current && window.googletag) {
        window.googletag.cmd.push(() => {
          try {
            window.googletag.destroySlots([slotRef.current]);
            slotRef.current = null;
            isInitialized.current = false;
          } catch (error) {
          }
        });
      }
    };
  }, [slotType, divId]);

  const config = AD_CONFIG[slotType];

  return (
    <div 
      ref={containerRef}
      id={divId}
      className={className}
      style={config.style}
    />
  );
}
