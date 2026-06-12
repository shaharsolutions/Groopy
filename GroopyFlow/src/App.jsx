import React, { useState, useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';
import Header from './components/Header';
import AdminDashboard from './pages/AdminDashboard';
import ExternalDashboard from './pages/ExternalDashboard';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/Login';
import { getGlobalSettings, saveGlobalSettings } from './utils/storage';
import SystemTour from './components/SystemTour';
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
    statuses: ['חדש', 'בטיפול', 'ממתין למידע', 'ממתין לספק בסין', 'ממתין לאישור', 'נדרש תיקון', 'מאושר', 'נשלח לייצור', 'הושלם', 'מוקפא'],
    priorities: ['רגילה', 'גבוהה', 'דחופה'],
    importManagers: ['אלון ישראלי', 'שירה כהן', 'דוד לוי'],
    stores: ['סניף אילת', 'סניף תל אביב', 'סניף חיפה', 'כלל הרשת'],
    suppliers: ['Shenzhen Printing Ltd', 'אריזות ישראל', 'מפעלי קרטון בע"מ'],
    contacts: [
      { name: 'Mr. Li', role: 'איש קשר מכירות סין', phone: '+86 138 0000 0000', email: 'li@shenzhenprint.com' },
      { name: 'משה כהן', role: 'מנהל ייצור ישראל', phone: '052-1234567', email: 'moshe@israelpack.co.il' }
    ],
    defaultStatus: 'חדש',
    statusColors: {
      'חדש': 'badge-new',
      'בטיפול': 'badge-in-progress',
      'ממתין למידע': 'badge-waiting-info',
      'ממתין לספק בסין': 'badge-waiting-china',
      'ממתין לאישור': 'badge-waiting-approval',
      'נדרש תיקון': 'badge-needs-revision',
      'מאושר': 'badge-approved',
      'נשלח לייצור': 'badge-sent-production',
      'הושלם': 'badge-completed',
      'מוקפא': 'badge-frozen'
    },
    priorityColors: {
      'רגילה': 'priority-normal',
      'גבוהה': 'priority-high',
      'דחופה': 'priority-urgent'
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

  useEffect(() => {
    // Automatically sign in anonymously and load settings
    const initializeApp = async () => {
      try {
        await signInAnonymously(auth);
        
        // Fetch settings from Firestore
        const dbSettings = await getGlobalSettings();
        if (dbSettings) {
          setSettings(prev => ({
            ...prev,
            ...dbSettings,
            suppliers: dbSettings.suppliers || prev.suppliers || [],
            contacts: dbSettings.contacts || prev.contacts || []
          }));
        }
        
        setInitializing(false);
      } catch (e) {
        console.error("Initialization failed", e);
        setError("שגיאה בחיבור ל-Firebase: ודאו שספק ההתחברות Anonymous מופעל ב-Firebase Console.");
        setInitializing(false);
      }
    };
    initializeApp();
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
    if (passwordInput === 'Kefy0507') {
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
    await saveGlobalSettings(newSettings);
    setSettings(newSettings);
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
                      onChange={(e) => setPasswordInput(e.target.value)}
                      autoFocus
                      required
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
      <SystemTour 
        userRole={userRole} 
        currentView={currentView} 
        setView={setCurrentView} 
      />
    </div>
  );
}


