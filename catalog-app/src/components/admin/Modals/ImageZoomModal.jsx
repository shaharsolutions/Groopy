import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ImageZoomModal = ({ isOpen, imageSource, onClose }) => {
  if (!isOpen || !imageSource) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl transition-all cursor-zoom-out"
      />
      
      <motion.div 
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative max-w-[95vw] max-h-[90vh] z-[101] flex flex-col pointer-events-none"
      >
        <div className="absolute top-4 right-4 z-[102] pointer-events-auto">
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 transition-all shadow-xl border border-white/20 active:scale-90"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="bg-white/5 p-2 rounded-[32px] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm">
          <img 
            src={imageSource} 
            alt="Zoomed View" 
            className="w-full h-auto max-h-[85vh] object-contain rounded-[24px]"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default ImageZoomModal;
