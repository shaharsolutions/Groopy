import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Send, 
  ShoppingBag, 
  Package, 
  ChevronRight, 
  ArrowLeft,
  ChevronDown,
  Trash2,
  CheckCircle,
  Zap,
  TrendingDown,
  Settings,
  Percent,
  Star,
  Flame,
  UserCheck,
  ArrowUp,
  Link as ChainLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import logo from '../assets/byGroopy_strip.png';
import { supabase } from '../supabaseClient';
import ProductCard from '../components/catalog/ProductCard';
import CartDrawer from '../components/catalog/CartDrawer';
import BrandCarousel from '../components/catalog/BrandCarousel';
import AgentSelectorModal from '../components/catalog/AgentSelectorModal';
import FloatingAgentStatus from '../components/catalog/FloatingAgentStatus';
import PromotionBanners from '../components/catalog/PromotionBanners';
import ProductDetailModal from '../components/catalog/ProductDetailModal';
import { formatCartonCount } from '../utils/cartonUtils';
import AlertModal from '../components/common/AlertModal';

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'All');
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('groopy_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error('Error loading cart from localStorage:', e);
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('groopy_customer_name') || '');
  const [customerNote, setCustomerNote] = useState(() => localStorage.getItem('groopy_customer_note') || '');
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [restorableCart, setRestorableCart] = useState([]);
  
  // 🏷️ PRODUCT MODAL STATE
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: '', type: 'error', title: '' });

  // 🔗 SHORT LINK STATE
  const [fetchedConfig, setFetchedConfig] = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(() => !!searchParams.get('s'));

  const [selectedBadge, setSelectedBadge] = useState(() => searchParams.get('badge') || null); // 'is_clearing', 'is_best_seller', 'is_hot_deal'
  
  // 🔗 LINK-BASED FILTERING (Personalized Agent Links)
  const allowedCategories = useMemo(() => {
    if (fetchedConfig) return fetchedConfig.categories;
    const cats = searchParams.get('categories');
    return cats ? cats.split(',').map(c => c.trim()) : null;
  }, [searchParams, fetchedConfig]);

  const allowedBannerIds = useMemo(() => {
    if (fetchedConfig) return fetchedConfig.banners;
    const bans = searchParams.get('banners');
    return bans ? bans.split(',').map(b => b.trim()) : null;
  }, [searchParams, fetchedConfig]);

  const isLinkExpired = useMemo(() => {
    if (fetchedConfig) {
      if (fetchedConfig.is_active === false) return true; // Manually deactivated
      return fetchedConfig.expires_at ? Date.now() > fetchedConfig.expires_at : false;
    }
    const expiry = searchParams.get('expires_at');
    if (!expiry) return false;
    return Date.now() > parseInt(expiry);
  }, [searchParams, fetchedConfig]);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainRef = useRef(null);
  const filtersRef = useRef(null);
  const categoryContainerRef = useRef(null);

  const scrollToFilters = () => {
    filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToProducts = () => {
    mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToActiveCategory = () => {
    // Find the active button within the container
    const activeBtn = categoryContainerRef.current?.querySelector('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest', 
        inline: 'center' 
      });
    }
  };

  // 🖼️ Product Modal Handlers
  const openProductModal = (product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
  };
  
  // 👔 AGENT SYSTEM
  const [activeAgent, setActiveAgent] = useState(null);
  const [agents, setAgents] = useState([]);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isAgentLocked, setIsAgentLocked] = useState(() => localStorage.getItem('groopy_agent_locked') === 'true');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const defaultWhatsApp = "972500000000"; // Fallback number

  // Load persistence
  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const currentAgentRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // ⚡ INSTANT LOAD FROM CACHE (Stale-While-Revalidate)
    const cachedProducts = localStorage.getItem('groopy_cache_products');
    const cachedCategories = localStorage.getItem('groopy_cache_categories');
    const cachedAgents = localStorage.getItem('groopy_cache_agents');

    if (cachedProducts && cachedCategories && cachedAgents) {
      try {
        setProducts(JSON.parse(cachedProducts));
        setDbCategories(JSON.parse(cachedCategories));
        setAgents(JSON.parse(cachedAgents));
        // If we have cache, we can show the UI immediately while the sync happens in background
        setIsInitialLoading(false);
      } catch (e) {
        console.error('Error parsing cache', e);
      }
    }

    fetchInitialData();
    resolveShortLink();
    return () => {
      isMounted.current = false;
    };
  }, [searchParams]);

  const resolveShortLink = async () => {
    const shortId = searchParams.get('s');
    if (!shortId) return;

    setIsConfigLoading(true);
    try {
      const { data, error } = await supabase
        .from('personalized_links')
        .select('*')
        .eq('id', shortId)
        .single();
      
      if (!error && data) {
        setFetchedConfig(data);
        
        // Determine if active
        const isActuallyActive = data.is_active !== false && (!data.expires_at || Date.now() < data.expires_at);
        
        // Increment appropriate counter
        const fieldToUpdate = isActuallyActive ? 'views' : 'views_inactive';
        await supabase.from('personalized_links').update({ [fieldToUpdate]: (data[fieldToUpdate] || 0) + 1 }).eq('id', shortId);
      } else {
        console.error('Error resolving short link:', error);
      }
    } catch (err) {
      console.error('Unexpected error resolving short link:', err);
    } finally {
      setIsConfigLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('groopy_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (customerName) {
      localStorage.setItem('groopy_customer_name', customerName);
    }
  }, [customerName]);

  useEffect(() => {
    localStorage.setItem('groopy_customer_note', customerNote);
  }, [customerNote]);

  // 🖱️ SCROLL TO TOP MONITOR
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 🚀 STABLE LANDING SYSTEM
  const hasAutoScrolled = useRef(false);
  const landingModeRef = useRef(false);

  useEffect(() => {
    // 1. Disable browser's automatic scroll restoration to prevent jumping back
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // 2. Monitor for unexpected "snap-back" to top during the first 3 seconds of load
    const handleScrollMonitor = () => {
      // If we are in landing mode and suddenly jump back to the very top (< 50px)
      // we re-trigger the scroll to products.
      if (landingModeRef.current && window.scrollY < 50) {
        scrollToProducts();
      }
    };

    window.addEventListener('scroll', handleScrollMonitor);
    return () => {
      window.removeEventListener('scroll', handleScrollMonitor);
      // Restore default behavior on unmount if needed
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  useEffect(() => {
    if (!isInitialLoading && !hasAutoScrolled.current) {
      const fullHref = window.location.href;
      const isDeepLink = fullHref.match(/[?&]category=([^&#]+)/) || fullHref.match(/[?&]badge=([^&#]+)/);
      
      if (isDeepLink) {
        hasAutoScrolled.current = true;
        landingModeRef.current = true;

        // Stage 1: Immediate instant scroll to "claim" the position
        mainRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });

        // Stage 2: Smooth refined scroll after layout stabilizes
        const scrollStabilizer = setTimeout(() => {
          scrollToProducts();
          scrollToActiveCategory();
          
          // Exit landing mode after 2.5 seconds (plenty of time for images to load)
          setTimeout(() => {
            landingModeRef.current = false;
          }, 2500);
        }, 800);

        return () => clearTimeout(scrollStabilizer);
      }
    }
  }, [isInitialLoading]);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch Products, Agents & Categories in parallel
      const [productsRes, agentsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('agents').select('*').order('name'),
        supabase.from('categories').select('*').order('order_index', { ascending: true })
      ]);

      if (!isMounted.current) return;

      if (productsRes.data) {
        setProducts(productsRes.data);
        localStorage.setItem('groopy_cache_products', JSON.stringify(productsRes.data));
      }
      if (productsRes.error) console.error('Error loading products:', productsRes.error);

      if (agentsRes.data) {
        setAgents(agentsRes.data);
        localStorage.setItem('groopy_cache_agents', JSON.stringify(agentsRes.data));
      }
      if (agentsRes.error) console.error('Error loading agents:', agentsRes.error);

      if (categoriesRes.data) {
        setDbCategories(categoriesRes.data);
        localStorage.setItem('groopy_cache_categories', JSON.stringify(categoriesRes.data));
      }
      if (categoriesRes.error) console.error('Error loading categories:', categoriesRes.error);

      const agentsData = agentsRes.data;

      // 2. Identify Agent from URL or LocalStorage
      let agentIdFromURL = searchParams.get('agent');
      const savedAgentId = localStorage.getItem('groopy_agent_id');

      if (agentIdFromURL) {
        if (!currentAgentRef.current || currentAgentRef.current.id !== agentIdFromURL) {
          console.log(`🔍 Attempting to connect agent: ${agentIdFromURL}`);
          const { data: agentData, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('id', agentIdFromURL)
            .single();

          if (!agentError && agentData && isMounted.current) {
            console.log(`✅ Agent Connected Successfully: ${agentData.name} (LOCKED)`);
            setActiveAgent(agentData);
            currentAgentRef.current = agentData;
            localStorage.setItem('groopy_agent_id', agentIdFromURL);
            localStorage.setItem('groopy_agent_locked', 'true');
            setIsAgentLocked(true);
          }
        } else {
          // Already have this agent but arrived with URL param, ensure locked
          setIsAgentLocked(true);
          localStorage.setItem('groopy_agent_locked', 'true');
        }
      } else {
        // No agent in URL - Unlock selection
        setIsAgentLocked(false);
        localStorage.setItem('groopy_agent_locked', 'false');

        if (savedAgentId && (!currentAgentRef.current || currentAgentRef.current.id !== savedAgentId)) {
          const matchedAgent = agentsData?.find(a => a.id === savedAgentId);
          if (matchedAgent) {
            setActiveAgent(matchedAgent);
            currentAgentRef.current = matchedAgent;
          }
        } else if (!savedAgentId) {
          setActiveAgent(null);
          currentAgentRef.current = null;
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      if (isMounted.current) setIsInitialLoading(false);
    }
  };


  // Determine if the current session started from a link
  const isFromLink = useMemo(() => {
    const fullHref = window.location.href;
    return fullHref.includes('agent=');
  }, [searchParams]);

  const selectAgent = (agent) => {
    setActiveAgent(agent);
    localStorage.setItem('groopy_agent_id', agent.id);
  };

  // Categories Calculation
  const categories = useMemo(() => {
    const productCategories = new Set(products.map(p => p.category).filter(Boolean));
    
    // Always start with 'All'
    const result = ['All'];
    
    // Add categories from DB in their defined order, but only if they contain products
    dbCategories.forEach(cat => {
      if (cat.name && productCategories.has(cat.name)) {
        // If we have allowedCategories filter, only add if it matches
        if (!allowedCategories || allowedCategories.includes(cat.name)) {
          result.push(cat.name);
        }
      }
    });
    
    // Add any categories present in products that were NOT found in the categories table
    productCategories.forEach(catName => {
      if (!result.includes(catName)) {
        // Filter by allowedCategories if provided
        if (!allowedCategories || allowedCategories.includes(catName)) {
          result.push(catName);
        }
      }
    });
    
    return result;
  }, [products, dbCategories, allowedCategories]);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const normalizedProductCat = product.category;
        
      let matchesCategory = false;
      if (selectedCategory === 'All') {
        // If we have a personalized link filter, 'All' should only show allowed categories
        if (allowedCategories) {
          matchesCategory = allowedCategories.includes(normalizedProductCat);
        } else {
          matchesCategory = true;
        }
      } else if (selectedCategory === 'New') {
        matchesCategory = !!product.is_new;
      } else {
        matchesCategory = normalizedProductCat === selectedCategory;
      }

      let matchesBadge = true;
      if (selectedBadge) {
        matchesBadge = !!product[selectedBadge];
      }
      
      return matchesSearch && matchesCategory && matchesBadge;
    });
  }, [searchTerm, selectedCategory, selectedBadge, products]);

  // Cart Management
  const addToCart = (product, quantity) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      
      // 🚀 Incremental Addition Logic:
      // If product is already in cart, additions increment.
      if (existing && product.is_incremental_add) {
        const defaultStep = product.incremental_step ? Number(product.incremental_step) : 1;
        const increment = quantity !== undefined ? Number(quantity) : defaultStep;
        return prev.map(item => item.id === product.id ? { ...item, quantity: Math.round(item.quantity + increment) } : item);
      }

      const defaultStep = Number(product.default_quantity || 12);
      const finalQuantity = Number(quantity ?? defaultStep);
      
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + finalQuantity } : item);
      }
      return [...prev, { ...product, quantity: finalQuantity }];
    });
    // Clear restorable cart if user adds new items
    if (restorableCart.length > 0) setRestorableCart([]);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const updateQuantity = (id, direction) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const defaultQty = Number(item.default_quantity || 12);
        let step = 1;
        
        if (item.incremental_step) {
          step = Number(item.incremental_step);
        } else if (item.is_incremental_add) {
          step = 1;
        } else if (item.is_default_carton) {
          step = Math.max(1, Math.round(defaultQty * 0.25));
        }
        
        const minQty = defaultQty;
        
        const adjustedDelta = direction * step;
        let newQty = Math.max(0, Number(item.quantity) + adjustedDelta);
        
        // If it's a carton/incremental product and we drop below the minimum, remove it (set to 0)
        if (direction < 0 && (item.is_default_carton || isIncremental) && newQty < minQty) {
          newQty = 0;
        }
        
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  useEffect(() => {
    scrollToActiveCategory();
  }, [selectedCategory]);

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleRestoreCart = () => {
    if (restorableCart.length > 0) {
      setCart(restorableCart);
      setRestorableCart([]);
      setIsCartOpen(true);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWhatsAppSend = () => {
    if (!customerName.trim()) {
      setFormError('נא להזין שם לקוח כדי להמשיך');
      return;
    }
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError('');

    // 💾 AUTO-UPSERT CUSTOMER TO CRM
    // This ensures new customers are added to the CRM and existing ones are associated
    const upsertCustomer = async () => {
      try {
        await supabase.from('customers').upsert([
          { business_name: customerName }
        ], { onConflict: 'business_name' });
      } catch (err) {
        console.error('❌ Error upserting customer to CRM:', err);
      }
    };

    upsertCustomer();

    // 💾 SAVE TO SUPABASE (BACKGROUND)
    // We fire this in the background and don't await it to ensure immediate WhatsApp redirection
    supabase.from('orders').insert({
      customer_name: customerName,
      customer_note: customerNote,
      items: cart,
      total_price: totalPrice,
      agent_id: activeAgent?.id || null,
      agent_name: activeAgent?.name || null,
      status: 'New'
    }).then(({ error }) => {
      if (error) console.error('❌ Error saving order to Supabase:', error);
      else {
        console.log('✅ Order saved successfully to Supabase');
        setCustomerNote(''); // Clear note after successful send
      }
      setIsSubmitting(false);
    }).catch(err => {
      console.error('❌ Unexpected error saving order:', err);
      setIsSubmitting(false);
    });

    let message = `\u200F*הזמנה חדשה מקטלוג Groopy*\n\n`;
    message += `\u200F*שם הלקוח:* ${customerName}\n`;
    if (customerNote.trim()) {
      message += `\u200F*הערה:* ${customerNote}\n`;
    }
    message += `\n`;
    
    if (activeAgent) {
      message += `\u200F*דרך סוכן:* ${activeAgent.name}\n\n`;
    }
    message += `\u200F*פירוט המוצרים:*\n`;
    
    cart.forEach((item, index) => {
      message += `\u200F*${index + 1}. ${item.name}*\n`;
      message += `\u200Fמק"ט: ${item.sku}\n`;
      const cartonCountValue = formatCartonCount(item.quantity, item.default_quantity || 12);
      const cartonText = item.is_default_carton ? ` (${cartonCountValue} קרטון)` : '';
      message += `\u200Fכמות: ${item.quantity} יחידות${cartonText}\n`;
      message += `\u200Fמחיר יחידה: ₪${item.price.toFixed(2)}\n`;
      
      if (index < cart.length - 1) {
        message += `\u200F────────\n`;
      }
    });
    
    message += `\n\u200F*סה"כ לתשלום: ₪${totalPrice.toFixed(2)}*\n\n`;
    message += `\u200Fנא ליצור איתי קשר לתיאום אספקה. תודה!`;

    const encoded = encodeURIComponent(message);
    
    // 📞 PHONE FORMATTING LOGIC
    let targetPhone = activeAgent ? activeAgent.phone : defaultWhatsApp;
    
    // Clean and format for Israeli WhatsApp compatibility
    let cleanPhone = targetPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '972' + cleanPhone.substring(1);
    }
    
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    
    // Clear cart and close drawer after sending
    setRestorableCart([...cart]);
    setCart([]);
    setIsCartOpen(false);
    
    setIsSent(true);
    setTimeout(() => setIsSent(false), 3000);
  };

  const handleBannerClick = (banner) => {
    if (banner.target_type === 'badge') {
      setSelectedBadge(banner.target_value);
      scrollToFilters();
    } else if (banner.target_type === 'category') {
      setSelectedCategory(banner.target_value);
      setSelectedBadge(null);
      scrollToProducts();
    } else if (banner.target_type === 'product') {
      const product = products.find(p => p.sku === banner.target_value || p.id === banner.target_value);
      if (product) {
        setSelectedProduct(product);
        setIsProductModalOpen(true);
      }
    }
  };

  if (isConfigLoading && searchParams.get('s')) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="relative w-24 h-24 mb-8">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-slate-100 border-t-primary-500 rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center text-primary-500">
              <ChainLink size={32} />
            </div>
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">טוען את הקטלוג האישי שלך...</h2>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div 
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 bg-primary-400 rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (isLinkExpired) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center" dir="rtl">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md bg-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-[100px] -z-0 opacity-50" />
          <div className="relative z-10">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Clock size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">הקישור לא תקין</h2>
            <p className="text-slate-500 font-bold mb-2 leading-relaxed">
              מצטערים, אך הקישור האישי שקיבלת אינו פעיל או שאינו תקין.
            </p>
            <p className="text-slate-400 text-sm font-medium mb-8">
              נא לפנות לסוכן לקבלת קישור מעודכן.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black transition-colors"
            >
              חזרה לדף הבית
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFDFE] text-slate-900 overflow-x-hidden" dir="rtl">

      {/* 🧭 PREMIUM NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-3xl border-b border-slate-100/60 transition-all duration-300">
        <div className="container mx-auto px-6 h-24 md:h-32 lg:h-36 flex items-center transition-all">
          {/* Right Section: Admin (RTL start) */}
          <div className="flex-1 flex items-center justify-start gap-4 md:gap-6">
            <button 
              onClick={() => navigate('/admin')}
              className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
              title="Admin Panel"
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Center Section: Logo */}
          <div className="flex items-center justify-center flex-[2]">
            <img 
              src={logo} 
              alt="Groopy Logo" 
              className="h-16 md:h-24 lg:h-28 w-auto object-contain cursor-pointer transition-all duration-500 hover:scale-110" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
          </div>

          {/* Left Section: Agent & Cart (RTL end) */}
          <div className="flex-1 flex items-center justify-end gap-2 md:gap-4">
            {activeAgent && (
              <button 
                onClick={() => !isAgentLocked && setIsAgentModalOpen(true)}
                disabled={isAgentLocked}
                className={`hidden md:flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-2xl text-slate-500 border border-slate-100 max-h-12 overflow-hidden transition-all ${!isAgentLocked ? 'hover:bg-slate-100 hover:border-slate-200 cursor-pointer active:scale-95' : 'cursor-default'}`}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-200 overflow-hidden shadow-inner flex items-center justify-center">
                   {activeAgent.image ? <img src={activeAgent.image} alt="" className="w-full h-full object-cover" /> : <UserCheck size={14} />}
                </div>
                <span className={`text-xs font-black uppercase tracking-widest leading-none ${!isAgentLocked ? 'underline decoration-primary-500/30' : ''}`}>סוכן: {activeAgent.name}</span>
              </button>
            )}
            
            <button 
              onClick={() => setIsCartOpen(true)}
              className="group relative p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all duration-300"
            >
              <ShoppingCart size={24} className="text-slate-600 group-hover:text-primary-600 group-hover:scale-110 transition-transform" />
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.span 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1.5 -right-1.5 bg-accent-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-lg shadow-accent-200"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>


      {/* 🌌 HERO SEARCH SECTION */}
      <section className="relative pt-2 md:pt-3 pb-6 overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-50/30 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-gradient-to-r from-accent-50/20 to-transparent pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10">
          {/* Constrained Upper Section */}
          <div className="md:max-w-3xl mx-auto">
          {/* Main Title Section */}
          <div className="text-center mb-10 md:mb-14">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-[900] text-slate-900 tracking-tighter leading-[1.1] mb-4">
               בוחרים. מזמינים. <br />
               <span className="text-primary-500 underline decoration-accent-300 decoration-4 md:decoration-8 underline-offset-4">מוכרים.</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base font-bold uppercase tracking-[0.2em]">גרופי מתנות בע"מ</p>
          </div>

          <PromotionBanners onBannerClick={handleBannerClick} allowedBannerIds={allowedBannerIds} />
          </div>

          <div className="max-w-7xl mx-auto">
            <BrandCarousel />
          </div>

          {/* QUICK FILTER BADGES */}
          <div ref={filtersRef} className="grid grid-cols-3 gap-3 md:gap-6 mt-4 md:mt-5 mb-4 md:mb-5 scroll-mt-28 md:scroll-mt-32 max-w-7xl mx-auto">
            {[
              { id: 'is_hot_deal', label: 'מבצעים חמים', icon: Flame, color: { bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', iconBg: 'bg-[#FFE5D3]', iconColor: 'text-[#F4511E]' } },
              { id: 'is_best_seller', label: 'נמכרים ביותר', icon: Star, color: { bg: 'bg-[#E3F2FD]', border: 'border-[#BBDEFB]', iconBg: 'bg-[#C7E9FF]', iconColor: 'text-[#0288D1]' } },
              { id: 'is_new', label: 'מוצרים חדשים', icon: Zap, color: { bg: 'bg-[#FDF2FF]', border: 'border-[#F1D0FF]', iconBg: 'bg-[#EBD2FF]', iconColor: 'text-[#8E24AA]' } },
            ].map((badge) => (
              <button 
                key={badge.id}
                onClick={() => {
                  const isActivating = selectedBadge !== badge.id;
                  setSelectedBadge(isActivating ? badge.id : null);
                  scrollToFilters();
                }}
                className={`group flex flex-col items-center justify-center p-3 md:p-8 rounded-[24px] md:rounded-[40px] border-2 transition-all duration-500 ${
                  selectedBadge === badge.id 
                    ? `${badge.color.bg} ${badge.color.border} scale-[1.02] shadow-xl shadow-slate-200` 
                    : `bg-white border-slate-100 hover:border-slate-200 hover:shadow-lg items-center`
                }`}
              >
                <div className={`w-10 h-10 md:w-16 md:h-16 rounded-full ${badge.color.iconBg} flex items-center justify-center mb-1.5 md:mb-4 transition-all duration-500 group-hover:scale-110 shadow-inner`}>
                  <badge.icon size={20} className={`${badge.color.iconColor} md:w-8 md:h-8`} />
                </div>
                <span className="text-sm md:text-3xl font-[900] text-slate-800 tracking-tight text-center leading-tight whitespace-pre-wrap">{badge.label}</span>
              </button>
            ))}
          </div>

          {/* SEARCH BAR */}
          <div className="relative group mx-auto mb-5 max-w-7xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-200 to-accent-200 rounded-3xl blur-xl opacity-20 group-focus-within:opacity-40 transition-opacity" />
            <div className="relative bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center px-4 py-1.5 focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:border-primary-400 transition-all">
              <div className="bg-slate-50 p-2.5 rounded-2xl text-slate-400 group-focus-within:text-primary-500 transition-colors">
                 <Search size={22} />
              </div>
              <input 
                type="text" 
                placeholder="חפש מוצר, מק״ט או תיאור..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent outline-none px-4 py-4 text-xl font-semibold placeholder:text-slate-400"
              />
            </div>
          </div>

          <div 
            ref={categoryContainerRef}
            className="flex items-center gap-3 mt-4 overflow-x-auto pb-4 thin-scrollbar -mx-6 px-6 md:mx-0 md:px-0 max-w-7xl mx-auto"
          >
            {categories.map((cat, idx) => (
              <button
                key={`cat-${cat}-${idx}`}
                data-active={selectedCategory === cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  scrollToProducts();
                }}
                className={`px-10 py-4 rounded-full text-lg font-black transition-all duration-500 shrink-0 ${
                  selectedCategory === cat 
                    ? 'bg-[#0f172a] text-white shadow-xl shadow-slate-200 scale-[1.02]' 
                    : 'bg-white border border-[#e2e8f0] text-[#64748b] hover:border-[#cbd5e1] hover:bg-slate-50/50'
                }`}
              >
                {cat === 'All' ? 'כל המוצרים' : cat === 'New' ? 'מוצרים חדשים' : cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 📦 PRODUCT GRID */}
      <main ref={mainRef} className="flex-1 container mx-auto px-6 py-12 scroll-mt-24 md:scroll-mt-32">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, idx) => (
              <ProductCard 
                key={product.id || `product-${idx}`} 
                product={product} 
                idx={idx} 
                addToCart={addToCart} 
                onImageClick={() => openProductModal(product)}
                cartCount={cart.find(item => item.id === product.id)?.quantity || 0}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-32 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
            <ShoppingBag size={64} className="mx-auto text-slate-200 mb-6" />
            <h3 className="text-3xl font-black text-slate-800">לא מצאנו מה שחיפשת...</h3>
            <p className="text-lg text-slate-500 mt-2 font-medium">אולי כדאי לנסות מילת חיפוש אחרת? 🤔</p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                setSelectedBadge(null);
              }}
              className="mt-8 text-primary-600 font-bold underline underline-offset-8"
            >
              הצג את כל המוצרים
            </button>
          </div>
        )}
      </main>


      {/* 🚀 FLOATING AGENT STATUS (ABOVE MINI CART) */}
      <FloatingAgentStatus 
        activeAgent={activeAgent}
        onOpenSelector={() => !isAgentLocked && setIsAgentModalOpen(true)}
        totalItems={totalItems}
        isLocked={isAgentLocked}
      />

      {/* 🛒 SIDE CART DRAWER & STICKY CART */}
      <CartDrawer 
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cart={cart}
        removeFromCart={removeFromCart}
        updateQuantity={updateQuantity}
        totalPrice={totalPrice}
        totalItems={totalItems}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerNote={customerNote}
        setCustomerNote={setCustomerNote}
        formError={formError}
        setFormError={setFormError}
        handleWhatsAppSend={handleWhatsAppSend}
        isSent={isSent}
        isSubmitting={isSubmitting}
        activeAgent={activeAgent}
        onOpenAgentSelector={() => !isAgentLocked && setIsAgentModalOpen(true)}
        isAgentLocked={isAgentLocked}
        restorableCart={restorableCart}
        onRestoreCart={handleRestoreCart}
        onDismissRestore={() => setRestorableCart([])}
      />

      {/* 👔 AGENT SELECTOR MODAL */}
      <AgentSelectorModal 
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        agents={agents}
        onSelect={selectAgent}
        activeAgentId={activeAgent?.id}
      />

      {/* 🖼️ PRODUCT DETAIL MODAL */}
      <ProductDetailModal 
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        product={selectedProduct}
        addToCart={addToCart}
        cartCount={cart.find(item => item.id === selectedProduct?.id)?.quantity || 0}
      />

      {/* 🏛️ FOOTER */}
      <footer className="mt-12 md:mt-40 border-t border-slate-100 bg-slate-50/50 pt-8 pb-6 md:py-24">
        <div className="container mx-auto px-6 max-w-5xl text-center">
          {/* Legal Links Moved to Top of Footer */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-10 pb-8 border-b border-slate-200/30">
            <button 
              onClick={() => navigate('/privacy')}
              className="text-xs md:text-sm font-bold text-slate-400 hover:text-primary-600 transition-colors uppercase tracking-widest"
            >
              מדיניות פרטיות
            </button>
            <button 
              onClick={() => navigate('/accessibility')}
              className="text-xs md:text-sm font-bold text-slate-400 hover:text-primary-600 transition-colors uppercase tracking-widest"
            >
              הצהרת נגישות
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
            <div className="flex items-center gap-3">
              <img src={logo} alt="" className="h-10 object-contain" />
            </div>
            <div className="flex gap-8 mt-2 text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-slate-400">
              <span>ייבוא</span>
              <span>•</span>
              <span>הפצה</span>
              <span>•</span>
              <span>אספקה</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 🚀 SCROLL TO TOP BUTTON */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`fixed ${totalItems > 0 ? 'bottom-56' : 'bottom-24'} right-2 md:right-8 z-[60] w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-primary-600 hover:scale-110 active:scale-95 transition-all duration-300 border-4 border-white`}
          >
            <ArrowUp size={24} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>

      <AlertModal 
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
        message={alertConfig.message}
        type={alertConfig.type}
        title={alertConfig.title}
      />
    </div>
  );
};

export default Catalog;
