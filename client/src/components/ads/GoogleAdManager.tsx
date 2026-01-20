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
    sizes: [[970, 90], [728, 90], [320, 100], [320, 50]],
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
          // Check if services are already enabled
          const pubads = window.googletag.pubads();
          
          // If the page already has a slot for this divId, we should refresh it instead of defining it again
          const existingSlots = pubads.getSlots ? pubads.getSlots() : [];
          const existingSlot = existingSlots.find((s: any) => s.getSlotElementId() === divId);
          
          if (existingSlot) {
            pubads.refresh([existingSlot]);
            return;
          }

          const slot = window.googletag.defineSlot(
            config.slotPath,
            config.sizes,
            divId
          );

          if (!slot) {
            console.error('GAM: Failed to define slot for', divId);
            return;
          }

          // Define responsive size mapping
          const mapping = window.googletag.sizeMapping()
            .addSize([1024, 0], [[970, 90], [728, 90]])
            .addSize([768, 0], [[728, 90]])
            .addSize([0, 0], [[320, 100], [320, 50]])
            .build();
          
          slot.defineSizeMapping(mapping);
          slot.addService(pubads);
          slotRef.current = slot;

          // Enable single request mode and services if not already enabled
          if (!window.googletag._gptServicesEnabled) {
            pubads.enableSingleRequest();
            pubads.collapseEmptyDivs(false);
            window.googletag.enableServices();
            window.googletag._gptServicesEnabled = true;
          }

          // Display and refresh the slot
          window.googletag.display(divId);
          pubads.refresh([slot]);

        } catch (error) {
          console.error('GAM Error:', error);
        }
      });
    };

    // Use a small timeout to ensure the DOM is ready and IDs are correctly assigned
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
      className={`w-full flex justify-center py-4 ${className}`}
      style={{ width: '100%', minWidth: '320px', minHeight: config.style.minHeight }}
    >
      <div 
        id={divId}
        className="gam-ad-container"
        style={{
          ...config.style,
          display: 'block',
          textAlign: 'center',
          margin: '0 auto',
          width: '100%',
          maxWidth: '100%'
        }}
      />
    </div>
  );
}
