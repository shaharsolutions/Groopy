import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { supabase } from '../supabaseClient';

export const useAdminData = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [banners, setBanners] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  
  const fetchData = async () => {
    try {
      const [
        { data: productsData },
        { data: agentsData },
        { data: categoriesData },
        { data: ordersData },
        { data: brandsData },
        { data: bannersData }
      ] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('agents').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('brands').select('*').order('type', { ascending: true, nullsFirst: false }).order('name'),
        supabase.from('banners').select('*').order('order_index', { ascending: true })
      ]);

      if (productsData) setProducts(productsData);
      if (agentsData) setAgents(agentsData);
      if (categoriesData) setCategories(categoriesData);
      if (ordersData) setOrders(ordersData);
      if (brandsData) setBrands(brandsData);
      if (bannersData) setBanners(bannersData);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(deferredSearchTerm.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === 'All' || 
        p.category === selectedCategory;
        
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

  return {
    activeTab, setActiveTab,
    isSidebarOpen, setIsSidebarOpen,
    products, setProducts,
    sortedProducts,
    agents, setAgents,
    orders, setOrders,
    categories, setCategories,
    brands, setBrands,
    banners, setBanners,
    searchTerm, setSearchTerm,
    selectedCategory, setSelectedCategory,
    sortConfig, setSortConfig,
    ordersStats,
    fetchData
  };
};
