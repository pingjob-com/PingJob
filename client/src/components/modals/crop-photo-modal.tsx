import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';

interface CropPhotoModalProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: Blob) => void;
  isLoading?: boolean;
}

export default function CropPhotoModal({
  imageSrc,
  isOpen,
  onClose,
  onCropComplete,
  isLoading = false
}: CropPhotoModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropAreaChange = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSubmit = useCallback(async () => {
    if (!croppedAreaPixels) return;

    try {
      const image = new Image();
      image.src = imageSrc;
      
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );

        ctx.restore();

        canvas.toBlob((blob) => {
          if (blob) {
            onCropComplete(blob);
          }
        }, 'image/jpeg', 0.95);
      };
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  }, [croppedAreaPixels, rotation, imageSrc, onCropComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2" data-testid="crop-modal-overlay">
      {/* Modal */}
      <div className="bg-white rounded-xl w-full max-w-xs sm:max-w-sm flex flex-col max-h-[calc(100vh-40px)] overflow-hidden shadow-xl">
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-3 sm:px-4 sm:py-3 border-b bg-white">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Crop</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            data-testid="crop-modal-close"
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 hover:bg-gray-100 rounded transition"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 space-y-4">
          
          {/* Circular Crop Container with clip-path */}
          <div className="flex justify-center mb-2">
            <div 
              className="flex-shrink-0 relative"
              style={{
                width: '260px',
                height: '260px',
                borderRadius: '50%',
                backgroundColor: '#000',
                border: '3px solid #d1d5db',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                clipPath: 'circle(50%)'
              }}
            >
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropAreaChange={onCropAreaChange}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  style={{
                    containerStyle: {
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Zoom */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-semibold text-gray-800">Zoom</label>
              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                {(zoom * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
              data-testid="zoom-slider"
            />
          </div>

          {/* Rotate */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-semibold text-gray-800">Rotate</label>
              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                {rotation}°
              </span>
            </div>
            <Slider
              value={[rotation]}
              onValueChange={(value) => setRotation(value[0])}
              min={0}
              max={360}
              step={1}
              className="w-full"
              data-testid="rotation-slider"
            />
          </div>

          {/* Quick Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRotation((r) => (r - 45 + 360) % 360)}
              disabled={isLoading}
              data-testid="rotate-left-45"
              className="h-9 text-xs font-semibold"
            >
              ↺ 45
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRotation((r) => (r + 45) % 360)}
              disabled={isLoading}
              data-testid="rotate-right-45"
              className="h-9 text-xs font-semibold"
            >
              45 ↻
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              disabled={isLoading}
              data-testid="rotate-90"
              className="h-9 text-xs font-semibold"
            >
              ↻ 90
            </Button>
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="flex-shrink-0 flex gap-2 px-3 py-3 sm:px-4 sm:py-3 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            data-testid="crop-modal-cancel"
            className="flex-1 h-10 text-xs sm:text-sm font-semibold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCropSubmit}
            disabled={isLoading}
            data-testid="crop-modal-upload"
            className="flex-1 h-10 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
