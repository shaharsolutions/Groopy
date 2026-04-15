import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const PromotionBanners = React.memo(({ banners: propBanners, onBannerClick, allowedBannerIds }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);
  const isScrollingRef = useRef(false);

  // Filter banners based on allowedBannerIds
  const banners = React.useMemo(() => {
    if (!propBanners || propBanners.length === 0) return [];
    const activeBanners = propBanners.filter(b => b.is_active);
    if (allowedBannerIds && allowedBannerIds.length > 0) {
      return activeBanners.filter(b => allowedBannerIds.includes(b.id));
    }
    return activeBanners;
  }, [propBanners, allowedBannerIds]);

  // Update currentIndex based on scroll position
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isScrollingRef.current) return;
    
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
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
  const scrollTo = useCallback((index) => {
    if (!scrollRef.current) return;
    
    isScrollingRef.current = true;
    const width = scrollRef.current.offsetWidth;
    const target = index * width;
    
    scrollRef.current.scrollTo({
      left: -target,
      behavior: 'smooth'
    });

    setCurrentIndex(index);
    
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 600);
  }, []);

  const move = useCallback((step) => {
    if (banners.length <= 1) return;
    const newIndex = (currentIndex + step + banners.length) % banners.length;
    scrollTo(newIndex);
  }, [banners.length, currentIndex, scrollTo]);

  // Auto-play timer
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      move(1);
    }, 6000);
    return () => clearInterval(timer);
  }, [currentIndex, banners.length, move]);

  if (!propBanners || propBanners.length === 0) {
    return null;
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
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
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
            className="absolute -left-2 md:-left-12 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 z-10"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={() => move(1)}
            className="absolute -right-2 md:-right-12 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 z-10"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}
    </div>
  );
});

PromotionBanners.displayName = 'PromotionBanners';

export default PromotionBanners;
