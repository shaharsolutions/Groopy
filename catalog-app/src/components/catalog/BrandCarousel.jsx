import React, { useMemo } from 'react';

const FALLBACK_BRANDS = [
  { name: 'Nici', logo: '/images/brands/nici.png' },
  { name: 'Arias', logo: '/images/brands/arias.png' },
  { name: 'Top Model', logo: '/images/brands/topmodel.png' },
  { name: 'Dornat', logo: '/images/brands/dornat.png' },
  { name: 'InWay', logo: '/images/brands/inway.png' },
];

const BrandCarousel = React.memo(({ brands: propBrands }) => {
  const brands = useMemo(() => {
    if (propBrands && propBrands.length > 0) {
      const visibleBrands = propBrands.filter(brand => brand.show_in_carousel !== false);
      return visibleBrands.length > 0 ? visibleBrands : FALLBACK_BRANDS;
    }
    return FALLBACK_BRANDS;
  }, [propBrands]);

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
      <div className="mb-4 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-400 tracking-wide">המותגים שלנו</span>
      </div>

      <div className="relative min-h-[128px] md:min-h-[176px]">
        <div className="flex w-max animate-scroll-right-infinite" style={{ willChange: 'transform' }}>
          {/* We only need 2 sets for a perfect 0-50% marquee loop */}
          {[0, 1].map((setIdx) => (
            <div 
              key={setIdx} 
              className="flex gap-8 md:gap-16 items-center px-4 md:px-8"
            >
              {paddedBrands.map((brand, idx) => (
                <div 
                  key={`${brand.name}-${setIdx}-${idx}`} 
                  className="flex-shrink-0 w-32 h-32 md:w-48 md:h-44 flex items-center justify-center grayscale-0 opacity-100 md:grayscale md:opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700 transform hover:scale-105"
                >
                  <img 
                    src={brand.logo} 
                    alt={brand.name} 
                    loading="lazy"
                    decoding="async"
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
});

BrandCarousel.displayName = 'BrandCarousel';

export default BrandCarousel;
