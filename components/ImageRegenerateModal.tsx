import React, { useState } from 'react';
import { Icons } from '../constants';

interface ImageRegenerateModalProps {
  isOpen: boolean;
  originalImage: string | undefined;
  newImages: string[];
  onSelect: (imageUrl: string | null) => void;
  onClose: () => void;
  isLoading?: boolean;
}

// @ARCH:START ImageRegenerateModal - UI: 圖片重新生成選擇模態框
const ImageRegenerateModal: React.FC<ImageRegenerateModalProps> = ({
  isOpen,
  originalImage,
  newImages,
  onSelect,
  onClose,
  isLoading = false
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const images = [
    { url: originalImage, label: '原圖' },
    ...newImages.map((url, idx) => ({ url, label: `新圖 ${idx + 1}` }))
  ].filter(img => img.url); // 過濾掉沒有圖片的項目

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleConfirm = () => {
    if (selectedIndex !== null) {
      const selectedImage = images[selectedIndex]?.url || null;
      onSelect(selectedImage);
      setSelectedIndex(null);
    }
  };

  const handleCancel = () => {
    setSelectedIndex(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-black text-dark flex items-center gap-2">
            <Icons.Image size={24} className="text-primary" />
            選擇圖片
          </h2>
          <button
            onClick={handleCancel}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <Icons.X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 font-bold">正在生成圖片...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Icons.Image size={64} className="text-slate-300 mb-4" />
              <p className="text-slate-600 font-bold">沒有可用的圖片</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-6 text-center">
                點擊選擇您喜歡的圖片
              </p>
              
              {/* Images Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className={`relative cursor-pointer rounded-2xl overflow-hidden border-4 transition-all ${
                      selectedIndex === index
                        ? 'border-primary shadow-lg scale-105'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => handleSelect(index)}
                  >
                    <img
                      src={image.url}
                      alt={image.label}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    
                    {/* Label */}
                    <div className={`absolute bottom-0 left-0 right-0 p-2 text-center font-bold text-sm ${
                      selectedIndex === index
                        ? 'bg-primary text-white'
                        : 'bg-white/90 text-slate-700'
                    }`}>
                      {image.label}
                    </div>

                    {/* Checkmark */}
                    {selectedIndex === index && (
                      <div className="absolute top-2 right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Icons.Check size={20} className="text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && images.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t-2 border-slate-100 px-6 py-4 flex gap-4 justify-end">
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIndex === null}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              確認選擇
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
// @ARCH:END ImageRegenerateModal - UI: 圖片重新生成選擇模態框

export default ImageRegenerateModal;

