import { useState, useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import Header from './components/Header';
import AdminDashboard from './pages/AdminDashboard';
import ExternalDashboard from './pages/ExternalDashboard';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/Login';
import { getGlobalSettings, saveGlobalSettings } from './utils/storage';

import './App.css';

/**
 * App - Groopy Work Manager Root Component
 */
export default function App() {
  const [userRole, setUserRole] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'viewer') return 'external';
    return localStorage.getItem('tiktak_test_role') || 'admin';
  });
  
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Dynamic application settings
  const [settings, setSettings] = useState({
    workTypes: ['אריזה', 'מדבקה', 'קטלוג', 'לוגו', 'תיקון קובץ', 'קובץ להדפסה', 'אחר'],
    statuses: ['חדש', 'בטיפול', 'נשלח לספק', 'אושר לספק'],
    suppliers: [
      { name: 'Shenzhen Printing Ltd', email: 'li@shenzhenprint.com', phone: '+86 138 0000 0000', address: 'Shenzhen, China', wechat: 'wxid_szprint', notes: 'ספק דפוס ראשי בסין', contactPerson: 'Mr. Li' },
      { name: 'אריזות ישראל', email: 'sales@israelpack.co.il', phone: '03-5551234', address: 'אזור התעשייה חולון', wechat: '', notes: 'ספק אריזות קרטון בארץ', contactPerson: 'משה כהן' },
      { name: 'מפעלי קרטון בע"מ', email: 'info@cartonfact.co.il', phone: '04-8884321', address: 'אזור התעשייה מפרץ חיפה', wechat: '', notes: 'ייצור קופסאות קרטון מותאמות אישית', contactPerson: '' }
    ],
    contacts: [
      { name: 'Mr. Li', role: 'איש קשר מכירות סין', phone: '+86 138 0000 0000', email: 'li@shenzhenprint.com', address: 'Shenzhen, China', wechat: 'wxid_szprint', notes: 'עובד מול Shenzhen Printing' },
      { name: 'משה כהן', role: 'מנהל ייצור ישראל', phone: '052-1234567', email: 'moshe@israelpack.co.il', address: 'חולון', wechat: '', notes: 'מנהל ייצור באריזות ישראל' }
    ],
    defaultStatus: 'חדש',
    statusColors: {
      'חדש': 'badge-new',
      'בטיפול': 'badge-in-progress',
      'נשלח לספק': 'badge-waiting-approval',
      'אושר לספק': 'badge-approved'
    }
  });

  const isSharedLink = new URLSearchParams(window.location.search).get('mode') === 'viewer';

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (isSharedLink) return true;
    
    const isAdminAuthenticated = localStorage.getItem('tiktak_admin_authenticated') === 'true';
    const savedRole = localStorage.getItem('tiktak_test_role') || 'admin';
    
    if (savedRole === 'admin') {
      return isAdminAuthenticated;
    }
    return savedRole === 'external';
  });
  
  // Password modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [modalError, setModalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Helper functions for normalization
  const normalizeSuppliers = (sups) => {
    return (sups || []).map(s => {
      if (typeof s === 'string') {
        return { name: s, email: '', phone: '', address: '', wechat: '', notes: '', contactPerson: '' };
      }
      return {
        name: s.name || '',
        email: s.email || '',
        phone: s.phone || '',
        address: s.address || '',
        wechat: s.wechat || '',
        notes: s.notes || '',
        contactPerson: s.contactPerson || ''
      };
    });
  };

  const normalizeContacts = (conts) => {
    return (conts || []).map(c => {
      if (typeof c === 'string') {
        return { name: c, role: '', phone: '', email: '', address: '', wechat: '', notes: '' };
      }
      return {
        name: c.name || '',
        role: c.role || '',
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        wechat: c.wechat || '',
        notes: c.notes || ''
      };
    });
  };

  useEffect(() => {
    let unsubscribeSettings = () => {};
    // Automatically sign in anonymously and load settings
    const initializeApp = async () => {
      try {
        await signInAnonymously(auth);
        
        // Listen to settings in real time from Firestore
        const settingsDocRef = doc(db, 'settings', 'global');
        unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
          const forcedStatuses = ['חדש', 'בטיפול', 'נשלח לספק', 'אושר לספק'];
          const forcedStatusColors = {
            'חדש': 'badge-new',
            'בטיפול': 'badge-in-progress',
            'נשלח לספק': 'badge-waiting-approval',
            'אושר לספק': 'badge-approved'
          };
          if (docSnap.exists()) {
            const dbSettings = docSnap.data();
            setSettings(prev => ({
              ...prev,
              ...dbSettings,
              statuses: forcedStatuses,
              statusColors: forcedStatusColors,
              defaultStatus: 'חדש',
              suppliers: dbSettings.suppliers !== undefined ? normalizeSuppliers(dbSettings.suppliers) : prev.suppliers,
              contacts: dbSettings.contacts !== undefined ? normalizeContacts(dbSettings.contacts) : prev.contacts
            }));
          } else {
            setSettings(prev => ({
              ...prev,
              statuses: forcedStatuses,
              statusColors: forcedStatusColors,
              defaultStatus: 'חדש'
            }));
          }
          setInitializing(false);
        }, (err) => {
          console.error("Settings real-time listener error:", err);
          setInitializing(false);
        });
        
      } catch (e) {
        console.error("Initialization failed", e);
        setError("שגיאה בחיבור ל-Firebase: ודאו שספק ההתחברות Anonymous מופעל ב-Firebase Console.");
        setInitializing(false);
      }
    };
    initializeApp();
    return () => {
      unsubscribeSettings();
    };
  }, []);

  const handleRoleChange = (newRole) => {
    if (newRole === 'admin') {
      const isAdminAuthenticated = localStorage.getItem('tiktak_admin_authenticated') === 'true';
      if (!isAdminAuthenticated) {
        setModalError('');
        setPasswordInput('');
        setShowPassword(false);
        setShowPasswordModal(true);
        return;
      }
    }
    
    setUserRole(newRole);
    setCurrentView('dashboard'); // reset view when changing roles
    if (!isSharedLink) {
      localStorage.setItem('tiktak_test_role', newRole);
    }
  };

  const handlePasswordModalSubmit = (e) => {
    e.preventDefault();
    setModalError('');
    if (!passwordInput.trim()) {
      setModalError('אנא הזינו סיסמת מנהל/ת.');
      return;
    }
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'Kefy0507';
    if (passwordInput === adminPassword) {
      localStorage.setItem('tiktak_admin_authenticated', 'true');
      localStorage.setItem('tiktak_test_role', 'admin');
      setUserRole('admin');
      setCurrentView('dashboard');
      setShowPasswordModal(false);
    } else {
      setModalError('סיסמה שגויה. אנא נסו שנית.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tiktak_admin_authenticated');
    setIsLoggedIn(false);
  };

  const handleSaveSettings = async (newSettings) => {
    const forcedStatuses = ['חדש', 'בטיפול', 'נשלח לספק', 'אושר לספק'];
    const forcedStatusColors = {
      'חדש': 'badge-new',
      'בטיפול': 'badge-in-progress',
      'נשלח לספק': 'badge-waiting-approval',
      'אושר לספק': 'badge-approved'
    };
    const settingsToSave = {
      ...newSettings,
      statuses: forcedStatuses,
      statusColors: forcedStatusColors,
      defaultStatus: 'חדש'
    };
    await saveGlobalSettings(settingsToSave);
    setSettings(settingsToSave);
  };

  if (initializing) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Rubik, sans-serif',
        color: 'var(--text-muted)'
      }}>
        טוען מערכת...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Rubik, sans-serif',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h3 style={{ color: 'var(--priority-urgent-text)' }}>⚠️ שגיאת חיבור</h3>
        <p style={{ marginTop: '10px' }}>{error}</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Login onLogin={(role) => {
        setUserRole(role);
        setIsLoggedIn(true);
      }} />
    );
  }

  return (
    <div className="app-container">
      <Header 
        userRole={userRole} 
        onChangeRole={handleRoleChange} 
        showSwitcher={!isSharedLink} 
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
      />
      {userRole === 'admin' ? (
        currentView === 'settings' ? (
          <SettingsPage 
            settings={settings} 
            onSaveSettings={handleSaveSettings} 
            onBack={() => setCurrentView('dashboard')} 
          />
        ) : (
          <AdminDashboard settings={settings} />
        )
      ) : (
        <ExternalDashboard settings={settings} />
      )}

      {/* Password Verification Modal for Role Switcher */}
      {showPasswordModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">אימות סיסמת מנהל/ת</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowPasswordModal(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePasswordModalSubmit}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="modal-password">הזינו סיסמת מנהל/ת כדי להמשיך:</label>
                  <div className="password-wrapper">
                    <input
                      id="modal-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="סיסמה..."
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (modalError) setModalError('');
                      }}
                      autoFocus
                      style={{ textAlign: 'right', direction: 'rtl' }}
                    />
                    <button
                      type="button"
                      className="password-toggle-text"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'הסתר' : 'הצג'}
                    </button>
                  </div>
                  {modalError && (
                    <div className="form-error" style={{ marginTop: '12px', textAlign: 'center' }}>
                      ⚠️ {modalError}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer" style={{ backgroundColor: 'var(--background)' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPasswordModal(false)}
                >
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary">
                  אישור מעבר
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


