import React, { useState, useMemo, useEffect } from 'react';
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
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AgentBanner from '../components/catalog/AgentBanner';
import ProductCard from '../components/catalog/ProductCard';
import CartDrawer from '../components/catalog/CartDrawer';

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('groopy_customer_name') || '');
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState('');

  // 🖼️ Image Handlers
  const openImageModal = (imageUrl, productName) => {
    setSelectedImage(imageUrl);
    setSelectedProductName(productName);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setSelectedProductName('');
  };
  
  // 👔 AGENT SYSTEM
  const [activeAgent, setActiveAgent] = useState(null);
  const defaultWhatsApp = "972500000000"; // Fallback number

  // Load persistence
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, [searchParams]);

  // 💾 PERSIST CUSTOMER NAME
  useEffect(() => {
    if (customerName) {
      localStorage.setItem('groopy_customer_name', customerName);
    }
  }, [customerName]);

  const fetchInitialData = async () => {
    // 1. Fetch Products
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (productsData) setProducts(productsData);
    if (productsError) console.error('Error loading products:', productsError);

    // 2. Identify Agent from URL (ULTRA-Greedy approach)
    let agentId = null;
    const fullHref = window.location.href;
    
    // Look for 'agent=' anywhere in the entire URL string
    const urlMatches = fullHref.match(/[?&]agent=([^&#]+)/);
    if (urlMatches && urlMatches[1]) {
      agentId = decodeURIComponent(urlMatches[1]);
    } else {
      // Last-ditch effort: check hash directly without assuming standard param format
      const hashContent = window.location.hash;
      if (hashContent.includes('agent=')) {
        const parts = hashContent.split('agent=');
        if (parts.length > 1) {
          agentId = parts[1].split('&')[0].split('?')[0];
          agentId = decodeURIComponent(agentId);
        }
      }
    }

    if (agentId) {
      console.log('🔍 Agent ID detected from URL:', agentId);
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      if (agentData) {
        setActiveAgent(agentData);
        console.log('✅ Agent Connected Successfully:', agentData.name);
      } else {
        console.warn('⚠️ Agent ID not found in Supabase:', agentId);
        setActiveAgent(null);
      }
      if (agentError) console.error('❌ Supabase Agent Fetch Error:', agentError);
    } else {
      console.log('ℹ️ No agent parameter found in URL:', fullHref);
      setActiveAgent(null);
    }
  }

  // Categories Calculation
  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category))], [products]);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, products]);

  // Cart Management
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 12 } : item);
      }
      return [...prev, { ...product, quantity: 12 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        // Adjust delta to 12 if it's 1 or -1 for consistency (or just multiply delta by 12)
        const adjustedDelta = delta === 1 ? 12 : delta === -1 ? -12 : delta;
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

    // 💾 SAVE TO SUPABASE (BACKGROUND)
    // We fire this in the background and don't await it to ensure immediate WhatsApp redirection
    supabase.from('orders').insert({
      customer_name: customerName,
      items: cart,
      total_price: totalPrice,
      agent_id: activeAgent?.id || null,
      agent_name: activeAgent?.name || null,
      status: 'New'
    }).then(({ error }) => {
      if (error) console.error('❌ Error saving order to Supabase:', error);
      else console.log('✅ Order saved successfully to Supabase');
      setIsSubmitting(false);
    }).catch(err => {
      console.error('❌ Unexpected error saving order:', err);
      setIsSubmitting(false);
    });

    let message = `*הזמנה חדשה מקטלוג Groopy*\n\n`;
    message += `*שם הלקוח:* ${customerName}\n\n`;
    if (activeAgent) {
      message += `*דרך סוכן:* ${activeAgent.name}\n\n`;
    }
    message += `*פירוט המוצרים:*\n`;
    
    cart.forEach((item, index) => {
      message += `.${index + 1}\n`;
      message += `*${item.name}*\n`;
      message += `   מק"ט: ${item.sku} | כמות: ${item.quantity} יחידות - (${item.quantity / 12} קרטון)\n`;
      message += `   מחיר יחידה: ₪${item.price.toFixed(2)} | סה"כ לתשלום: ₪${(item.price * item.quantity).toFixed(2)}\n`;
      if (index < cart.length - 1) {
        message += `────────\n`;
      }
    });
    
    message += `\n*סה"כ לתשלום:* ₪${totalPrice.toFixed(2)}\n\n`;
    message += `נא ליצור איתי קשר לתיאום אספקה. תודה!`;

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

  return (
    <div className="min-h-screen bg-[#FDFDFE] text-slate-900 overflow-x-hidden" dir="rtl">
      {/* 🧭 PREMIUM NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-3xl border-b border-slate-100">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm overflow-hidden">
                <img src={`${import.meta.env.BASE_URL}logo.png?v=2`} alt="Groopy Logo" className="w-full h-full object-contain p-1" />
              </div>
              <div>
                <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-l from-slate-900 to-slate-600 tracking-tighter leading-none mb-0.5">
                  Groopy
                </h1>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">קטלוג מוצרים</span>
              </div>
            </div>

            {/* Admin Access Icon */}
            <button 
              onClick={() => navigate('/admin')}
              className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
              title="Admin Panel"
            >
              <Settings size={18} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {activeAgent && (
              <div className="hidden md:flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-2xl text-slate-500 border border-slate-100 max-h-12 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-slate-200 overflow-hidden shadow-inner flex items-center justify-center">
                   {activeAgent.image ? <img src={activeAgent.image} alt="" className="w-full h-full object-cover" /> : <UserCheck size={14} />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">סוכן: {activeAgent.name}</span>
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
                    className="absolute -top-1.5 -right-1.5 bg-accent-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-lg shadow-accent-200"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* 👔 AGENT INDICATOR */}
      <AgentBanner activeAgent={activeAgent} />

      {/* 🌌 HERO SEARCH SECTION */}
      <section className="relative pt-12 pb-20 overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-50/30 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-gradient-to-r from-accent-50/20 to-transparent pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 max-w-3xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-[900] text-slate-900 mb-4 tracking-tight leading-tight">
              מצא את המוצר <span className="text-primary-500 underline decoration-accent-300 decoration-8 underline-offset-4">המושלם</span> עבורך
            </h2>
            <p className="text-slate-500 text-lg font-medium">גרופי מתנות בע"מ - Uzspace & Superfood</p>
          </motion.div>

          {/* SEARCH BAR */}
          <div className="relative group max-w-xl mx-auto">
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
                className="w-full bg-transparent outline-none px-4 py-4 text-lg font-semibold placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* CATEGORIES CHIPS - Scrollable on mobile */}
          <div className="flex overflow-x-auto md:flex-wrap md:justify-center gap-3 mt-10 pb-4 md:pb-0 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-8 py-3 rounded-2xl text-sm font-black transition-all duration-300 ${
                  selectedCategory === cat 
                    ? 'bg-slate-900 text-white shadow-2xl scale-105' 
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {cat === 'All' ? 'כל המוצרים' : cat === 'Bottles' ? 'בקבוקים' : 'קופסאות אוכל'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 📦 PRODUCT GRID */}
      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, idx) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                idx={idx} 
                addToCart={addToCart} 
                onImageClick={openImageModal}
                cartCount={cart.find(item => item.id === product.id)?.quantity || 0}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-32 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
            <ShoppingBag size={64} className="mx-auto text-slate-200 mb-6" />
            <h3 className="text-2xl font-black text-slate-800">לא מצאנו מה שחיפשת...</h3>
            <p className="text-slate-500 mt-2 font-medium">אולי כדאי לנסות מילת חיפוש אחרת? 🤔</p>
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-8 text-primary-600 font-bold underline underline-offset-8"
            >
              הצג את כל המוצרים
            </button>
          </div>
        )}
      </main>


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
        formError={formError}
        setFormError={setFormError}
        handleWhatsAppSend={handleWhatsAppSend}
        isSent={isSent}
        isSubmitting={isSubmitting}
        activeAgent={activeAgent}
      />

      {/* 🖼️ IMAGE MODAL */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-2xl"
            onClick={closeImageModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-5xl w-full max-h-full bg-white rounded-[48px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/20 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button UI */}
              <button 
                onClick={closeImageModal}
                className="absolute top-8 left-8 z-10 w-14 h-14 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-900 hover:bg-white hover:scale-110 active:scale-95 transition-all duration-500 shadow-2xl border border-white"
              >
                <X size={28} />
              </button>
              
              {/* Info Badge */}
              <div className="absolute top-8 right-8 z-10 px-8 py-4 bg-white/90 backdrop-blur-md rounded-2xl border border-white shadow-2xl">
                <p className="text-slate-900 font-[900] text-lg tracking-tight">{selectedProductName}</p>
              </div>

              {/* Full Image */}
              <img 
                src={selectedImage} 
                alt={selectedProductName} 
                className="w-full h-full object-contain max-h-[85vh] p-4 md:p-12 cursor-default"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🏛️ FOOTER */}
      <footer className="mt-40 border-t border-slate-100 bg-slate-50/50 py-24">
        <div className="container mx-auto px-6 max-w-5xl text-center">
          <div className="flex flex-col items-center gap-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
            <div className="flex items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}logo.png?v=2`} alt="" className="h-10 object-contain" />
            </div>
            <div className="flex gap-12 mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              <span>Supply</span>
              <span>•</span>
              <span>Distribution</span>
              <span>•</span>
              <span>Import</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Catalog;
