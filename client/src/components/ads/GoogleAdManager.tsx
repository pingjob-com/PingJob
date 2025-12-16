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
    sizes: ['fluid', [970, 90], [728, 90], [320, 100], [320, 50]],
    style: { minHeight: '90px', width: '100%' }
  },
  medium_rectangle: {
    slotPath: '/23331199163/medium_ractangle',
    sizes: [[300, 250]],
    style: { minWidth: '300px', minHeight: '250px' }
  },
  leaderboard: {
    slotPath: '/23331199163/leaderboard',
    sizes: [[728, 90]],
    style: { minWidth: '728px', minHeight: '90px' }
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
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const config = AD_CONFIG[slotType];
    
    if (typeof window === 'undefined') return;
    
    window.googletag = window.googletag || { cmd: [] };

    window.googletag.cmd.push(function() {
      try {
        const container = document.getElementById(divId);
        if (!container) {
          return;
        }

        const existingSlots = window.googletag.pubads().getSlots();
        const existingSlot = existingSlots.find((s: any) => s.getSlotElementId() === divId);
        if (existingSlot) {
          window.googletag.pubads().refresh([existingSlot]);
          return;
        }

        const slot = window.googletag.defineSlot(
          config.slotPath,
          config.sizes,
          divId
        );

        if (!slot) {
          return;
        }

        if (slotType === 'responsive_in_feed') {
          const mapping = window.googletag.sizeMapping()
            .addSize([1200, 0], ['fluid', [970, 90], [728, 90]])
            .addSize([768, 0], ['fluid', [728, 90]])
            .addSize([0, 0], ['fluid', [320, 100], [320, 50]])
            .build();
          slot.defineSizeMapping(mapping);
        }

        slot.addService(window.googletag.pubads());
        slotRef.current = slot;

        window.googletag.display(divId);
        window.googletag.pubads().refresh([slot]);

        setTimeout(() => {
          const adContainer = document.getElementById(divId);
          if (adContainer) {
            const iframe = adContainer.querySelector('iframe');
            const innerDiv = adContainer.querySelector('div');
            if (iframe) {
              iframe.style.width = '100%';
              iframe.style.maxWidth = '100%';
            }
            if (innerDiv) {
              innerDiv.style.width = '100%';
              innerDiv.style.maxWidth = '100%';
            }
          }
        }, 1000);
      } catch (error) {
        console.error('GAM error:', error);
      }
    });

    return () => {
      if (slotRef.current && window.googletag && window.googletag.destroySlots) {
        window.googletag.cmd.push(function() {
          try {
            window.googletag.destroySlots([slotRef.current]);
          } catch (e) {}
        });
      }
    };
  }, [slotType, divId]);

  const config = AD_CONFIG[slotType];

  return (
    <div 
      id={divId}
      className={`gam-ad-container ${className}`}
      style={{
        ...config.style,
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        textAlign: 'center'
      }}
      data-ad-slot={slotType}
    />
  );
}
