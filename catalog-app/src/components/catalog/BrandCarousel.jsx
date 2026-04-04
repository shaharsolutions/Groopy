import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const FALLBACK_BRANDS = [
  { name: 'Nici', logo: 'https://by-groopy.co.il/wp-content/uploads/2023/07/nici.png' },
  { name: 'Arias', logo: 'https://by-groopy.co.il/wp-content/uploads/2023/07/arias.png' },
  { name: 'Top Model', logo: 'https://by-groopy.co.il/wp-content/uploads/2023/07/topmodel.png' },
  { name: 'Dornat', logo: 'https://by-groopy.co.il/wp-content/uploads/2023/07/%D7%93%D7%95%D7%A8%D7%A0%D7%AA.png' },
  { name: 'InWay', logo: 'https://by-groopy.co.il/wp-content/uploads/2023/07/inway.png' },
];

const BrandCarousel = () => {
  const [brands, setBrands] = useState([]);
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
          setBrands(data);
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

  // Use fallback if still loading or empty to prevent layout shift or empty space
  const displayBrands = brands.length > 0 ? brands : FALLBACK_BRANDS;

  return (
    <div className="w-full bg-white py-12 mb-8 overflow-hidden relative border-y border-slate-50/50">
      {/* Label */}
      <div className="container mx-auto px-6 mb-8 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-400 tracking-wide">המותגים שלנו</span>
      </div>

      {/* Carousel Container with Fading Edge */}
      <div className="relative">
        {/* Right Fade/Blur Effect */}
        <div className="absolute top-0 right-0 h-full w-32 z-10 bg-gradient-to-l from-white via-white/80 to-transparent backdrop-blur-[2px] pointer-events-none" />
        
        {/* Left Guard (Clean entry) */}
        <div className="absolute top-0 left-0 h-full w-8 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />

        <div className="flex w-max animate-scroll-right">
          {[0, 1, 2, 3].map((setIdx) => (
            <div key={setIdx} className="flex gap-[0.75px] md:gap-[1.5px] px-[0.375px] md:px-[0.75px]">
              {displayBrands.map((brand, idx) => (
                <div 
                  key={`${brand.name}-${setIdx}-${idx}`} 
                  className="flex-shrink-0 w-32 h-32 md:w-48 md:h-44 flex items-center justify-center grayscale hover:grayscale-0 opacity-40 hover:opacity-100 transition-all duration-700 transform hover:scale-105"
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
