import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Check if we are on a deep link that will handle its own scrolling
    const hasDeepLink = search.includes('category=') || search.includes('badge=');
    
    if (!hasDeepLink) {
      window.scrollTo(0, 0);
    }
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
