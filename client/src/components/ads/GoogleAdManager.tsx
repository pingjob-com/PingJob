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

const AD_CONFIG: Record<AdSlotType, {
  slotPath: string;
  sizes: (number[] | string)[];
  style: React.CSSProperties;
}> = {
  responsive_in_feed: {
    slotPath: '/23331199163/responsive_in-feed',
    sizes: [[970, 90], [728, 90], [320, 100], [320, 50]],
    style: { minHeight: '100px', width: '100%' }
  },
  medium_rectangle: {
    slotPath: '/23331199163/medium_ractangle',
    sizes: [[300, 250]],
    style: { minWidth: '300px', minHeight: '250px' }
  },
  leaderboard: {
    slotPath: '/23331199163/leaderboard',
    sizes: [[728, 90], [320, 50]],
    style: { minHeight: '90px', width: '100%' }
  },
  wide_skyscraper: {
    slotPath: '/23331199163/wide_skycraper',
    sizes: [[160, 600]],
    style: { minWidth: '160px', minHeight: '600px' }
  }
};

let instanceCounter = 0;

export default function GoogleAdManager({ slotType, className = '' }: GoogleAdManagerProps) {
  const [divId] = useState(() => {
    instanceCounter++;
    return `gam-${slotType.replace(/_/g, '-')}-${Date.now()}-${instanceCounter}`;
  });
  const slotRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const config = AD_CONFIG[slotType];
    
    if (typeof window === 'undefined') return;
    
    window.googletag = window.googletag || { cmd: [] };

    const initAd = () => {
      window.googletag.cmd.push(function() {
        try {
          const container = document.getElementById(divId);
          if (!container) {
            console.log('GAM: Container not found:', divId);
            return;
          }

          const existingSlots = window.googletag.pubads().getSlots();
          const existingSlot = existingSlots.find((s: any) => s.getSlotElementId() === divId);
          
          if (existingSlot) {
            console.log('GAM: Refreshing existing slot:', divId);
            window.googletag.pubads().refresh([existingSlot]);
            return;
          }

          console.log('GAM: Defining new slot:', config.slotPath, 'sizes:', config.sizes, 'divId:', divId);
          
          const slot = window.googletag.defineSlot(
            config.slotPath,
            config.sizes,
            divId
          );

          if (!slot) {
            console.log('GAM: Failed to define slot');
            return;
          }

          if (slotType === 'responsive_in_feed' || slotType === 'leaderboard') {
            const mapping = window.googletag.sizeMapping()
              .addSize([970, 0], [[970, 90], [728, 90]])
              .addSize([728, 0], [[728, 90]])
              .addSize([0, 0], [[320, 100], [320, 50]])
              .build();
            slot.defineSizeMapping(mapping);
            console.log('GAM: Size mapping applied');
          }

          slot.addService(window.googletag.pubads());
          slotRef.current = slot;

          window.googletag.display(divId);
          console.log('GAM: Display called for:', divId);

        } catch (error) {
          console.error('GAM error:', error);
        }
      });
    };

    const timer = setTimeout(initAd, 100);

    return () => {
      clearTimeout(timer);
      if (slotRef.current && window.googletag && window.googletag.destroySlots) {
        window.googletag.cmd.push(function() {
          try {
            window.googletag.destroySlots([slotRef.current]);
            slotRef.current = null;
          } catch (e) {
            console.error('GAM cleanup error:', e);
          }
        });
      }
    };
  }, [slotType, divId]);

  const config = AD_CONFIG[slotType];

  return (
    <div 
      ref={containerRef}
      className={`w-full flex justify-center ${className}`}
      style={{ width: '100%', minWidth: '320px' }}
    >
      <div 
        id={divId}
        className="gam-ad-container"
        style={{
          ...config.style,
          display: 'block',
          textAlign: 'center',
          minWidth: '320px'
        }}
        data-ad-slot={slotType}
      />
    </div>
  );
}
