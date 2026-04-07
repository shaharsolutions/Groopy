import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const PromotionBanners = ({ onBannerClick }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);
  const isScrollingRef = useRef(false);

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

  // Update currentIndex based on scroll position
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isScrollingRef.current) return;
    
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    // For RTL, scrollLeft is negative or starts from large positive to 0
    // We'll use Math.abs and round for robustness
    const index = Math.round(Math.abs(scrollLeft) / width);
    
    if (index !== currentIndex && index < banners.length) {
      setCurrentIndex(index);
    }
  }, [currentIndex, banners.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Programmatic scroll to a specific index
  const scrollTo = (index) => {
    if (!scrollRef.current) return;
    
    isScrollingRef.current = true;
    const width = scrollRef.current.offsetWidth;
    const target = index * width;
    
    // In RTL, we scroll to target (if 0 to max) or -target (if 0 to -max)
    // Most modern browsers use 0 as the rightmost point in RTL
    scrollRef.current.scrollTo({
      left: -target, // Standard RTL scroll behavior
      behavior: 'smooth'
    });

    setCurrentIndex(index);
    
    // Release the manual scroll lock after animation
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 600);
  };

  const move = (step) => {
    if (banners.length <= 1) return;
    const newIndex = (currentIndex + step + banners.length) % banners.length;
    scrollTo(newIndex);
  };

  // Auto-play timer
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      move(1);
    }, 6000);
    return () => clearInterval(timer);
  }, [currentIndex, banners.length]);

  if (loading) {
    return (
      <div className="max-w-none md:max-w-3xl mx-auto px-0 md:px-6 mb-12">
        <div className="aspect-[16/10] md:h-[450px] bg-slate-100 rounded-[32px] md:rounded-[48px] animate-pulse shadow-sm" />
      </div>
    );
  }

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full max-w-none md:max-w-3xl mx-auto px-0 md:px-6 mb-12 group" dir="rtl">
      {/* Scrollable Container */}
      <div className="relative aspect-[16/10] md:h-[450px] shadow-2xl shadow-slate-200 bg-slate-50 border border-white rounded-[32px] md:rounded-[48px] overflow-hidden">
        <div 
          ref={scrollRef}
          className="flex h-full overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {banners.map((banner, idx) => (
            <div 
              key={banner.id || `banner-${idx}`}
              className="flex-none w-full h-full snap-center cursor-pointer"
              onClick={() => onBannerClick && onBannerClick(banner)}
            >
              <img 
                src={banner.image} 
                alt={banner.title}
                className="w-full h-full select-none pointer-events-none transition-all duration-700"
                style={{
                  objectFit: banner.object_fit || 'cover',
                  objectPosition: `${banner.pos_x || 50}% ${banner.pos_y || 50}%`,
                  transform: `scale(${banner.zoom || 1})`
                }}
              />
            </div>
          ))}
        </div>

        {/* Navigation Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  scrollTo(idx);
                }}
                className={`h-1.5 transition-all duration-500 rounded-full ${
                  idx === currentIndex ? 'w-8 bg-white shadow-sm' : 'w-1.5 bg-white/40 hover:bg-white/60'
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

      {/* Add Custom Hidden Scrollbar CSS */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default PromotionBanners;
