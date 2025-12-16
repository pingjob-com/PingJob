import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    googletag: any;
    gamSlotsInitialized: boolean;
    gamDefinedSlots: Record<string, any>;
  }
}

export type AdSlotType = 'responsive_in_feed' | 'medium_rectangle' | 'leaderboard' | 'wide_skyscraper';

interface GoogleAdManagerProps {
  slotType: AdSlotType;
  className?: string;
}

const AD_CONFIG: Record<AdSlotType, {
  slotPath: string;
  size: any;
  style: React.CSSProperties;
}> = {
  responsive_in_feed: {
    slotPath: '/23331199163/responsive_in-feed',
    size: 'fluid',
    style: { minHeight: '90px', width: '100%' }
  },
  medium_rectangle: {
    slotPath: '/23331199163/medium_ractangle',
    size: [300, 250],
    style: { minWidth: '300px', minHeight: '250px' }
  },
  leaderboard: {
    slotPath: '/23331199163/leaderboard',
    size: [728, 90],
    style: { minWidth: '728px', minHeight: '90px' }
  },
  wide_skyscraper: {
    slotPath: '/23331199163/wide_skycraper',
    size: [160, 600],
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
    
    // Ensure googletag exists
    window.googletag = window.googletag || { cmd: [] };

    // Push slot definition into GPT command queue
    window.googletag.cmd.push(function() {
      try {
        const container = document.getElementById(divId);
        if (!container) {
          console.warn('GAM container not found:', divId);
          return;
        }

        // Check if slot already exists for this div
        const existingSlots = window.googletag.pubads().getSlots();
        const existingSlot = existingSlots.find((s: any) => s.getSlotElementId() === divId);
        if (existingSlot) {
          console.log('Slot already exists, refreshing:', divId);
          window.googletag.pubads().refresh([existingSlot]);
          return;
        }

        // Define the slot
        const slot = window.googletag.defineSlot(
          config.slotPath,
          config.size,
          divId
        );

        if (!slot) {
          console.error('Failed to define slot:', config.slotPath);
          return;
        }

        // Add to pubads service
        slot.addService(window.googletag.pubads());
        slotRef.current = slot;

        console.log('GAM slot defined:', divId, config.slotPath);

        // Display the slot (creates the ad iframe)
        window.googletag.display(divId);

        // Refresh to fetch the ad
        window.googletag.pubads().refresh([slot]);

        console.log('GAM slot displayed and refreshed:', divId);
      } catch (error) {
        console.error('GAM slot initialization error:', error);
      }
    });

    return () => {
      // Cleanup on unmount
      if (slotRef.current && window.googletag && window.googletag.destroySlots) {
        window.googletag.cmd.push(function() {
          try {
            window.googletag.destroySlots([slotRef.current]);
            console.log('GAM slot destroyed:', divId);
          } catch (e) {
            console.error('Error destroying slot:', e);
          }
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
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent'
      }}
      data-ad-slot={slotType}
    />
  );
}
