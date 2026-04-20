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
  const [customers, setCustomers] = useState([]);
  const [personalizedLinks, setPersonalizedLinks] = useState([]);
  const [settings, setSettings] = useState([]);
  const [brokenImageIds, setBrokenImageIds] = useState(new Set());
  
  const reportBrokenImage = (id) => {
    setBrokenImageIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeFilters, setActiveFilters] = useState({
    is_best_seller: false,
    is_hot_deal: false,
    is_new: false,
    is_default_carton: false,
    is_incremental_add: false,
    no_image: false,
    is_image_broken: false,
    is_visible: false
  });
  const [filterMode, setFilterMode] = useState('include'); // 'include' or 'exclude'
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const fetchData = async () => {
    try {
      const [
        { data: productsData },
        { data: agentsData },
        { data: categoriesData },
        { data: ordersData },
        { data: brandsData },
        { data: bannersData },
        { data: customersData },
        { data: linksData },
        { data: settingsData }
      ] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('agents').select('*').order('name'),
        supabase.from('categories').select('*').order('order_index', { ascending: true }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('brands').select('*').order('type', { ascending: true, nullsFirst: false }).order('name'),
        supabase.from('banners').select('*').order('order_index', { ascending: true }),
        supabase.from('customers').select('*').order('business_name'),
        supabase.from('personalized_links').select('*').order('created_at', { ascending: false }),
        supabase.from('settings').select('*')
      ]);

      if (productsData) setProducts(productsData);
      if (agentsData) setAgents(agentsData);
      if (categoriesData) setCategories(categoriesData);
      if (ordersData) setOrders(ordersData);
      if (brandsData) setBrands(brandsData);
      if (bannersData) setBanners(bannersData);
      if (customersData) setCustomers(customersData);
      if (linksData) setPersonalizedLinks(linksData);
      if (settingsData) setSettings(settingsData);
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

      // New: Check if product matches any active flag filters
      // If a filter is active (true), the product must match (or not match if inverse) that flag
      const matchesFlags = Object.entries(activeFilters).every(([flag, isActive]) => {
        if (!isActive) return true;
        
        let productVal;
        if (flag === 'no_image') {
          productVal = !p.image;
        } else if (flag === 'is_image_broken') {
          productVal = brokenImageIds.has(p.id);
        } else if (flag === 'is_visible') {
          productVal = p.is_visible !== false;
        } else {
          productVal = p[flag] === true;
        }
        
        return filterMode === 'include' ? productVal : !productVal;
      });
        
      return matchesSearch && matchesCategory && matchesFlags;
    });
  }, [products, deferredSearchTerm, selectedCategory, activeFilters]);

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

  const ordersWithIds = useMemo(() => {
    return orders.map((order, idx) => ({
      ...order,
      // Add a stable display number
      sequentialId: orders.length - idx
    }));
  }, [orders]);

  const ordersStats = useMemo(() => ({
    new: ordersWithIds.filter(o => o.status === 'New').length,
    total: ordersWithIds.length
  }), [ordersWithIds]);

  const customersWithStats = useMemo(() => {
    // 1. Get all unique customer names from orders
    const orderCustomerNames = [...new Set(orders.map(o => o.customer_name).filter(Boolean))];
    
    // 2. Map existing customers from DB
    const dbCustomers = customers.map(c => ({ ...c, source: 'crm' }));
    
    // 3. Find names in orders that aren't in the CRM table yet AND aren't linked via email
    const virtualCustomers = orderCustomerNames
      .filter(name => {
        // If the name already exists in CRM, it's not virtual
        if (customers.some(c => c.business_name === name)) return false;
        
        // If any order for this name matches a CRM customer by email,
        // we treat this name as an alias/old-name and don't create a new record.
        const ordersForName = orders.filter(o => o.customer_name === name);
        const isLinkedToCRM = ordersForName.some(o => 
          o.customer_email && customers.some(c => c.email === o.customer_email)
        );
        
        return !isLinkedToCRM;
      })
      .map(name => ({
        id: `virtual-${name}`,
        business_name: name,
        source: 'orders'
      }));
    
    // 4. Combine both lists
    const allUniqueCustomers = [...dbCustomers, ...virtualCustomers];

    // 5. Calculate stats for each
    return allUniqueCustomers.map(customer => {
      const customerOrders = orders.filter(o => 
        o.customer_name === customer.business_name || (customer.email && o.customer_email === customer.email)
      );
      
      return {
        ...customer,
        orderCount: customerOrders.length,
        lastOrderDate: customerOrders.length > 0 
          ? customerOrders[0].created_at 
          : null
      };
    });
  }, [customers, orders]);

  const agentsWithStats = useMemo(() => {
    return agents.map(agent => {
      const agentOrders = orders.filter(o => o.agent_id === agent.id);
      return {
        ...agent,
        orderCount: agentOrders.length
      };
    });
  }, [agents, orders]);

  const sortedCustomers = useMemo(() => {
    const sortableItems = [...customersWithStats];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'orderCount') {
          aValue = parseInt(aValue) || 0;
          bValue = parseInt(bValue) || 0;
        } else if (sortConfig.key === 'lastOrderDate') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
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
  }, [customersWithStats, sortConfig]);

  return {
    activeTab, setActiveTab,
    isSidebarOpen, setIsSidebarOpen,
    products, setProducts,
    sortedProducts,
    agents, setAgents,
    agentsWithStats,
    orders: ordersWithIds, setOrders,
    categories, setCategories,
    brands, setBrands,
    banners, setBanners,
    searchTerm, setSearchTerm,
    selectedCategory, setSelectedCategory,
    activeFilters, setActiveFilters,
    filterMode, setFilterMode,
    sortConfig, setSortConfig,
    ordersStats,
    customers, setCustomers,
    customersWithStats,
    sortedCustomers,
    personalizedLinks, setPersonalizedLinks,
    settings, setSettings,
    brokenImageIds, reportBrokenImage,
    fetchData
  };
};
