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
  MapPin, 
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
import { supabase } from './supabaseClient';

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState('');
  
  // 👔 AGENT SYSTEM
  const [activeAgent, setActiveAgent] = useState(null);
  const defaultWhatsApp = "972500000000"; // Fallback number

  // Load persistence
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, [searchParams]);

  const fetchInitialData = async () => {
    // 1. Fetch Products
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (productsData) setProducts(productsData);
    if (productsError) console.error('Error loading products:', productsError);

    // 2. Identify Agent from URL
    const agentId = searchParams.get('agent');
    if (agentId) {
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      if (agentData) setActiveAgent(agentData);
      if (agentError) console.error('Error identified agent:', agentError);
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
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleWhatsAppSend = () => {
    if (!customerName.trim()) {
      setFormError('נא להזין שם לקוח כדי להמשיך');
      return;
    }
    
    setFormError('');
    let message = `*הזמנה חדשה מקטלוג Groopy*\n\n`;
    message += `*שם הלקוח:* ${customerName}\n\n`;
    if (activeAgent) {
      message += `*דרך סוכן:* ${activeAgent.name}\n\n`;
    }
    message += `*פירוט המוצרים:*\n`;
    
    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.name}*\n`;
      message += `   מק"ט: ${item.sku} | כמות: ${item.quantity} | מחיר: ₪${item.price.toFixed(2)}\n`;
      if (index < cart.length - 1) {
        message += `───────────────\n`;
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

          {/* CATEGORIES CHIPS */}
          <div className="flex flex-wrap justify-center gap-3 mt-10">
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
              <motion.div
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={product.id}
                className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group flex flex-col h-full"
              >
                {/* Image Box */}
                <div className="relative aspect-[1/1] bg-slate-50 overflow-hidden m-2 rounded-[24px]">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 group-hover:scale-125 transition-all duration-700">
                      <Package size={120} strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-400/5 to-accent-400/5" />
                  
                  {/* Floating Badges */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-[900] text-slate-400 shadow-sm border border-white/50">
                      {product.sku}
                    </div>
                    {product.location && (
                      <div className="bg-primary-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-primary-200">
                        <MapPin size={10} />
                        {product.location}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Content */}
                <div className="p-6 pt-2 flex flex-col flex-1">
                  <span className="text-[10px] font-black text-accent-500 uppercase tracking-widest mb-2">
                    {product.category === 'Bottles' ? 'Premium Bottles' : 'Food Storage'}
                  </span>
                  <h3 className="font-bold text-lg text-slate-800 leading-snug mb-3 min-h-[3rem] line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium italic mb-6">
                    {product.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-400 block -mb-1">מחיר יחידה</span>
                      <span className="text-2xl font-black text-slate-900">₪{product.price.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => addToCart(product)}
                      className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-primary-600 hover:scale-110 active:scale-95 shadow-xl shadow-slate-100 hover:shadow-primary-100 transition-all duration-300"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
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

      {/* 🛒 PREMIUM SIDE CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50"
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-50 shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.3)] flex flex-col"
            >
              {/* Cart Header */}
              <div className="p-8 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-800">
                    <ShoppingBag size={28} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">הסל שלך</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{totalItems} פריטים נבחרו</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 rounded-2xl transition-colors text-slate-400 hover:text-slate-900"
                >
                  <X size={32} />
                </button>
              </div>

              {/* Cart Items Area */}
              <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 scrollbar-hide">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <div className="p-12 bg-slate-50 rounded-full mb-6">
                      <ShoppingBag size={80} strokeWidth={1} />
                    </div>
                    <p className="text-xl font-bold">הסל ריק כרגע...</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={item.id} 
                      className="flex gap-6 group relative"
                    >
                      {/* Item Image */}
                      <div className="w-24 h-24 bg-slate-50 rounded-3xl flex-shrink-0 flex items-center justify-center border border-slate-100 overflow-hidden relative group-hover:scale-105 transition-transform">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={40} className="opacity-10" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/5 to-accent-500/5" />
                      </div>
                      
                      {/* Item Meta */}
                      <div className="flex-1 py-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 text-lg leading-tight line-clamp-2 max-w-[80%]">
                            {item.name}
                          </h4>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 font-black mb-4 uppercase tracking-widest">
                          מק״ט: {item.sku}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white transition-all text-slate-800 active:scale-90"
                            >
                              <Minus size={18} />
                            </button>
                            <span className="w-10 text-center font-black text-xl text-slate-900">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white transition-all text-slate-800 active:scale-90"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] font-black text-slate-400 uppercase mb-0.5">סה״כ פריט</div>
                             <div className="font-black text-2xl text-slate-900 tracking-tight">₪{(item.price * item.quantity).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Cart Footer Checkout */}
              {cart.length > 0 && (
                <div className="p-8 bg-slate-50/80 backdrop-blur-3xl border-t border-slate-100 space-y-8 rounded-t-[40px] shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)]">
                  {/* Name Input */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-widest pl-2">
                       <CheckCircle size={14} className={customerName.length > 2 ? 'text-primary-500' : 'text-slate-300'} />
                       שם הלקוח המזמין
                    </label>
                    <input 
                      type="text" 
                      placeholder="הכנס את שמך כאן..."
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (formError) setFormError('');
                      }}
                      className={`w-full bg-white border ${formError ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-200'} rounded-3xl px-6 py-5 outline-none focus:border-primary-500 focus:ring-[10px] focus:ring-primary-500/5 transition-all font-bold text-lg`}
                    />
                    <AnimatePresence>
                      {formError && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-red-500 text-xs font-black uppercase tracking-widest mt-2 pr-2"
                        >
                          {formError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Pricing Summary */}
                  <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center text-slate-400 font-bold text-sm mb-4">
                      <span>סה״כ פריטים:</span>
                      <span className="bg-slate-50 px-3 py-1 rounded-lg text-slate-800">{totalItems}</span>
                    </div>
                    <div className="flex justify-between items-end border-t border-slate-50 pt-6">
                      <div>
                        <span className="block text-xs font-black text-primary-500 uppercase tracking-wider mb-1">לתשלום סופי</span>
                        <span className="text-4xl font-[1000] text-slate-900 tracking-tighter">₪{totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <TrendingDown size={32} className="text-primary-100 -mb-2" />
                      </div>
                    </div>
                  </div>

                  {/* SEND BUTTON */}
                  <button 
                    onClick={handleWhatsAppSend}
                    className={`btn-primary w-full py-6 flex items-center justify-center gap-4 group relative overflow-hidden ${isSent ? 'bg-green-500' : ''}`}
                  >
                    <span className="relative z-10 font-black text-xl tracking-tight">
                      {activeAgent ? `שליחת הזמנה לוואטסאפ של ${activeAgent.name}` : 'שליחת הזמנה לוואטסאפ'}
                    </span>
                    <Send size={24} className="relative z-10 -rotate-45 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-700 skew-x-12" />
                  </button>
                  
                  <p className="text-[10px] text-center text-slate-400 font-black px-6 leading-relaxed uppercase tracking-widest opacity-60">
                    הלחיצה תפתח את אפליקציית הוואטסאפ עם ההזמנה המוכנה שלך
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🚀 STICKY MINI CART (MOBILE ONLY) */}
      <AnimatePresence>
        {totalItems > 0 && !isCartOpen && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-8 left-0 right-0 z-40 px-6 pointer-events-none"
          >
            <button 
              onClick={() => setIsCartOpen(true)}
              className="pointer-events-auto max-w-sm mx-auto w-full glass-card border-none bg-slate-900 border-slate-800 text-white p-4 rounded-[28px] shadow-2xl flex items-center justify-between group overflow-hidden"
            >
              <div className="flex items-center gap-4 relative z-10 pl-2">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">הסל שלך</div>
                  <div className="font-black text-2xl tracking-tighter">₪{totalPrice.toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 pr-4 relative z-10">
                <div className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl font-black text-sm tracking-tight transition-all">
                  סיום הזמנה
                </div>
                <ChevronDown className="-rotate-90 text-primary-400" size={24} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
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
              <span>Import</span>
              <span>•</span>
              <span>Distribution</span>
              <span>•</span>
              <span>Supply</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Catalog;
