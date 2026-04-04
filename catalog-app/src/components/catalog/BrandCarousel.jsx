import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

const FALLBACK_BRANDS = [
  { name: 'Nici', logo: '/images/brands/nici.png' },
  { name: 'Arias', logo: '/images/brands/arias.png' },
  { name: 'Top Model', logo: '/images/brands/topmodel.png' },
  { name: 'Dornat', logo: '/images/brands/dornat.png' },
  { name: 'InWay', logo: '/images/brands/inway.png' },
];

const BrandCarousel = () => {
  const [brands, setBrands] = useState(FALLBACK_BRANDS.slice(0, 2));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .order('type', { ascending: true, nullsFirst: false })
          .order('name');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const visibleBrands = data.filter(brand => brand.show_in_carousel !== false);
          setBrands(visibleBrands.length > 0 ? visibleBrands : FALLBACK_BRANDS);
        } else {
          setBrands(FALLBACK_BRANDS);
        }
      } catch (err) {
        console.error('Error fetching brands:', err);
        setBrands(FALLBACK_BRANDS);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  // Ensure the list is long enough to fill any screen. 
  // We repeat the brands list within each "set" until we have at least 15 items.
  const paddedBrands = useMemo(() => {
    if (brands.length === 0) return [];
    let list = [...brands];
    while (list.length < 15) {
      list = [...list, ...brands];
    }
    return list;
  }, [brands]);

  return (
    <div className="w-full bg-white py-6 mb-4 overflow-hidden relative border-y border-slate-50/50">
      {/* Label */}
      <div className="container mx-auto px-6 mb-4 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-400 tracking-wide">המותגים שלנו</span>
      </div>

      {/* Carousel Container with Fading Edge */}
      <div className="relative min-h-[128px] md:min-h-[176px]">
        {/* Right Fade/Blur Effect */}
        <div className="absolute top-0 right-0 h-full w-32 z-10 bg-gradient-to-l from-white via-white/80 to-transparent backdrop-blur-[2px] pointer-events-none" />
        
        <div className="absolute top-0 left-0 h-full w-8 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />

        <div className="flex w-max animate-scroll-right-infinite">
          {/* We only need 2 sets for a perfect 0-50% marquee loop */}
          {[0, 1].map((setIdx) => (
            <div 
              key={setIdx} 
              className="flex gap-[0.75px] md:gap-[1.5px] px-[0.375px] md:px-[0.75px]"
            >
              {paddedBrands.map((brand, idx) => (
                <div 
                  key={`${brand.name}-${setIdx}-${idx}`} 
                  className="flex-shrink-0 w-32 h-32 md:w-48 md:h-44 flex items-center justify-center grayscale-0 opacity-100 md:grayscale md:opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700 transform hover:scale-105"
                >
                  <img 
                    src={brand.logo} 
                    alt={brand.name} 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrandCarousel;
