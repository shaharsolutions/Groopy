import React, { useState, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Catalog from './pages/Catalog';
import ScrollToTop from './components/common/ScrollToTop';

// Lazy-loaded pages — only downloaded when navigated to
const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Accessibility = lazy(() => import('./pages/Accessibility'));
const Catalog2026 = lazy(() => import('./pages/Catalog2026'));

// Minimal loading spinner for lazy routes
const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FDFDFE]">
    <div className="w-12 h-12 border-4 border-slate-100 border-t-primary-500 rounded-full animate-spin" />
  </div>
);

const App = () => {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/catalog-2026" element={<Catalog2026 />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/accessibility" element={<Accessibility />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

const AdminRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('groopy_admin_session') === 'true' || 
           sessionStorage.getItem('groopy_admin_session') === 'true';
  });

  const handleLogin = (isAuth, rememberMe) => {
    setIsAuthenticated(isAuth);
    if (isAuth) {
      if (rememberMe) {
        localStorage.setItem('groopy_admin_session', 'true');
      } else {
        sessionStorage.setItem('groopy_admin_session', 'true');
      }
    }
  };

  if (isAuthenticated) {
    return <Admin />;
  }

  return <Login onLogin={handleLogin} />;
};

export default App;
