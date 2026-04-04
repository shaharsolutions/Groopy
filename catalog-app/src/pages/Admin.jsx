import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Percent,
  Star,
  Flame,
  CheckCircle2,
  AlertCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  ArrowUpDown
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [confirmingProductDelete, setConfirmingProductDelete] = useState(null);
  const [confirmingAgentDelete, setConfirmingAgentDelete] = useState(null);
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [confirmingCategoryDelete, setConfirmingCategoryDelete] = useState(null);
  
  // Brands State
  const [brands, setBrands] = useState([]);
  const [editingBrand, setEditingBrand] = useState(null);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: '', logo: '', type: '' });
  const [isUpdatingBrand, setIsUpdatingBrand] = useState(false);
  const [confirmingBrandDelete, setConfirmingBrandDelete] = useState(null);
  
  // Orders State
  const [orders, setOrders] = useState([]);
  const [confirmingOrderDelete, setConfirmingOrderDelete] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // 📝 Edit Order States
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [tempOrderItems, setTempOrderItems] = useState([]);
  const [editingOrderSearch, setEditingOrderSearch] = useState('');
  const [tempOrderDiscount, setTempOrderDiscount] = useState(0);

  // New states for form inputs
  const [newAgent, setNewAgent] = useState({ name: '', phone: '', image: '' });
  const [newProduct, setNewProduct] = useState({ 
    id: '', 
    name: '', 
    sku: '', 
    price: '', 
    category: 'Bottles', 
    location: '', 
    description: '', 
    image: '', 
    is_new: false,
    is_clearing: false,
    is_best_seller: false,
    is_hot_deal: false
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState('');

  // 📝 Notes States
  const [adminName, setAdminName] = useState(localStorage.getItem('groopy_admin_name') || '');
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [confirmingNoteDelete, setConfirmingNoteDelete] = useState(null);

  // 🚫 Cancellation States
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [activeStatusMenu, setActiveStatusMenu] = useState({ id: null, rect: null });

  // 🖼️ Image Handlers
  const openImageModal = (imageUrl, productName) => {
    setSelectedImage(imageUrl);
    setSelectedProductName(productName);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setSelectedProductName('');
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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

    // 5. Fetch Brands
    const { data: brandsData, error: brandsError } = await supabase
      .from('brands')
      .select('*')
      .order('type', { ascending: true, nullsFirst: false })
      .order('name');
    
    if (brandsData) setBrands(brandsData);
    if (brandsError) console.warn('Error fetching brands (maybe table does not exist):', brandsError);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Sync tempOrderItems when selectedOrder is set
  useEffect(() => {
    if (selectedOrder) {
      setTempOrderItems(selectedOrder.items || []);
      setTempOrderDiscount(selectedOrder.discount_pct || 0);
      setIsEditingOrder(false); // Reset edit mode when changing orders
      setEditingOrderSearch('');
    } else {
      setTempOrderItems([]);
      setTempOrderDiscount(0);
      setIsEditingOrder(false);
    }
  }, [selectedOrder]);

  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [isUpdatingAgent, setIsUpdatingAgent] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Product Actions
  const handleAddProduct = async () => {
    const finalProduct = { 
      id: newProduct.sku || Date.now().toString(), 
      ...newProduct, 
      price: parseFloat(newProduct.price) 
    };

    setIsUpdatingProduct(true);
    try {
      const { error } = await supabase.from('products').insert([finalProduct]);
      if (!error) {
        setProducts([...products, finalProduct]);
        setIsAddingProduct(false);
        setNewProduct({ 
          id: '', 
          name: '', 
          sku: '', 
          price: '', 
          category: 'Bottles', 
          location: '', 
          description: '', 
          image: '', 
          is_new: false,
          is_clearing: false,
          is_best_seller: false,
          is_hot_deal: false
        });
      } else {
        console.error('Error adding product:', error);
        alert('שגיאה בהוספת המוצר');
      }
    } finally {
      setIsUpdatingProduct(false);
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
    setIsUpdatingProduct(true);
    
    // Explicit list of database columns to prevent sending unknown fields (like created_at)
    const allowedFields = [
      'name', 'sku', 'price', 'category', 'location', 
      'description', 'image', 'is_new', 'is_clearing', 
      'is_best_seller', 'is_hot_deal'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (updated[field] !== undefined) {
        updateData[field] = updated[field];
      }
    });

    try {
      const { error } = await supabase.from('products').update(updateData).eq('id', updated.id);
      if (!error) {
        setProducts(products.map(p => p.id === updated.id ? updated : p));
        setEditingProduct(null);
      } else {
        console.error('Error updating product:', error);
        alert('שגיאה בעדכון המוצר. ודא שהרצת את ה-SQL ב-Supabase (הוספת עמודות: is_new, is_best_seller, is_hot_deal).');
      }
    } finally {
      setIsUpdatingProduct(false);
    }
  }

  // Agent Actions
  const handleAddAgent = async () => {
    const agent = { id: Date.now().toString(), ...newAgent };
    setIsUpdatingAgent(true);
    try {
      const { error } = await supabase.from('agents').insert([agent]);
      if (!error) {
        setAgents([...agents, agent]);
        setIsAddingAgent(false);
        setNewAgent({ name: '', phone: '', image: '' });
      } else {
        console.error('Error adding agent:', error);
        alert('שגיאה בהוספת הסוכן');
      }
    } finally {
      setIsUpdatingAgent(false);
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
    setIsUpdatingCategory(true);
    try {
      const { error } = await supabase.from('categories').insert([category]);
      if (!error) {
        setCategories([...categories, category]);
        setIsAddingCategory(false);
        setNewCategory({ name: '' });
      } else {
        console.error('Error adding category:', error);
        alert('שגיאה בהוספת קטגוריה');
      }
    } finally {
      setIsUpdatingCategory(false);
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
    setIsUpdatingCategory(true);
    try {
      const { error } = await supabase.from('categories').update(updated).eq('id', updated.id);
      if (!error) {
        setCategories(categories.map(c => c.id === updated.id ? updated : c));
        setEditingCategory(null);
      } else {
        console.error('Error updating category:', error);
        alert('שגיאה בעדכון הקטגוריה');
      }
    } finally {
      setIsUpdatingCategory(false);
    }
  }

  const handleUpdateAgent = async (updated) => {
    setIsUpdatingAgent(true);
    try {
      const { error } = await supabase.from('agents').update(updated).eq('id', updated.id);
      if (!error) {
        setAgents(agents.map(a => a.id === updated.id ? updated : a));
        setEditingAgent(null);
      } else {
        console.error('Error updating agent:', error);
        alert('שגיאה בעדכון הסוכן');
      }
    } finally {
      setIsUpdatingAgent(false);
    }
  }

  // Brand Actions
  const handleAddBrand = async () => {
    if (!newBrand.name || !newBrand.logo) {
      alert('נא להזין שם ולוגו');
      return;
    }
    setIsUpdatingBrand(true);
    try {
      const { data, error } = await supabase.from('brands').insert([newBrand]).select();
      if (!error) {
        setBrands([...brands, data[0]]);
        setIsAddingBrand(false);
        setNewBrand({ name: '', logo: '', type: '' });
      } else {
        console.error('Error adding brand:', error);
        alert('שגיאה בהוספת המותג. ודא שטבלת brands קיימת ב-Supabase.');
      }
    } finally {
      setIsUpdatingBrand(false);
    }
  }

  const handleDeleteBrand = async (id) => {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (!error) {
      setBrands(brands.filter(b => b.id !== id));
      setConfirmingBrandDelete(null);
    } else {
      console.error('Error deleting brand:', error);
      alert('שגיאה במחיקת המותג');
    }
  }

  const handleUpdateBrand = async (updated) => {
    setIsUpdatingBrand(true);
    try {
      const { error } = await supabase.from('brands').update(updated).eq('id', updated.id);
      if (!error) {
        setBrands(brands.map(b => b.id === updated.id ? updated : b));
        setEditingBrand(null);
      } else {
        console.error('Error updating brand:', error);
        alert('שגיאה בעדכון המותג');
      }
    } finally {
      setIsUpdatingBrand(false);
    }
  }

  // Order Actions
  const handleDeleteOrder = async (id) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) {
      setOrders(orders.filter(o => o.id !== id));
      setSelectedOrderIds(prev => prev.filter(orderId => orderId !== id));
      setConfirmingOrderDelete(null);
    } else {
      console.error('Error deleting order:', error);
    }
  }

  const handleBulkDeleteOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    
    setIsBulkDeleting(true);
    const { error } = await supabase.from('orders').delete().in('id', selectedOrderIds);
    
    if (!error) {
      setOrders(orders.filter(o => !selectedOrderIds.includes(o.id)));
      setSelectedOrderIds([]);
    } else {
      console.error('Error bulk deleting orders:', error);
    }
    setIsBulkDeleting(false);
  }

  const toggleOrderSelection = (id) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(orderId => orderId !== id) : [...prev, id]
    );
  }

  const toggleAllOrders = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map(o => o.id));
    }
  }

  const handleUpdateOrderStatus = async (id, status) => {
    if (status === 'Canceled') {
      const order = orders.find(o => o.id === id);
      setOrderToCancel(order);
      setCancelReason('');
      return;
    }

    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) {
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
    } else {
      console.error('Error updating order status:', error);
    }
  }

  const confirmCancellation = async () => {
    if (!orderToCancel) return;

    setIsSubmittingNote(true);
    const updatedNotes = [...(orderToCancel.notes || [])];
    
    if (cancelReason.trim()) {
      updatedNotes.push({
        text: `🚫 סיבת ביטול: ${cancelReason}`,
        author: adminName || 'מערכת',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase.from('orders').update({ 
      status: 'Canceled',
      notes: updatedNotes
    }).eq('id', orderToCancel.id);

    if (!error) {
      setOrders(orders.map(o => o.id === orderToCancel.id ? { ...o, status: 'Canceled', notes: updatedNotes } : o));
      setOrderToCancel(null);
      if (selectedOrder?.id === orderToCancel.id) {
        setSelectedOrder({ ...selectedOrder, status: 'Canceled', notes: updatedNotes });
      }
    } else {
      console.error('Error canceling order:', error);
      // Fallback: try to update only status if notes column is missing
      const { error: statusOnlyError } = await supabase.from('orders').update({ 
        status: 'Canceled'
      }).eq('id', orderToCancel.id);

      if (!statusOnlyError) {
        setOrders(orders.map(o => o.id === orderToCancel.id ? { ...o, status: 'Canceled' } : o));
        setOrderToCancel(null);
        alert('ההזמנה בוטלה, אך ההערות לא נשמרו. ייתכן שחסרה עמודת "notes" בבסיס הנתונים (SQL: ALTER TABLE orders ADD COLUMN notes JSONB)');
      } else {
        alert('שגיאה בתהליך הביטול: ' + (error.message || 'שגיאה לא ידועה'));
      }
    }
    setIsSubmittingNote(false);
  }

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !adminName.trim() || !selectedOrder) return;

    setIsSubmittingNote(true);
    const newNote = {
      text: newNoteText,
      author: adminName,
      timestamp: new Date().toISOString()
    };

    const updatedNotes = [...(selectedOrder.notes || []), newNote];
    
    // Save admin name to localStorage
    localStorage.setItem('groopy_admin_name', adminName);

    const { error } = await supabase
      .from('orders')
      .update({ notes: updatedNotes })
      .eq('id', selectedOrder.id);

    if (!error) {
      const updatedOrder = { ...selectedOrder, notes: updatedNotes };
      setSelectedOrder(updatedOrder);
      setOrders(orders.map(o => (o.id === selectedOrder.id ? updatedOrder : o)));
      setNewNoteText('');
    } else {
      console.error('Error adding note:', error);
      alert('שגיאה בשמירת ההערה. ייתכן ששדה "notes" לא קיים בבסיס הנתונים. נא להוסיף אותו ב-Supabase (סוג JSONB)');
    }
    setIsSubmittingNote(false);
  };

  const handleDeleteNote = async (index) => {
    if (!selectedOrder || !selectedOrder.notes) return;

    const updatedNotes = selectedOrder.notes.filter((_, i) => i !== index);

    const { error } = await supabase
      .from('orders')
      .update({ notes: updatedNotes })
      .eq('id', selectedOrder.id);

    if (!error) {
      const updatedOrder = { ...selectedOrder, notes: updatedNotes };
      setSelectedOrder(updatedOrder);
      setOrders(orders.map(o => (o.id === selectedOrder.id ? updatedOrder : o)));
      setConfirmingNoteDelete(null);
    } else {
      console.error('Error deleting note:', error);
      alert('שגיאה במחיקת ההערה');
    }
  };

  // 📝 Edit Order Handlers
  const handleUpdateItemQuantity = (sku, delta) => {
    setTempOrderItems(prev => prev.map(item => {
      if (item.sku === sku) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleRemoveItemFromOrder = (sku) => {
    setTempOrderItems(prev => prev.filter(item => item.sku !== sku));
  };

  const handleAddItemToOrder = (product) => {
    setTempOrderItems(prev => {
      const existing = prev.find(item => item.sku === product.sku);
      if (existing) {
        return prev.map(item => 
          item.sku === product.sku ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        sku: product.sku,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1
      }];
    });
  };

  const handleSaveOrderEdits = async () => {
    if (!selectedOrder) return;

    setIsUpdatingOrder(true);
    try {
      const subtotal = tempOrderItems.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 0;
        return sum + (price * qty);
      }, 0);
      
      const discountPct = Number(tempOrderDiscount) || 0;
      const discountAmount = subtotal * (discountPct / 100);
      const newTotal = subtotal - discountAmount;

      const requestBody = { 
          items: tempOrderItems,
          discount_pct: discountPct,
          total_price: newTotal
      };

      const { error } = await supabase
        .from('orders')
        .update(requestBody)
        .eq('id', selectedOrder.id);

      if (!error) {
        const updatedOrder = { 
          ...selectedOrder, 
          items: tempOrderItems, 
          discount_pct: discountPct,
          total_price: newTotal 
        };
        setSelectedOrder(updatedOrder);
        setOrders(orders.map(o => (o.id === selectedOrder.id ? updatedOrder : o)));
        setIsEditingOrder(false);
      } else {
        console.error('Error saving order edits:', error);
        
        if (error.code === '42703' || error.message?.includes('discount_pct')) {
          // Column missing error - try fallback save without discount_pct
          const { error: fallbackError } = await supabase
            .from('orders')
            .update({ 
              items: tempOrderItems,
              total_price: newTotal
            })
            .eq('id', selectedOrder.id);

          if (!fallbackError) {
            const updatedOrder = { 
              ...selectedOrder, 
              items: tempOrderItems, 
              total_price: newTotal 
            };
            setSelectedOrder(updatedOrder);
            setOrders(orders.map(o => (o.id === selectedOrder.id ? updatedOrder : o)));
            setIsEditingOrder(false);
            alert('השינויים נשמרו, אך אחוז ההנחה לא נשמר בבסיס הנתונים. נא להוסיף את העמודה "discount_pct" ב-Supabase (SQL: ALTER TABLE orders ADD COLUMN discount_pct NUMERIC DEFAULT 0)');
          } else {
            alert('שגיאה בשמירת השינויים: ' + (fallbackError.message || 'שגיאה כללית'));
          }
        } else {
          alert('שגיאה בשמירת השינויים: ' + (error.message || 'שגיאה כללית'));
        }
      }
    } finally {
      setIsUpdatingOrder(false);
    }
  };

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

  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(deferredSearchTerm.toLowerCase());
      
      const normalizedProductCat = 
        (p.category === 'Bottles' || p.category === 'בקבוקים') ? 'בקבוקים' :
        (p.category === 'Lunch Boxes' || p.category === 'קופסאות אוכל') ? 'קופסאות אוכל' :
        p.category;

      const matchesCategory = 
        selectedCategory === 'All' || 
        normalizedProductCat === selectedCategory;
        
      return matchesSearch && matchesCategory;
    });
  }, [products, deferredSearchTerm, selectedCategory]);

  const sortedProducts = useMemo(() => {
    const sortableItems = [...filteredProducts];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'price') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else {
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredProducts, sortConfig]);

  const ordersStats = useMemo(() => ({
    new: orders.filter(o => o.status === 'New').length,
    total: orders.length
  }), [orders]);

  const filteredProductsForEditing = useMemo(() => {
    if (!editingOrderSearch.trim()) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(editingOrderSearch.toLowerCase()) || 
      p.sku.toLowerCase().includes(editingOrderSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(editingOrderSearch.toLowerCase())
    ).slice(0, 5); // Limit to 5 results for clarity in modal
  }, [products, editingOrderSearch]);

  const productsTabContent = useMemo(() => (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="חיפוש מהיר..."
              className="w-full bg-white border border-slate-200 rounded-2xl pr-12 pl-6 py-3 font-bold text-sm outline-none focus:border-primary-400 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {['All', ...new Set(categories.map(c => c.name))].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${
                  selectedCategory === cat 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {cat === 'All' ? 'הכל' : cat}
              </button>
            ))}
          </div>
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
                <th 
                  className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => requestSort('name')}
                >
                  <div className="flex items-center gap-2 justify-end">
                    {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-primary-500" /> : <ChevronDown size={12} className="text-primary-500" />) : <ArrowUpDown size={12} className="opacity-20" />}
                    <span>שם המוצר</span>
                  </div>
                </th>
                <th 
                  className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => requestSort('sku')}
                >
                  <div className="flex items-center gap-2 justify-end">
                    {sortConfig.key === 'sku' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-primary-500" /> : <ChevronDown size={12} className="text-primary-500" />) : <ArrowUpDown size={12} className="opacity-20" />}
                    <span>מק״ט</span>
                  </div>
                </th>
                <th 
                  className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => requestSort('price')}
                >
                  <div className="flex items-center gap-2 justify-end">
                    {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-primary-500" /> : <ChevronDown size={12} className="text-primary-500" />) : <ArrowUpDown size={12} className="opacity-20" />}
                    <span>מחיר (₪)</span>
                  </div>
                </th>
                <th 
                  className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => requestSort('location')}
                >
                  <div className="flex items-center gap-2 justify-end">
                    {sortConfig.key === 'location' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-primary-500" /> : <ChevronDown size={12} className="text-primary-500" />) : <ArrowUpDown size={12} className="opacity-20" />}
                    <span>מיקום</span>
                  </div>
                </th>
                <th className="px-8 py-5">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedProducts.map(p => (
                <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div 
                      className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 overflow-hidden cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-sm border border-slate-100 group/img relative"
                      onClick={() => p.image && openImageModal(p.image, p.name)}
                    >
                       {p.image ? (
                         <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                       ) : (
                         p.category === 'Bottles' ? <Package size={20} /> : <Package size={20} />
                       )}
                       {p.is_clearing && (
                         <div className="absolute top-0 right-0 bg-accent-500 text-white text-[8px] font-black px-1 py-0.5 rounded-bl-lg shadow-sm">NEW</div>
                       )}
                    </div>
                  </td>
                  <td className="px-8 py-6 font-black text-slate-800 text-sm">
                    <div className="flex items-center gap-2">
                       {p.name}
                       {p.is_clearing && <span className="bg-blue-50 text-blue-500 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">חדש</span>}
                    </div>
                  </td>
                  <td className="px-8 py-6 font-bold text-slate-400 text-xs">{p.sku}</td>
                  <td className="px-8 py-6 font-black text-slate-900">{p.price.toFixed(2)}</td>
                  <td className="px-8 py-6 whitespace-nowrap">
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
  ), [sortedProducts, searchTerm, confirmingProductDelete, categories, selectedCategory, sortConfig]);

  const agentsTabContent = useMemo(() => (
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
  ), [agents, copyFeedback, confirmingAgentDelete]);

  const categoriesTabContent = useMemo(() => (
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
  ), [categories, confirmingCategoryDelete]);

  const brandsTabContent = useMemo(() => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
      {brands.map(brand => (
        <motion.div 
          layout
          key={brand.id}
          className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm relative group overflow-hidden flex flex-col items-center text-center"
        >
          <div className="w-24 h-24 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center shadow-inner overflow-hidden mb-6">
            {brand.logo ? (
              <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain p-2" />
            ) : (
              <Image size={32} />
            )}
          </div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight mb-1">{brand.name}</h3>
          {brand.type && (
            <span className="px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-black rounded-full mb-6 uppercase tracking-wider border border-primary-100/50">
              {brand.type}
            </span>
          )}
          {!brand.type && <div className="mb-6 h-4" />} {/* Spacer to maintain layout consistency if no type */}

          <div className="w-full pt-6 mt-auto border-t border-slate-50 flex gap-3">
            {confirmingBrandDelete === brand.id ? (
               <div className="w-full flex items-center justify-center gap-2 bg-red-50 p-2 rounded-2xl">
                 <button onClick={() => handleDeleteBrand(brand.id)} className="bg-red-500 text-white p-2 rounded-xl"><Check size={14} /></button>
                 <button onClick={() => setConfirmingBrandDelete(null)} className="bg-slate-200 text-slate-500 p-2 rounded-xl"><X size={14} /></button>
               </div>
            ) : (
              <>
                <button 
                  onClick={() => setEditingBrand(brand)}
                  className="flex-1 p-3 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-all font-black"
                >
                  <Edit size={16} className="mx-auto" />
                </button>
                <button 
                  onClick={() => setConfirmingBrandDelete(brand.id)}
                  className="flex-1 p-3 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-all font-black"
                >
                  <Trash2 size={16} className="mx-auto" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      ))}

      {brands.length === 0 && (
        <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-[40px] opacity-30">
          <Image size={64} className="mx-auto mb-4" />
          <p className="font-black text-xl">אין מותגים רשומים... עדיין</p>
        </div>
      )}
    </div>
  ), [brands, confirmingBrandDelete]);

  const ordersTabContent = useMemo(() => (
    <div className="space-y-6">
       <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             {selectedOrderIds.length > 0 && (
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-2xl border border-red-100"
               >
                 <span className="text-xs font-black text-red-600">נבחרו {selectedOrderIds.length} הזמנות</span>
                 <button 
                   onClick={handleBulkDeleteOrders}
                   disabled={isBulkDeleting}
                   className="bg-red-500 text-white px-4 py-1.5 rounded-xl text-[10px] font-black hover:bg-red-600 transition-colors disabled:opacity-50"
                 >
                   {isBulkDeleting ? 'מוחק...' : 'מחק פריטים שנבחרו'}
                 </button>
                 <button 
                  onClick={() => setSelectedOrderIds([])}
                  className="text-slate-400 hover:text-slate-600"
                 >
                   <X size={14} />
                 </button>
               </motion.div>
             )}
          </div>
       </div>

       <div className="bg-white rounded-[32px] border border-slate-200 overflow-x-auto shadow-sm scrollbar-hide">
          <table className="w-full text-right border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                <th className="px-8 py-5 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                    onChange={toggleAllOrders}
                    className="w-4 h-4 rounded-md border-slate-300 text-primary-500 focus:ring-primary-500"
                  />
                </th>
                <th className="px-8 py-5">תאריך והזמנה</th>
                <th className="px-8 py-5">שם הלקוח</th>
                <th className="px-8 py-5">סוכן</th>
                <th className="px-8 py-5">סה״כ לתשלום</th>
                <th className="px-8 py-5">סטטוס</th>
                <th className="px-8 py-5">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order, index) => (
                <tr key={order.id} className={`group transition-all duration-300 ${selectedOrderIds.includes(order.id) ? 'bg-primary-50/30' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-8 py-6 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      className="w-4 h-4 rounded-md border-slate-300 text-primary-500 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800">
                        {new Date(order.created_at).toLocaleDateString('he-IL')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(order.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-black text-slate-800 text-sm">{order.customer_name}</td>
                  <td className="px-8 py-6">
                     <span className="font-bold text-slate-500 text-xs">{order.agent_name || 'ישיר'}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900">₪{order.total_price.toFixed(2)}</span>
                      {order.discount_pct > 0 && (
                        <span className="text-[12px] font-bold text-green-600">
                          {order.discount_pct}% הנחה
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const r = e.currentTarget.getBoundingClientRect();
                          const rect = { top: r.top, left: r.left, bottom: r.bottom, right: r.right };
                          setActiveStatusMenu(prev => prev.id == order.id ? { id: null, rect: null } : { id: String(order.id), rect });
                        }}
                        className="flex items-center gap-2 group transition-all active:scale-95"
                      >
                         {order.status === 'New' ? (
                           <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black group-hover:bg-blue-100 transition-colors">
                             <Clock size={10} /> חדש
                           </span>
                         ) : order.status === 'Completed' ? (
                           <span className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black group-hover:bg-green-100 transition-colors">
                             <CheckCircle2 size={10} /> הושלם
                           </span>
                         ) : order.status === 'Canceled' ? (
                          <span className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black group-hover:bg-red-100 transition-colors">
                            <AlertCircle size={10} /> בוטל
                          </span>
                         ) : (
                           <span className="flex items-center gap-1.5 bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black group-hover:bg-slate-200 transition-colors">
                             <AlertCircle size={10} /> {order.status}
                           </span>
                         )}
                         <ChevronRight size={10} className={`text-slate-300 transition-transform duration-300 ${activeStatusMenu.id == order.id ? '-rotate-90' : 'rotate-90'}`} />
                      </button>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all font-black text-[10px]"
                      >
                        צפייה בפרטים
                      </button>
                      
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
  ), [orders, selectedOrderIds, isBulkDeleting, confirmingOrderDelete, activeStatusMenu]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row" dir="rtl">
      {/* 🚀 GLOBAL STATUS MENU PORTAL - Moved to Top for early rendering */}
      {activeStatusMenu.id && activeStatusMenu.rect && createPortal(
        <div key="status-menu-portal-root">
          <div 
            className="fixed inset-0 z-[999998] bg-slate-900/5 backdrop-blur-[2px]" 
            onClick={(e) => {
              e.stopPropagation();
              setActiveStatusMenu({ id: null, rect: null });
            }} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={{
              position: 'fixed',
              top: activeStatusMenu.rect.bottom + 8,
              left: Math.max(16, Math.min(window.innerWidth - 208, activeStatusMenu.rect.left - 80)),
              zIndex: 999999,
              transformOrigin: 'top center'
            }}
            className="w-48 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 p-2 overflow-hidden"
          >
              {[
                { id: 'New', label: 'חדש', color: 'text-blue-600', bg: 'hover:bg-blue-50', icon: Clock },
                { id: 'Completed', label: 'הושלם', color: 'text-green-600', bg: 'hover:bg-green-50', icon: CheckCircle2 },
                { id: 'Canceled', label: 'בוטל', color: 'text-red-600', bg: 'hover:bg-red-50', icon: AlertCircle }
              ].map((status) => {
                const currentStatus = activeStatusMenu.id === 'selected' 
                  ? selectedOrder?.status 
                  : orders.find(o => String(o.id) == String(activeStatusMenu.id))?.status;
                  
                return (
                  <button
                    key={status.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetId = activeStatusMenu.id === 'selected' ? selectedOrder?.id : activeStatusMenu.id;
                      if (targetId) {
                        handleUpdateOrderStatus(targetId, status.id);
                        if (activeStatusMenu.id === 'selected' && status.id !== 'Canceled') {
                          setSelectedOrder(prev => prev ? ({ ...prev, status: status.id }) : null);
                        }
                      }
                      setActiveStatusMenu({ id: null, rect: null });
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${status.bg} 
                    ${currentStatus === status.id ? 'bg-slate-50' : ''}`}
                  >
                    <status.icon size={16} className={status.color} />
                    <span className={`text-xs font-black ${status.color}`}>{status.label}</span>
                    {currentStatus === status.id && <Check size={14} className="mr-auto text-slate-300" />}
                  </button>
                );
              })}
          </motion.div>
        </div>,
        document.body
      )}
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
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm overflow-hidden p-1 border border-slate-100">
              <img src={`${import.meta.env.BASE_URL}logo-main.png`} alt="Groopy Logo" className="w-full h-full object-contain" />
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
              {ordersStats.new > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {ordersStats.new}
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

          <button 
            onClick={() => { setActiveTab('brands'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
              activeTab === 'brands' 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <Star size={20} />
              <span className="font-black text-sm">ניהול מותגים</span>
            </div>
            <ChevronRight size={16} className={activeTab === 'brands' ? '' : 'text-slate-300'} />
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
                  activeTab === 'orders' ? 'ניהול הזמנות' : 
                  activeTab === 'brands' ? 'ניהול מותגים' : 'ניהול קטגוריות'}
               </h2>
               <p className="text-slate-400 font-bold text-sm whitespace-nowrap">
                 {activeTab === 'products' ? `סה״כ ${products.length} מוצרים רשומים` : 
                  activeTab === 'agents' ? `רשימת סוכנים וקישורי הפצה` : 
                  activeTab === 'orders' ? `מעקב אחר הזמנות שבוצעו בוואטסאפ` : 
                  activeTab === 'brands' ? `ניהול לוגואים של מותגים לקרוסלה` : 'עריכת קטגוריות המוצרים בקטלוג'}
               </p>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-3 md:gap-4 w-full md:w-auto">
            {activeTab !== 'orders' && (
              <button 
                onClick={() => {
                  if (activeTab === 'products') setIsAddingProduct(true);
                  else if (activeTab === 'agents') setIsAddingAgent(true);
                  else if (activeTab === 'brands') setIsAddingBrand(true);
                  else setIsAddingCategory(true);
                }}
                className="flex-1 md:flex-none btn-primary w-full md:w-fit flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                <span className="whitespace-nowrap">
                  {activeTab === 'products' ? 'מוצר חדש' : 
                  activeTab === 'agents' ? 'סוכן חדש' : 
                  activeTab === 'brands' ? 'מותג חדש' : 'קטגוריה חדשה'}
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

        {/* 📋 TABS CONTENT */}
        {activeTab === 'products' && productsTabContent}
        {activeTab === 'agents' && agentsTabContent}
        {activeTab === 'categories' && categoriesTabContent}
        {activeTab === 'orders' && ordersTabContent}
        {activeTab === 'brands' && brandsTabContent}
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
                    value={newProduct.description || ''}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500 h-24" 
                  />
                </div>
                <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">

                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="new_product_is_clearing"
                      checked={!!newProduct.is_clearing}
                      onChange={(e) => setNewProduct({...newProduct, is_clearing: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-slate-300 text-purple-500 focus:ring-purple-500"
                    />
                    <label htmlFor="new_product_is_clearing" className="text-xs font-black text-slate-700 cursor-pointer select-none flex items-center gap-1">
                      <Zap size={12} className="text-purple-500" /> מוצרים חדשים
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="new_product_is_best_seller"
                      checked={!!newProduct.is_best_seller}
                      onChange={(e) => setNewProduct({...newProduct, is_best_seller: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-slate-300 text-blue-500 focus:ring-blue-500"
                    />
                    <label htmlFor="new_product_is_best_seller" className="text-xs font-black text-slate-700 cursor-pointer select-none flex items-center gap-1">
                      <Star size={12} className="text-blue-500" /> נמכרים
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="new_product_is_hot_deal"
                      checked={!!newProduct.is_hot_deal}
                      onChange={(e) => setNewProduct({...newProduct, is_hot_deal: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-slate-300 text-orange-500 focus:ring-orange-500"
                    />
                    <label htmlFor="new_product_is_hot_deal" className="text-xs font-black text-slate-700 cursor-pointer select-none flex items-center gap-1">
                      <Flame size={12} className="text-orange-500" /> חם
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                 <button 
                  onClick={handleAddProduct} 
                  disabled={isUpdatingProduct}
                  className="btn-primary w-full py-5 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingProduct ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'שמור מוצר במערכת'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 👤 ADD AGENT MODAL */}
      <AnimatePresence>
        {isAddingAgent && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[40px] w-full max-w-md p-8 md:p-12 shadow-2xl relative my-8"
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
                      value={newAgent.phone || ''}
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
                      value={newAgent.image || ''}
                      onChange={(e) => setNewAgent({...newAgent, image: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                    />
                  </div>
                </div>

                <div className="mt-12">
                   <button 
                    onClick={handleAddAgent} 
                    disabled={isUpdatingAgent}
                    className="btn-primary w-full py-5 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isUpdatingAgent ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'צור סוכן והנפק קישור'}
                   </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ✏️ EDIT AGENT MODAL */}
      <AnimatePresence>
        {editingAgent && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[40px] w-full max-w-md p-8 md:p-12 shadow-2xl relative my-8"
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
                    value={editingAgent.name || ''}
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
                    value={editingAgent.phone || ''}
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
                    value={editingAgent.image || ''}
                    onChange={(e) => setEditingAgent({...editingAgent, image: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                 <button 
                  onClick={() => handleUpdateAgent(editingAgent)} 
                  disabled={isUpdatingAgent}
                  className="btn-primary w-full py-5 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                 >
                   {isUpdatingAgent ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'שמור שינויים'}
                 </button>
                 <button onClick={() => setEditingAgent(null)} className="w-full bg-slate-100 font-black text-slate-500 py-5 rounded-2xl hover:bg-slate-200 transition-colors">ביטול</button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>

      {/* ✏️ EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[40px] w-full max-w-2xl p-8 md:p-12 shadow-2xl relative my-8"
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
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מחיר (₪)</label>
                  <input 
                    type="number" 
                    value={editingProduct.price ?? ''}
                    onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קטגוריה</label>
                  <select 
                    value={editingProduct.category || ''}
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
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קישור לתמונה</label>
                  <input 
                    type="text" 
                    value={editingProduct.image || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, image: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מיקום במחסן</label>
                   <input 
                    type="text" 
                    value={editingProduct.location || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, location: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">תיאור קצר</label>
                  <textarea 
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500 h-24" 
                  />
                </div>
                <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">

                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="edit_product_is_clearing"
                      checked={!!editingProduct.is_clearing}
                      onChange={(e) => setEditingProduct({...editingProduct, is_clearing: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-slate-300 text-purple-500 focus:ring-purple-500"
                    />
                    <label htmlFor="edit_product_is_clearing" className="text-xs font-black text-slate-700 cursor-pointer select-none flex items-center gap-1">
                      <Zap size={12} className="text-purple-500" /> מוצרים חדשים
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="edit_product_is_best_seller"
                      checked={!!editingProduct.is_best_seller}
                      onChange={(e) => setEditingProduct({...editingProduct, is_best_seller: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-slate-300 text-blue-500 focus:ring-blue-500"
                    />
                    <label htmlFor="edit_product_is_best_seller" className="text-xs font-black text-slate-700 cursor-pointer select-none flex items-center gap-1">
                      <Star size={12} className="text-blue-500" /> נמכרים
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="edit_product_is_hot_deal"
                      checked={!!editingProduct.is_hot_deal}
                      onChange={(e) => setEditingProduct({...editingProduct, is_hot_deal: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-slate-300 text-orange-500 focus:ring-orange-500"
                    />
                    <label htmlFor="edit_product_is_hot_deal" className="text-xs font-black text-slate-700 cursor-pointer select-none flex items-center gap-1">
                      <Flame size={12} className="text-orange-500" /> חם
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                 <button 
                  onClick={() => handleUpdateProduct(editingProduct)} 
                  disabled={isUpdatingProduct}
                  className="btn-primary w-full py-5 text-lg disabled:opacity-50 disabled:cursor-not-allowed font-black"
                >
                   {isUpdatingProduct ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'שמור שינויים'}
                 </button>
                 <button onClick={() => setEditingProduct(null)} className="w-full bg-slate-100 font-black text-slate-500 py-5 rounded-2xl hover:bg-slate-200 transition-colors">ביטול</button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
      {/* 🏷️ ADD CATEGORY MODAL */}
      <AnimatePresence>
        {isAddingCategory && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[40px] w-full max-w-md p-8 md:p-12 shadow-2xl relative my-8"
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
                 <button 
                  onClick={handleAddCategory} 
                  disabled={isUpdatingCategory}
                  className="btn-primary w-full py-5 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                 >
                   {isUpdatingCategory ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'צור קטגוריה'}
                 </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>

      {/* 🏷️ EDIT CATEGORY MODAL */}
      <AnimatePresence>
        {editingCategory && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[40px] w-full max-w-md p-8 md:p-12 shadow-2xl relative my-8"
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
                 <button 
                  onClick={() => handleUpdateCategory(editingCategory)} 
                  disabled={isUpdatingCategory}
                  className="btn-primary w-full py-5 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                 >
                   {isUpdatingCategory ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'שמור שינויים'}
                 </button>
                 <button onClick={() => setEditingCategory(null)} className="w-full bg-slate-100 font-black text-slate-500 py-5 rounded-2xl">ביטול</button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>

      {/* 🏷️ ADD BRAND MODAL */}
      <AnimatePresence>
        {isAddingBrand && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 md:p-12 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddingBrand(false)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
                </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">הוספת מותג חדש</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם המותג</label>
                  <input 
                    type="text" 
                    value={newBrand.name}
                    onChange={(e) => setNewBrand({...newBrand, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קישור ללוגו (URL)</label>
                  <input 
                    type="text" 
                    placeholder="https://example.com/logo.png"
                    value={newBrand.logo}
                    onChange={(e) => setNewBrand({...newBrand, logo: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">סוג המותג</label>
                  <input 
                    type="text" 
                    placeholder="למשל: כלי בית, צעצועים..."
                    value={newBrand.type}
                    onChange={(e) => setNewBrand({...newBrand, type: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:border-primary-500" 
                  />
                </div>
              </div>

              <div className="mt-12">
                 <button 
                  onClick={handleAddBrand}
                  disabled={isUpdatingBrand}
                  className="btn-primary w-full py-5 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingBrand ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'שמור מותג'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🏷️ EDIT BRAND MODAL */}
      <AnimatePresence>
        {editingBrand && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 md:p-12 shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingBrand(null)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
                </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">עריכת מותג</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם המותג</label>
                  <input 
                    type="text" 
                    value={editingBrand.name}
                    onChange={(e) => setEditingBrand({...editingBrand, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קישור ללוגו (URL)</label>
                  <input 
                    type="text" 
                    value={editingBrand.logo}
                    onChange={(e) => setEditingBrand({...editingBrand, logo: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">סוג המותג</label>
                  <input 
                    type="text" 
                    value={editingBrand.type || ''}
                    onChange={(e) => setEditingBrand({...editingBrand, type: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:border-primary-500" 
                  />
                </div>
              </div>

              <div className="mt-12">
                 <button 
                  onClick={() => handleUpdateBrand(editingBrand)}
                  disabled={isUpdatingBrand}
                  className="btn-primary w-full py-5 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingBrand ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'עדכן מותג'}
                </button>
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
              className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-[48px] overflow-hidden shadow-2xl border border-white/20 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header: Title and Close Button */}
              <div className="p-6 md:p-10 pb-0 flex items-center justify-between gap-6 relative z-10">
                <div className="px-8 py-4 bg-slate-50/50 backdrop-blur-md rounded-[24px] border border-slate-100 shadow-sm">
                  <p className="text-slate-900 font-[900] text-xl md:text-2xl tracking-tighter">{selectedProductName}</p>
                </div>
                
                <button 
                  onClick={closeImageModal}
                  className="w-14 h-14 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-800 hover:text-slate-900 hover:scale-110 active:scale-95 transition-all duration-500 shadow-xl border border-white"
                >
                  <X size={28} />
                </button>
              </div>

              {/* Image Content Container */}
              <div className="flex-1 flex items-center justify-center p-8 md:p-12 overflow-hidden min-h-0">
                <img src={selectedImage} alt={selectedProductName} className="max-w-full max-h-full object-contain cursor-default select-none" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🛍️ ORDER DETAILS MODAL */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[40px] w-full max-w-3xl p-6 md:p-14 shadow-2xl relative my-8"
              >
              <button 
                onClick={() => setSelectedOrder(null)}
                className="absolute left-6 top-6 md:left-10 md:top-10 text-slate-300 hover:text-slate-900 transition-colors z-20"
              >
                <X size={32} />
              </button>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="pt-10 md:pt-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter">פרטי הזמנה</h2>
                    {!isEditingOrder && selectedOrder.status !== 'Canceled' && (
                      <button 
                        onClick={() => setIsEditingOrder(true)}
                        className="p-2 text-primary-500 hover:bg-primary-50 rounded-xl transition-all"
                        title="ערוך מוצרים בהזמנה"
                      >
                        <Edit size={20} />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-400 font-bold text-xs md:text-sm">
                    {selectedOrder.customer_name} • {new Date(selectedOrder.created_at).toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex items-center md:items-end relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      const rect = { top: r.top, left: r.left, bottom: r.bottom, right: r.right };
                      setActiveStatusMenu(prev => prev.id === 'selected' ? { id: null, rect: null } : { id: 'selected', rect });
                    }}
                    className="group flex items-center gap-2 transition-all active:scale-95"
                  >
                    {selectedOrder.status === 'New' ? (
                      <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black group-hover:bg-blue-100 transition-colors">
                        <Clock size={12} /> חדש
                      </span>
                    ) : selectedOrder.status === 'Completed' ? (
                      <span className="flex items-center gap-1.5 bg-green-50 text-green-600 px-4 py-1.5 rounded-full text-[10px] font-black group-hover:bg-green-100 transition-colors">
                        <CheckCircle2 size={12} /> הושלם
                      </span>
                    ) : selectedOrder.status === 'Canceled' ? (
                      <span className="flex items-center gap-1.5 bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black group-hover:bg-red-100 transition-colors">
                        <AlertCircle size={12} /> בוטל
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black group-hover:bg-slate-200 transition-colors">
                        <AlertCircle size={12} /> {selectedOrder.status}
                      </span>
                    )}
                    <ChevronRight size={14} className={`text-slate-300 transition-transform duration-300 ${activeStatusMenu.id === 'selected' ? '-rotate-90' : 'rotate-90'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-6 max-h-[45vh] overflow-y-auto pr-2 scrollbar-hide py-2">
                {(isEditingOrder ? tempOrderItems : selectedOrder.items).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 md:gap-6 p-4 md:p-5 bg-slate-50/50 rounded-2xl md:rounded-3xl border border-slate-100 hover:bg-slate-50 transition-colors shadow-sm">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
                      {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Package size={24} className="text-slate-300" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-slate-800 text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">מק״ט: {item.sku}</p>
                      
                      {isEditingOrder ? (
                        <div className="flex items-center gap-3 mt-2">
                           <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                              <button 
                                onClick={() => handleUpdateItemQuantity(item.sku, -1)}
                                className="p-1 px-2 hover:bg-slate-50 text-slate-400"
                              >-</button>
                              <span className="px-2 font-black text-xs text-slate-700 min-w-[24px] text-center">{item.quantity}</span>
                              <button 
                                onClick={() => handleUpdateItemQuantity(item.sku, 1)}
                                className="p-1 px-2 hover:bg-slate-50 text-slate-400"
                              >+</button>
                           </div>
                           <button 
                             onClick={() => handleRemoveItemFromOrder(item.sku)}
                             className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                           >
                             <Trash2 size={14} />
                           </button>
                        </div>
                      ) : (
                        <p className="text-[10px] font-bold text-slate-500">{item.quantity} יחידות</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900 text-sm">₪{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}

                {isEditingOrder && (
                  <div className="mt-8 space-y-4">
                    <div className="relative">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="הוסף מוצר להזמנה..."
                        className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 font-bold text-xs outline-none focus:border-primary-400 transition-all shadow-sm"
                        value={editingOrderSearch}
                        onChange={(e) => setEditingOrderSearch(e.target.value)}
                      />
                    </div>
                    
                    {filteredProductsForEditing.length > 0 && (
                      <div className="bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-50">
                        {filteredProductsForEditing.map(product => (
                          <div key={product.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-100">
                                {product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <Package size={16} className="text-slate-300 mx-auto mt-2" />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800">{product.name}</p>
                                <p className="text-[9px] font-bold text-slate-400">{product.sku}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                handleAddItemToOrder(product);
                                setEditingOrderSearch('');
                              }}
                              className="bg-primary-50 text-primary-600 px-3 py-1.5 rounded-lg font-black text-[10px] hover:bg-primary-500 hover:text-white transition-all"
                            >
                              הוסף
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-14 pt-10 border-t border-slate-100">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                    <Edit size={20} className="text-primary-500" />
                  </div>
                  הערות ומעקב
                </h3>
                
                <div className="space-y-4 mb-10 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                  {selectedOrder.notes && selectedOrder.notes.length > 0 ? (
                    selectedOrder.notes.map((note, nIdx) => (
                      <div key={nIdx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-right overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                           <AnimatePresence mode="wait">
                            {confirmingNoteDelete === nIdx ? (
                              <motion.div 
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded-xl"
                              >
                                <span className="text-[10px] font-black text-red-600">מחיקת הערה?</span>
                                <button onClick={() => handleDeleteNote(nIdx)} className="p-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
                                  <Check size={10} />
                                </button>
                                <button onClick={() => setConfirmingNoteDelete(null)} className="p-1 bg-white text-slate-400 rounded-md hover:bg-slate-100 transition-colors">
                                  <X size={10} />
                                </button>
                              </motion.div>
                            ) : (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2"
                              >
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                                  <User size={10} /> {note.author}
                                </span>
                                <button 
                                  onClick={() => setConfirmingNoteDelete(nIdx)}
                                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  title="מחק הערה"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Clock size={10} /> {new Date(note.timestamp).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed pr-1">{note.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 opacity-50">
                      <p className="text-xs font-bold text-slate-400">אין הערות להזמנה זו</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6 bg-slate-50/30 p-6 md:p-8 rounded-[36px] border border-slate-100 shadow-inner">
                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2 mb-1">מי כותב ההערה?</label>
                      <input 
                        type="text" 
                        placeholder="השם שלך..."
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-sm outline-none focus:border-primary-500 transition-all" 
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex items-end">
                      <button 
                        onClick={handleAddNote}
                        disabled={isSubmittingNote || !newNoteText.trim() || !adminName.trim()}
                        className="w-full bg-primary-500 text-white py-3 rounded-xl font-black text-sm hover:bg-primary-600 transition-all shadow-lg shadow-primary-200 disabled:opacity-50 disabled:shadow-none active:scale-95"
                      >
                        {isSubmittingNote ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'הוספת הערה למעקב'}
                      </button>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pr-2 mb-1.5">תוכן ההערה</label>
                      <textarea 
                        placeholder="כתוב כאן הערה, עדכון או הנחיות עבודה..."
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-primary-500 transition-all h-20 resize-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-14 pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-right flex flex-col gap-2">
                  {isEditingOrder ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex-1">
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">הנחת הזמנה (%)</label>
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={tempOrderDiscount}
                            onChange={(e) => setTempOrderDiscount(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-black text-sm outline-none focus:border-primary-400 transition-all"
                          />
                        </div>
                        <div className="h-10 w-px bg-slate-200" />
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">סכום ביניים</p>
                          <p className="font-black text-slate-400 text-sm line-through">₪{tempOrderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-3xl md:text-4xl font-black text-primary-600">
                          ₪{(tempOrderItems.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 0)), 0) * (1 - (Number(tempOrderDiscount) || 0) / 100)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {selectedOrder.discount_pct > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">
                            סכום ביניים: ₪{(selectedOrder.items || []).reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0).toFixed(2)}
                          </p>
                          <p className="text-xs md:text-sm font-black text-green-500 uppercase tracking-widest">
                            הנחה: {selectedOrder.discount_pct}% (-₪{( ((selectedOrder.items || []).reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0)) * (selectedOrder.discount_pct / 100) ).toFixed(2)})
                          </p>
                        </div>
                      )}
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1.5">סה״כ לתשלום</p>
                      <p className="text-3xl md:text-5xl font-black text-slate-900">
                        ₪{Number(selectedOrder.total_price || 0).toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  {isEditingOrder ? (
                    <>
                      <button 
                        onClick={handleSaveOrderEdits}
                        disabled={isUpdatingOrder}
                        className="flex-1 md:flex-none bg-primary-500 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-primary-600 transition-colors shadow-lg shadow-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdatingOrder ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'שמור שינויים'}
                      </button>
                      <button 
                        onClick={() => setIsEditingOrder(false)}
                        className="flex-1 md:flex-none bg-slate-100 text-slate-500 px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-colors"
                      >
                        ביטול
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => { handleUpdateOrderStatus(selectedOrder.id, 'Completed'); setSelectedOrder(null); }}
                        className="flex-1 md:flex-none bg-green-500 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                      >
                        סמן כהושלם
                      </button>
                      <button 
                        onClick={() => setSelectedOrder(null)}
                        className="flex-1 md:flex-none bg-slate-100 text-slate-500 px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-colors"
                      >
                        סגור
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
      
      {/* 🚫 CANCELLATION MODAL */}
      <AnimatePresence>
        {orderToCancel && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative"
            >
              <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl font-black tracking-tighter text-slate-900">ביטול הזמנה</h2>
                <p className="text-slate-400 font-bold text-xs mt-1">האם אתה בטוח שברצונך לבטל את ההזמנה של {orderToCancel.customer_name}?</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">סיבת הביטול (אופציונלי)</label>
                  <textarea 
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="למה ההזמנה בוטלה?..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:border-red-500 transition-all h-24 resize-none" 
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={confirmCancellation}
                    disabled={isSubmittingNote}
                    className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                  >
                    {isSubmittingNote ? 'מבטל...' : 'אישור ביטול'}
                  </button>
                  <button 
                    onClick={() => setOrderToCancel(null)}
                    disabled={isSubmittingNote}
                    className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-colors"
                  >
                    חזרה
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
