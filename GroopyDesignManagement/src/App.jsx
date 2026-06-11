import React, { useState, useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';
import Header from './components/Header';
import AdminDashboard from './pages/AdminDashboard';
import ExternalDashboard from './pages/ExternalDashboard';
import SettingsPage from './pages/SettingsPage';
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
    return localStorage.getItem('groopy_test_role') || 'admin';
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
    setUserRole(newRole);
    setCurrentView('dashboard'); // reset view when changing roles
    if (!isSharedLink) {
      localStorage.setItem('groopy_test_role', newRole);
    }
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

  return (
    <div className="app-container">
      <Header 
        userRole={userRole} 
        onChangeRole={handleRoleChange} 
        showSwitcher={!isSharedLink} 
        currentView={currentView}
        onViewChange={setCurrentView}
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
    </div>
  );
}


