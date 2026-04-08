import React from 'react';
import { Plus, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = ({ 
    activeTab, 
    productsCount, 
    bannersCount, 
    setIsSidebarOpen, 
    setIsAddingProduct, 
    setIsAddingAgent, 
    setIsAddingBrand, 
    setIsAddingBanner, 
    setIsAddingCategory,
    setIsAddingCustomer 
}) => {
  const getTitle = () => {
    switch (activeTab) {
      case 'products': return 'ניהול מוצרים';
      case 'agents': return 'רשת הסוכנים';
      case 'orders': return 'ניהול הזמנות';
      case 'customers': return 'ניהול לקוחות';
      case 'brands': return 'ניהול מותגים';
      case 'banners': return 'ניהול באנרים';
      case 'categories': return 'ניהול קטגוריות';
      default: return 'ניהול מערכת';
    }
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'products': return `סה״כ ${productsCount} מוצרים רשומים`;
      case 'agents': return `רשימת סוכנים וקישורי הפצה`;
      case 'orders': return `מעקב אחר הזמנות שבוצעו בוואטסאפ`;
      case 'customers': return `ניהול מאגר לקוחות וביצועי רכישה`;
      case 'banners': return `סה״כ ${bannersCount} באנרים פעילים במערכת`;
      case 'brands': return `ניהול לוגואים של מותגים לקרוסלה`;
      case 'categories': return 'עריכת קטגוריות המוצרים בקטלוג';
      default: return '';
    }
  };

  const getButtonText = () => {
    switch (activeTab) {
      case 'products': return 'מוצר חדש';
      case 'agents': return 'סוכן חדש';
      case 'brands': return 'מותג חדש';
      case 'banners': return 'באנר חדש';
      case 'customers': return 'לקוח חדש';
      case 'categories': return 'קטגוריה חדשה';
      default: return '';
    }
  };

  const handleAddClick = () => {
    if (activeTab === 'products') setIsAddingProduct(true);
    else if (activeTab === 'agents') setIsAddingAgent(true);
    else if (activeTab === 'brands') setIsAddingBrand(true);
    else if (activeTab === 'banners') setIsAddingBanner(true);
    else if (activeTab === 'customers') setIsAddingCustomer(true);
    else setIsAddingCategory(true);
  };

  return (
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
             {getTitle()}
           </h2>
           <p className="text-slate-400 font-bold text-base whitespace-nowrap">
             {getSubtitle()}
           </p>
        </div>
      </div>

      <div className="flex flex-wrap md:flex-nowrap gap-3 md:gap-4 w-full md:w-auto">
        {activeTab !== 'orders' && (
          <button 
            onClick={handleAddClick}
            className="flex-1 md:flex-none btn-primary w-full md:w-fit flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span className="whitespace-nowrap">{getButtonText()}</span>
          </button>
        )}
        
        <Link 
          to="/"
          className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 px-5 md:px-6 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm group"
        >
          <Eye size={20} className="group-hover:scale-110 transition-transform" />
          <span className="whitespace-nowrap">חזרה לקטלוג</span>
        </Link>
      </div>
    </header>
  );
};

export default Header;
