import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const PromotionBanners = ({ onBannerClick }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('order_index', { ascending: true });
        
        if (!error && data) {
          setBanners(data);
        }
      } catch (err) {
        console.error('Error fetching banners:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      move(1);
    }, 6000);
    return () => clearInterval(timer);
  }, [currentIndex, banners.length]);

  const move = (newDirection) => {
    if (banners.length <= 1) return;
    setDirection(newDirection);
    setCurrentIndex((prev) => (prev + newDirection + banners.length) % banners.length);
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95
    })
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="h-[250px] md:h-[450px] bg-slate-100 rounded-[32px] md:rounded-[48px] animate-pulse shadow-sm" />
      </div>
    );
  }

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full max-w-7xl mx-auto px-6 mb-12 group">
      <div className="relative h-[250px] md:h-[450px] overflow-hidden rounded-[32px] md:rounded-[48px] shadow-2xl shadow-slate-200 bg-slate-50 border border-white">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={banners[currentIndex].id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.4 },
              scale: { duration: 0.4 }
            }}
            className="absolute inset-0 cursor-pointer"
            onClick={() => onBannerClick && onBannerClick(banners[currentIndex])}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <img 
                src={banners[currentIndex].image} 
                alt={banners[currentIndex].title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Content Overlay Removed (Text is in image) */}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  move(idx > currentIndex ? 1 : -1);
                }}
                className={`h-1.5 transition-all duration-500 rounded-full ${
                  idx === currentIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Side Arrows - Visible on Hover */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => move(-1)}
            className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 z-10"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={() => move(1)}
            className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 z-10"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}
    </div>
  );
};

export default PromotionBanners;
