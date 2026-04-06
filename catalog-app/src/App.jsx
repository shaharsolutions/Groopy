import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Admin from './pages/Admin';
import Login from './pages/Login';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Accessibility from './pages/Accessibility';
import ScrollToTop from './components/common/ScrollToTop';

const App = () => {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/accessibility" element={<Accessibility />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
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
