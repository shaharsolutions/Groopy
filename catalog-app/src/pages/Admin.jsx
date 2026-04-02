import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Package, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Share2, 
  Link as ChainLink, 
  ChevronRight, 
  Lock,
  Search,
  Phone,
  User,
  Check,
  Image,
  Tag,
  Eye,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [confirmingProductDelete, setConfirmingProductDelete] = useState(null);
  const [confirmingAgentDelete, setConfirmingAgentDelete] = useState(null);
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [confirmingCategoryDelete, setConfirmingCategoryDelete] = useState(null);
  
  // Orders State
  const [orders, setOrders] = useState([]);
  const [confirmingOrderDelete, setConfirmingOrderDelete] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // New states for form inputs
  const [newAgent, setNewAgent] = useState({ name: '', phone: '', image: '' });
  const [newProduct, setNewProduct] = useState({ id: '', name: '', sku: '', price: '', category: 'Bottles', location: '', description: '', image: '' });

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Fetch Products
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (productsData) setProducts(productsData);
    if (productsError) console.error('Error fetching products:', productsError);

    // 2. Fetch Agents
    const { data: agentsData, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .order('name');
    
    if (agentsData) setAgents(agentsData);
    if (agentsError) console.error('Error fetching agents:', agentsError);

    // 3. Fetch Categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (categoriesData) setCategories(categoriesData);
    if (categoriesError) {
      console.warn('Error fetching categories (maybe table does not exist):', categoriesError);
      // Fallback categories if table doesn't exist yet
      if (categories.length === 0) {
        setCategories([{ id: '1', name: 'בקבוקים' }, { id: '2', name: 'קופסאות אוכל' }]);
      }
    }

    // 4. Fetch Orders
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (ordersData) setOrders(ordersData);
    if (ordersError) console.error('Error fetching orders:', ordersError);
  }

  // Product Actions
  const handleAddProduct = async () => {
    const finalProduct = { 
      id: newProduct.sku || Date.now().toString(), 
      ...newProduct, 
      price: parseFloat(newProduct.price) 
    };

    const { error } = await supabase.from('products').insert([finalProduct]);
    if (!error) {
      setProducts([...products, finalProduct]);
      setIsAddingProduct(false);
      setNewProduct({ id: '', name: '', sku: '', price: '', category: 'Bottles', location: '', description: '', image: '' });
    } else {
      console.error('Error adding product:', error);
    }
  }

  const handleDeleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(products.filter(p => p.id !== id));
      setConfirmingProductDelete(null);
    } else {
      console.error('Error deleting product:', error);
    }
  }

  const handleUpdateProduct = async (updated) => {
    const { error } = await supabase.from('products').update(updated).eq('id', updated.id);
    if (!error) {
      setProducts(products.map(p => p.id === updated.id ? updated : p));
      setEditingProduct(null);
    } else {
      console.error('Error updating product:', error);
    }
  }

  // Agent Actions
  const handleAddAgent = async () => {
    const agent = { id: Date.now().toString(), ...newAgent };
    const { error } = await supabase.from('agents').insert([agent]);
    if (!error) {
      setAgents([...agents, agent]);
      setIsAddingAgent(false);
      setNewAgent({ name: '', phone: '', image: '' });
    } else {
      console.error('Error adding agent:', error);
    }
  }

  const handleDeleteAgent = async (id) => {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (!error) {
      setAgents(agents.filter(a => a.id !== id));
      setConfirmingAgentDelete(null);
    } else {
      console.error('Error deleting agent:', error);
    }
  }

  // Category Actions
  const handleAddCategory = async () => {
    const category = { id: Date.now().toString(), ...newCategory };
    const { error } = await supabase.from('categories').insert([category]);
    if (!error) {
      setCategories([...categories, category]);
      setIsAddingCategory(false);
      setNewCategory({ name: '' });
    } else {
      console.error('Error adding category:', error);
    }
  }

  const handleDeleteCategory = async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      setCategories(categories.filter(c => c.id !== id));
      setConfirmingCategoryDelete(null);
    } else {
      console.error('Error deleting category:', error);
    }
  }

  const handleUpdateCategory = async (updated) => {
    const { error } = await supabase.from('categories').update(updated).eq('id', updated.id);
    if (!error) {
      setCategories(categories.map(c => c.id === updated.id ? updated : c));
      setEditingCategory(null);
    } else {
      console.error('Error updating category:', error);
    }
  }

  const handleUpdateAgent = async (updated) => {
    const { error } = await supabase.from('agents').update(updated).eq('id', updated.id);
    if (!error) {
      setAgents(agents.map(a => a.id === updated.id ? updated : a));
      setEditingAgent(null);
    } else {
      console.error('Error updating agent:', error);
    }
  }

  // Order Actions
  const handleDeleteOrder = async (id) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) {
      setOrders(orders.filter(o => o.id !== id));
      setConfirmingOrderDelete(null);
    } else {
      console.error('Error deleting order:', error);
    }
  }

  const handleUpdateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) {
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
    } else {
      console.error('Error updating order status:', error);
    }
  }

  const copyAgentLink = (id) => {
    const origin = window.location.origin;
    const base = import.meta.env.BASE_URL;
    // Ensure base starts and ends with / appropriately
    const fullBase = base.startsWith('/') ? base : `/${base}`;
    const link = `${origin}${fullBase}${fullBase.endsWith('/') ? '' : '/'}#/?agent=${id}`;
    navigator.clipboard.writeText(link);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row" dir="rtl">
      {/* 🏙️ SIDEBAR OVERLAY (MOBILE) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* 🏙️ SIDEBAR */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-slate-200 flex flex-col p-8 transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-[100%] md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm overflow-hidden p-1 border border-slate-100">
              <img src={`${import.meta.env.BASE_URL}logo.png?v=2`} alt="Groopy Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-xl text-slate-800 tracking-tight">ניהול קטלוג</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">קטלוג מוצרים</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-900 md:hidden"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="space-y-3">
          <button 
            onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
              activeTab === 'products' 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <Package size={20} />
              <span className="font-black text-sm">מוצרים במלאי</span>
            </div>
            <ChevronRight size={16} className={activeTab === 'products' ? '' : 'text-slate-300'} />
          </button>

          <button 
            onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
              activeTab === 'orders' 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <ShoppingBag size={20} />
              <span className="font-black text-sm">ניהול הזמנות</span>
            </div>
            <div className="flex items-center gap-2">
              {orders.filter(o => o.status === 'New').length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {orders.filter(o => o.status === 'New').length}
                </span>
              )}
              <ChevronRight size={16} className={activeTab === 'orders' ? '' : 'text-slate-300'} />
            </div>
          </button>

          <button 
            onClick={() => { setActiveTab('agents'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
              activeTab === 'agents' 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <Users size={20} />
              <span className="font-black text-sm">ניהול סוכנים</span>
            </div>
            <ChevronRight size={16} className={activeTab === 'agents' ? '' : 'text-slate-300'} />
          </button>

          <button 
            onClick={() => { setActiveTab('categories'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
              activeTab === 'categories' 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <Tag size={20} />
              <span className="font-black text-sm">ניהול קטגוריות</span>
            </div>
            <ChevronRight size={16} className={activeTab === 'categories' ? '' : 'text-slate-300'} />
          </button>
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-100">
           <Link 
            to="/"
            className="flex items-center gap-3 text-slate-400 hover:text-slate-900 font-bold text-xs transition-colors"
           >
             <ChevronRight /> חזרה לממשק הלקוח
           </Link>
        </div>
      </aside>

      {/* 📜 MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="flex items-center justify-between gap-6 w-full md:w-auto">
            <div className="flex items-center md:hidden">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-600"
              >
                <div className="space-y-1.5 w-6">
                  <div className="h-0.5 w-6 bg-current rounded-full" />
                  <div className="h-0.5 w-4 bg-current rounded-full" />
                  <div className="h-0.5 w-6 bg-current rounded-full" />
                </div>
              </button>
            </div>
            
            <div className="text-right md:text-right">
               <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mb-2">
                 {activeTab === 'products' ? 'ניהול מוצרים' : 
                  activeTab === 'agents' ? 'רשת הסוכנים' : 
                  activeTab === 'orders' ? 'ניהול הזמנות' : 'ניהול קטגוריות'}
               </h2>
               <p className="text-slate-400 font-bold text-sm whitespace-nowrap">
                 {activeTab === 'products' ? `סה״כ ${products.length} מוצרים רשומים` : 
                  activeTab === 'agents' ? `רשימת סוכנים וקישורי הפצה` : 
                  activeTab === 'orders' ? `מעקב אחר הזמנות שבוצעו בוואטסאפ` : 'עריכת קטגוריות המוצרים בקטלוג'}
               </p>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-3 md:gap-4 w-full md:w-auto">
            {activeTab !== 'orders' && (
              <button 
                onClick={() => {
                  if (activeTab === 'products') setIsAddingProduct(true);
                  else if (activeTab === 'agents') setIsAddingAgent(true);
                  else setIsAddingCategory(true);
                }}
                className="flex-1 md:flex-none btn-primary w-full md:w-fit flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                <span className="whitespace-nowrap">
                  {activeTab === 'products' ? 'מוצר חדש' : 
                  activeTab === 'agents' ? 'סוכן חדש' : 'קטגוריה חדשה'}
                </span>
              </button>
            )}
            
            <Link 
              to="/"
              className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 px-5 md:px-6 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm group"
            >
              <Eye size={20} className="group-hover:scale-110 transition-transform" />
              <span className="whitespace-nowrap">חזרה לקטלוג</span>
            </Link>
          </div>
        </header>

        {/* 📋 PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6">
             <div className="relative mb-8 max-w-md">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="חיפוש מהיר..."
                  className="w-full bg-white border border-slate-200 rounded-2xl pr-12 pl-6 py-3 font-bold text-sm outline-none focus:border-primary-400 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>

             <div className="flex md:hidden items-center justify-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest pb-4">
                <span>החלק ימינה לצפייה בפרטים</span>
                <ChevronRight size={12} className="animate-pulse" />
             </div>
             
             <div className="bg-white rounded-[32px] border border-slate-200 overflow-x-auto shadow-sm scrollbar-hide">
                <table className="w-full text-right border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                      <th className="px-8 py-5">תמונה/סוג</th>
                      <th className="px-8 py-5">שם המוצר</th>
                      <th className="px-8 py-5">מק״ט</th>
                      <th className="px-8 py-5">מחיר (₪)</th>
                      <th className="px-8 py-5">מיקום</th>
                      <th className="px-8 py-5">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div 
                            className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 overflow-hidden cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-sm border border-slate-100 group/img"
                            onClick={() => p.image && openImageModal(p.image, p.name)}
                          >
                             {p.image ? (
                               <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                             ) : (
                               p.category === 'Bottles' ? <Package size={20} /> : <Package size={20} />
                             )}
                          </div>
                        </td>
                        <td className="px-8 py-5 font-black text-slate-800 text-sm">{p.name}</td>
                        <td className="px-8 py-5 font-bold text-slate-400 text-xs">{p.sku}</td>
                        <td className="px-8 py-5 font-black text-slate-900">{p.price.toFixed(2)}</td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-500 text-[10px] font-black">{p.location || '-'}</span>
                        </td>
                         <td className="px-8 py-5">
                          <AnimatePresence mode="wait">
                            {confirmingProductDelete === p.id ? (
                              <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex items-center gap-2 bg-red-50 p-2 rounded-xl"
                              >
                                <span className="text-[10px] font-black text-red-500 whitespace-nowrap">למחוק?</span>
                                <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition-colors"><Check size={14} /></button>
                                <button onClick={() => setConfirmingProductDelete(null)} className="bg-slate-200 text-slate-500 p-1.5 rounded-lg hover:bg-slate-300 transition-colors"><X size={14} /></button>
                              </motion.div>
                            ) : (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              >
                                <button onClick={() => setEditingProduct(p)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all"><Edit size={18} /></button>
                                <button onClick={() => setConfirmingProductDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all"><Trash2 size={18} /></button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* 👥 AGENTS TAB */}
        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agents.map(agent => (
              <motion.div 
                layout
                key={agent.id}
                className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm relative group overflow-hidden"
              >
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-16 h-16 bg-gradient-to-tr from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center text-slate-400 shadow-inner overflow-hidden">
                    {agent.image ? (
                      <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={28} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{agent.name}</h3>
                    <p className="text-slate-400 font-bold text-xs">{agent.phone}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-50">
                   <button 
                     onClick={() => copyAgentLink(agent.id)}
                     className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-primary-500 hover:text-white rounded-2xl transition-all group/link"
                   >
                     <div className="flex items-center gap-3">
                        {copyFeedback === agent.id ? <Check size={18} /> : <ChainLink size={18} />}
                        <span className="font-black text-xs">{copyFeedback === agent.id ? 'הועתק!' : 'העתק קישור לקטלוג'}</span>
                     </div>
                     <Share2 size={14} className="opacity-40 group-hover/link:opacity-100" />
                   </button>
                   
                    <div className="flex gap-4 pt-2">
                     {confirmingAgentDelete === agent.id ? (
                       <div className="w-full flex items-center justify-center gap-4 bg-red-50 py-3 rounded-xl border border-red-100">
                         <span className="font-black text-[10px] text-red-500 tracking-widest">מחיקה?</span>
                         <div className="flex gap-2">
                           <button onClick={() => handleDeleteAgent(agent.id)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black hover:bg-red-600 transition-colors">כן</button>
                           <button onClick={() => setConfirmingAgentDelete(null)} className="bg-slate-200 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black hover:bg-slate-300 transition-colors">בטל</button>
                         </div>
                       </div>
                     ) : (
                       <>
                         <button 
                           onClick={() => setEditingAgent(agent)}
                           className="flex-1 py-3 text-center text-slate-400 hover:text-primary-600 font-bold text-[10px] uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
                         >
                           עריכת סוכן
                         </button>
                         <button 
                          onClick={() => setConfirmingAgentDelete(agent.id)}
                          className="flex-1 py-3 text-center text-red-300 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
                         >
                           מחיקת סוכן
                         </button>
                       </>
                     )}
                    </div>
                </div>

                <div className="absolute top-4 left-4 flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
              </motion.div>
            ))}
            
            {agents.length === 0 && (
              <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-[40px] opacity-30">
                <Users size={64} className="mx-auto mb-4" />
                <p className="font-black text-xl">אין סוכנים רשומים... עדיין</p>
              </div>
            )}
          </div>
        )}
        {/* 📋 CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map(cat => (
              <motion.div 
                layout
                key={cat.id}
                className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm relative group overflow-hidden"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center shadow-inner">
                    <Tag size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{cat.name}</h3>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-50 flex gap-4">
                  {confirmingCategoryDelete === cat.id ? (
                     <div className="w-full flex items-center justify-between gap-4 bg-red-50 p-4 rounded-2xl">
                       <span className="font-black text-xs text-red-500">למחוק קטגוריה?</span>
                       <div className="flex gap-2">
                         <button onClick={() => handleDeleteCategory(cat.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black">מחק</button>
                         <button onClick={() => setConfirmingCategoryDelete(null)} className="bg-slate-200 text-slate-500 px-4 py-2 rounded-xl text-xs font-black">ביטול</button>
                       </div>
                     </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => setEditingCategory(cat)}
                        className="flex-1 py-4 text-center text-slate-400 hover:text-primary-600 font-bold text-[10px] uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
                      >
                        עריכה
                      </button>
                      <button 
                        onClick={() => setConfirmingCategoryDelete(cat.id)}
                        className="flex-1 py-4 text-center text-red-300 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
                      >
                        מחיקה
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 🛍️ ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
             <div className="bg-white rounded-[32px] border border-slate-200 overflow-x-auto shadow-sm scrollbar-hide">
                <table className="w-full text-right border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                      <th className="px-8 py-5">תאריך והזמנה</th>
                      <th className="px-8 py-5">שם הלקוח</th>
                      <th className="px-8 py-5">סוכן</th>
                      <th className="px-8 py-5">סה״כ לתשלום</th>
                      <th className="px-8 py-5">סטטוס</th>
                      <th className="px-8 py-5">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map(order => (
                      <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800">
                              {new Date(order.created_at).toLocaleDateString('he-IL')}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(order.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 font-black text-slate-800 text-sm">{order.customer_name}</td>
                        <td className="px-8 py-5">
                           <span className="font-bold text-slate-500 text-xs">{order.agent_name || 'ישיר'}</span>
                        </td>
                        <td className="px-8 py-5 font-black text-slate-900">₪{order.total_price.toFixed(2)}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                             {order.status === 'New' ? (
                               <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">
                                 <Clock size={10} /> חדש
                               </span>
                             ) : order.status === 'Completed' ? (
                               <span className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black">
                                 <CheckCircle2 size={10} /> הושלם
                               </span>
                             ) : (
                               <span className="flex items-center gap-1.5 bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black">
                                 <AlertCircle size={10} /> {order.status}
                               </span>
                             )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedOrder(order)}
                              className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all font-black text-[10px]"
                            >
                              צפייה בפרטים
                            </button>
                            
                            <select 
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className="bg-transparent border-none text-[10px] font-black text-slate-400 outline-none cursor-pointer hover:text-slate-900"
                            >
                              <option value="New">חדש</option>
                              <option value="Completed">הושלם</option>
                              <option value="Canceled">בוטל</option>
                            </select>

                            <AnimatePresence mode="wait">
                              {confirmingOrderDelete === order.id ? (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="flex gap-1"
                                >
                                  <button onClick={() => handleDeleteOrder(order.id)} className="p-1 text-red-500"><Check size={14} /></button>
                                  <button onClick={() => setConfirmingOrderDelete(null)} className="p-1 text-slate-400"><X size={14} /></button>
                                </motion.div>
                              ) : (
                                <button onClick={() => setConfirmingOrderDelete(order.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}
      </main>

      {/* 🗳️ ADD PRODUCT MODAL */}
      <AnimatePresence>
        {isAddingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md overflow-y-auto pt-20 pb-20">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-2xl p-8 md:p-12 shadow-2xl relative my-auto shadow-primary-500/10"
            >
              <button 
                onClick={() => setIsAddingProduct(false)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
                </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">הוספת מוצר חדש</h2>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם המוצר</label>
                  <input 
                    type="text" 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מק״ט</label>
                  <input 
                    type="text" 
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מחיר (₪)</label>
                  <input 
                    type="number" 
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קטגוריה</label>
                  <select 
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500"
                  >
                    <option value="">בחר קטגוריה...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קישור לתמונה (URL)</label>
                  <input 
                    type="text" 
                    placeholder="https://example.com/image.jpg"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מיקום במחסן</label>
                  <input 
                    type="text" 
                    placeholder="לדוגמה: מדף א1"
                    value={newProduct.location}
                    onChange={(e) => setNewProduct({...newProduct, location: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">תיאור קצר</label>
                  <textarea 
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500 h-24" 
                  />
                </div>
              </div>

              <div className="mt-12">
                 <button onClick={handleAddProduct} className="btn-primary w-full py-5 text-lg">שמור מוצר במערכת</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 👤 ADD AGENT MODAL */}
      <AnimatePresence>
        {isAddingAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md overflow-y-auto pt-20 pb-20">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 md:p-12 shadow-2xl relative my-auto"
            >
              <button 
                onClick={() => setIsAddingAgent(false)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
              </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">הוספת סוכן</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <User size={12} /> שם הסוכן
                  </label>
                  <input 
                    type="text" 
                    placeholder="לדוגמה: מוטי זיגדון"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <Phone size={12} /> טלפון WhatsApp
                  </label>
                  <input 
                    type="text" 
                    placeholder="05XXXXXXXX"
                    value={newAgent.phone}
                    onChange={(e) => setNewAgent({...newAgent, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                  <p className="text-[10px] text-slate-400 pr-2">ניתן להזין מספר רגיל המתחיל ב-0, המערכת תבצע המרה אוטומטית</p>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <Image size={12} /> קישור לתמונה
                  </label>
                  <input 
                    type="text" 
                    placeholder="URL לתמונה של הסוכן"
                    value={newAgent.image}
                    onChange={(e) => setNewAgent({...newAgent, image: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
              </div>

              <div className="mt-12">
                 <button onClick={handleAddAgent} className="btn-primary w-full py-5">צור סוכן והנפק קישור</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✏️ EDIT AGENT MODAL */}
      <AnimatePresence>
        {editingAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md overflow-y-auto pt-20 pb-20">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 md:p-12 shadow-2xl relative my-auto"
            >
              <button 
                onClick={() => setEditingAgent(null)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
              </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">עריכת סוכן</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <User size={12} /> שם הסוכן
                  </label>
                  <input 
                    type="text" 
                    value={editingAgent.name}
                    onChange={(e) => setEditingAgent({...editingAgent, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <Phone size={12} /> טלפון WhatsApp
                  </label>
                  <input 
                    type="text" 
                    value={editingAgent.phone}
                    onChange={(e) => setEditingAgent({...editingAgent, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <Image size={12} /> קישור לתמונה
                  </label>
                  <input 
                    type="text" 
                    value={editingAgent.image}
                    onChange={(e) => setEditingAgent({...editingAgent, image: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                 <button onClick={() => handleUpdateAgent(editingAgent)} className="btn-primary w-full py-5">שמור שינויים</button>
                 <button onClick={() => setEditingAgent(null)} className="w-full bg-slate-100 font-black text-slate-500 py-5 rounded-2xl hover:bg-slate-200 transition-colors">ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✏️ EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md overflow-y-auto pt-20 pb-20">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-2xl p-8 md:p-12 shadow-2xl relative my-auto"
            >
              <button 
                onClick={() => setEditingProduct(null)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
                </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">עריכת מוצר: {editingProduct.sku}</h2>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם המוצר</label>
                  <input 
                    type="text" 
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מחיר (₪)</label>
                  <input 
                    type="number" 
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קטגוריה</label>
                  <select 
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500"
                  >
                    <option value="">בחר קטגוריה...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מק״ט</label>
                  <input 
                    type="text" 
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קישור לתמונה</label>
                  <input 
                    type="text" 
                    value={editingProduct.image}
                    onChange={(e) => setEditingProduct({...editingProduct, image: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מיקום במחסן</label>
                   <input 
                    type="text" 
                    value={editingProduct.location}
                    onChange={(e) => setEditingProduct({...editingProduct, location: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">תיאור קצר</label>
                  <textarea 
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500 h-24" 
                  />
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                 <button onClick={() => handleUpdateProduct(editingProduct)} className="btn-primary w-full py-5 text-lg">שמור שינויים</button>
                 <button onClick={() => setEditingProduct(null)} className="w-full bg-slate-100 font-black text-slate-500 py-5 rounded-2xl hover:bg-slate-200 transition-colors">ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* 🏷️ ADD CATEGORY MODAL */}
      <AnimatePresence>
        {isAddingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md overflow-y-auto pt-20 pb-20">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 md:p-12 shadow-2xl relative my-auto"
            >
              <button 
                onClick={() => setIsAddingCategory(false)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
              </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">הוספת קטגוריה</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם הקטגוריה</label>
                  <input 
                    type="text" 
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
              </div>

              <div className="mt-12">
                 <button onClick={handleAddCategory} className="btn-primary w-full py-5">צור קטגוריה</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🏷️ EDIT CATEGORY MODAL */}
      <AnimatePresence>
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md overflow-y-auto pt-20 pb-20">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 md:p-12 shadow-2xl relative my-auto"
            >
              <button 
                onClick={() => setEditingCategory(null)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
              </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">עריכת קטגוריה</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם הקטגוריה</label>
                  <input 
                    type="text" 
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                 <button onClick={() => handleUpdateCategory(editingCategory)} className="btn-primary w-full py-5">שמור שינויים</button>
                 <button onClick={() => setEditingCategory(null)} className="w-full bg-slate-100 font-black text-slate-500 py-5 rounded-2xl">ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* 🛍️ ORDER DETAILS MODAL */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md overflow-y-auto pt-20 pb-20">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-2xl p-8 md:p-12 shadow-2xl relative my-auto overflow-hidden"
            >
              <button 
                onClick={() => setSelectedOrder(null)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors z-10"
              >
                <X size={32} />
              </button>
              
              <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tighter mb-2">פרטי הזמנה</h2>
                <p className="text-slate-400 font-bold text-sm">
                  {selectedOrder.customer_name} • {new Date(selectedOrder.created_at).toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-200">
                      {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-300" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-slate-800 text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">מק״ט: {item.sku} | {item.quantity} יחידות</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900 text-sm">₪{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">סה״כ לתשלום</p>
                  <p className="text-3xl font-black text-slate-900">₪{selectedOrder.total_price.toFixed(2)}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => { handleUpdateOrderStatus(selectedOrder.id, 'Completed'); setSelectedOrder(null); }}
                    className="bg-green-500 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-green-600 transition-colors"
                  >
                    סמן כהושלם
                  </button>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="bg-slate-100 text-slate-500 px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-200 transition-colors"
                  >
                    סגור
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
