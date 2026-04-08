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
  ArrowUp
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

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
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
  
  // 🏷️ PRODUCT MODAL STATE
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [selectedBadge, setSelectedBadge] = useState(null); // 'is_clearing', 'is_best_seller', 'is_hot_deal'
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainRef = useRef(null);
  const filtersRef = useRef(null);

  const scrollToFilters = () => {
    filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToProducts = () => {
    mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const defaultWhatsApp = "972500000000"; // Fallback number

  // Load persistence
  const [products, setProducts] = useState([]);
  const currentAgentRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    fetchInitialData();
    return () => {
      isMounted.current = false;
    };
  }, [searchParams]);

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

  const fetchInitialData = async () => {
    try {
      // 1. Fetch Products & Agents in parallel
      const [productsRes, agentsRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('agents').select('*').order('name')
      ]);

      if (!isMounted.current) return;

      if (productsRes.data) setProducts(productsRes.data);
      if (productsRes.error) console.error('Error loading products:', productsRes.error);

      if (agentsRes.data) setAgents(agentsRes.data);
      if (agentsRes.error) console.error('Error loading agents:', agentsRes.error);

      const agentsData = agentsRes.data;

      // 2. Identify Agent from URL or LocalStorage
      let agentIdFromURL = null;
      const fullHref = window.location.href;
      const urlMatches = fullHref.match(/[?&]agent=([^&#]+)/);
      if (urlMatches && urlMatches[1]) {
        agentIdFromURL = decodeURIComponent(urlMatches[1]);
      }

      const savedAgentId = localStorage.getItem('groopy_agent_id');

      if (agentIdFromURL && (!currentAgentRef.current || currentAgentRef.current.id !== agentIdFromURL)) {
        console.log(`🔍 Attempting to connect agent: ${agentIdFromURL}`);
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentIdFromURL)
          .single();

        if (!agentError && agentData && isMounted.current) {
          console.log(`✅ Agent Connected Successfully: ${agentData.name}`);
          setActiveAgent(agentData);
          currentAgentRef.current = agentData;
          localStorage.setItem('groopy_agent_id', agentIdFromURL);
        }
      } else if (savedAgentId && (!currentAgentRef.current || currentAgentRef.current.id !== savedAgentId)) {
        const matchedAgent = agentsData?.find(a => a.id === savedAgentId);
        if (matchedAgent) {
          setActiveAgent(matchedAgent);
          currentAgentRef.current = matchedAgent;
        }
      } else if (!agentIdFromURL && !savedAgentId) {
        setActiveAgent(null);
        currentAgentRef.current = null;
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
    const rawCategories = [...new Set(products.map(p => p.category))];
    return ['All', ...new Set(rawCategories)];
  }, [products]);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const normalizedProductCat = product.category;
        
      let matchesCategory = false;
      if (selectedCategory === 'All') {
        matchesCategory = true;
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
    const finalQuantity = quantity ?? product.default_quantity ?? 12;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + finalQuantity } : item);
      }
      return [...prev, { ...product, quantity: finalQuantity }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const step = item.default_quantity || 12;
        const adjustedDelta = delta === 1 ? step : delta === -1 ? -step : delta;
        const newQty = Math.max(0, item.quantity + adjustedDelta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
      message += `\u200Fכמות: ${item.quantity} יחידות (${item.quantity / 12} קרטון)\n`;
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
              <div className="hidden md:flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-2xl text-slate-500 border border-slate-100 max-h-12 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-slate-200 overflow-hidden shadow-inner flex items-center justify-center">
                   {activeAgent.image ? <img src={activeAgent.image} alt="" className="w-full h-full object-cover" /> : <UserCheck size={14} />}
                </div>
                <span className="text-xs font-black uppercase tracking-widest leading-none">סוכן: {activeAgent.name}</span>
              </div>
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

          <PromotionBanners onBannerClick={handleBannerClick} />
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
            className="flex items-center gap-3 mt-4 overflow-x-auto pb-4 thin-scrollbar -mx-6 px-6 md:mx-0 md:px-0 max-w-7xl mx-auto"
          >
            {categories.map((cat, idx) => (
              <button
                key={`cat-${cat}-${idx}`}
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
        onOpenSelector={() => setIsAgentModalOpen(true)}
        totalItems={totalItems}
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
        onOpenAgentSelector={() => setIsAgentModalOpen(true)}
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
              <span>אספקה</span>
              <span>•</span>
              <span>הפצה</span>
              <span>•</span>
              <span>ייבוא</span>
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
    </div>
  );
};

export default Catalog;
