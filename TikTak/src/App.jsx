import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import Header from './components/Header';
import AdminDashboard from './pages/AdminDashboard';
import ExternalDashboard from './pages/ExternalDashboard';
import SettingsPage from './pages/SettingsPage';
import SuppliersContactsPage from './pages/SuppliersContactsPage';
import UsersManagement from './pages/UsersManagement';
import ActivityLogPage from './pages/ActivityLogPage';
import Login from './pages/Login';
import {
  saveGlobalSettings,
  getGlobalSettings,
  seedUserDatabaseIfEmpty,
  migrateLegacyTasksToUser,
  registerUserLogin,
  migrateSuppliersAndContacts,
  addSupplier,
  addContact,
  ensureDefaultSuppliersAndContacts
} from './utils/storage';

import './App.css';

/**
 * App - Groopy Work Manager Root Component
 */
export default function App() {
  const [userRole, setUserRole] = useState('external');
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [userId, setUserId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Impersonation states for admin
  const [impersonatedUserId, setImpersonatedUserId] = useState(null);
  const [impersonatedUserEmail, setImpersonatedUserEmail] = useState('');

  // Dynamic application settings
  const [settings, setSettings] = useState({
    workTypes: ['אריזה', 'מדבקה', 'קטלוג', 'לוגו', 'תיקון קובץ', 'קובץ להדפסה', 'אחר'],
    statuses: ['חדש', 'בטיפול', 'נשלח לספק', 'אושר לספק', 'ארכיון'],
    defaultStatus: 'חדש',
    statusColors: {
      'חדש': 'badge-new',
      'בטיפול': 'badge-in-progress',
      'נשלח לספק': 'badge-waiting-approval',
      'אושר לספק': 'badge-approved',
      'ארכיון': 'badge-archive'
    }
  });

  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);

  const isSharedLink = new URLSearchParams(window.location.search).get('mode') === 'viewer';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isViewer = params.get('mode') === 'viewer';
    const targetUserId = params.get('userId');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (isViewer && targetUserId) {
          // Shared link viewer mode
          setUserRole('external');
          setIsLoggedIn(true);
          setUserId(targetUserId);
        } else if (user.isAnonymous) {
          // Anonymous login but no viewer query parameter -> show Login screen
          setIsLoggedIn(false);
          setUserRole('external');
          setUserId(null);
        } else {
          // Logged in manager mode (Google or Email/Password authenticated)
          setUserRole('admin');
          setIsLoggedIn(true);
          setUserId(user.uid);

          // Register user login profile
          try {
            await registerUserLogin(user);
          } catch (regError) {
            console.error("Failed to register login profile", regError);
          }

          // Run legacy tasks migration first!
          try {
            await migrateLegacyTasksToUser(user.uid, user.email);
          } catch (migrationError) {
            console.error("Migration failed", migrationError);
          }

          // Seed default settings and tasks for the user if they don't exist
          try {
            const userSettings = await getGlobalSettings(user.uid);
            if (!userSettings) {
              const defaultSettings = {
                workTypes: ['אריזה', 'מדבקה', 'קטלוג', 'לוגו', 'תיקון קובץ', 'קובץ להדפסה', 'אחר'],
                statuses: ['חדש', 'בטיפול', 'נשלח לספק', 'אושר לספק', 'ארכיון'],
                defaultStatus: 'חדש',
                statusColors: {
                  'חדש': 'badge-new',
                  'בטיפול': 'badge-in-progress',
                  'נשלח לספק': 'badge-waiting-approval',
                  'אושר לספק': 'badge-approved',
                  'ארכיון': 'badge-archive'
                }
              };
              await saveGlobalSettings(defaultSettings, user.uid, { skipActivityLog: true });

              // Seed default suppliers
              const defaultSuppliers = [
                { name: 'Shenzhen Printing Ltd', email: 'li@shenzhenprint.com', phone: '+86 138 0000 0000', address: 'Shenzhen, China', wechat: 'wxid_szprint', notes: 'ספק דפוס ראשי בסין', contactPerson: 'Mr. Li' },
                { name: 'אריזות ישראל', email: 'sales@israelpack.co.il', phone: '03-5551234', address: 'אזור התעשייה חולון', wechat: '', notes: 'ספק אריזות קרטון בארץ', contactPerson: 'משה כהן' },
                { name: 'מפעלי קרטון בע"מ', email: 'info@cartonfact.co.il', phone: '04-8884321', address: 'אזור התעשייה מפרץ חיפה', wechat: '', notes: 'ייצור קופסאות קרטון מותאמות אישית', contactPerson: '' }
              ];
              for (const sup of defaultSuppliers) {
                await addSupplier(sup, user.uid, { skipActivityLog: true });
              }

              // Seed default contacts
              const defaultContacts = [
                { name: 'Mr. Li', role: 'איש קשר מכירות סין', phone: '+86 138 0000 0000', email: 'li@shenzhenprint.com', address: 'Shenzhen, China', wechat: 'wxid_szprint', notes: 'עובד מול Shenzhen Printing' },
                { name: 'משה כהן', role: 'מנהל ייצור ישראל', phone: '052-1234567', email: 'moshe@israelpack.co.il', address: 'חולון', wechat: '', notes: 'מנהל ייצור באריזות ישראל' }
              ];
              for (const cont of defaultContacts) {
                await addContact(cont, user.uid, { skipActivityLog: true });
              }
            } else {
              // Run migration for existing users
              await migrateSuppliersAndContacts(user.uid);
            }
            // Ensure default suppliers and contacts exist for existing users whose collections are empty
            await ensureDefaultSuppliersAndContacts(user.uid);
            await seedUserDatabaseIfEmpty(user.uid);
          } catch (seedingError) {
            console.error("Seeding failed for user", user.uid, seedingError);
          }
        }
        setInitializing(false);
      } else {
        // Not authenticated
        if (isViewer && targetUserId) {
          try {
            await signInAnonymously(auth);
          } catch (err) {
            console.error("Anonymous authentication failed", err);
            setError("שגיאה בחיבור ל-Firebase. אנא נסו שנית.");
            setInitializing(false);
          }
        } else {
          setIsLoggedIn(false);
          setUserId(null);
          setInitializing(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const effectiveUserId = impersonatedUserId || userId;
    if (!effectiveUserId) return;

    let unsubscribeSettings = () => {};
    // Listen to settings in real time from Firestore
    const settingsDocRef = doc(db, 'settings', effectiveUserId);
    unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
      const defaultStatuses = ['חדש', 'בטיפול', 'נשלח לספק', 'אושר לספק', 'ארכיון'];
      const defaultStatusColors = {
        'חדש': 'badge-new',
        'בטיפול': 'badge-in-progress',
        'נשלח לספק': 'badge-waiting-approval',
        'אושר לספק': 'badge-approved',
        'ארכיון': 'badge-archive'
      };
      if (docSnap.exists()) {
        const dbSettings = docSnap.data();
        setSettings(prev => ({
          ...prev,
          ...dbSettings,
          statuses: dbSettings.statuses || defaultStatuses,
          statusColors: dbSettings.statusColors || defaultStatusColors,
          defaultStatus: dbSettings.defaultStatus || 'חדש'
        }));
      } else {
        setSettings(prev => ({
          ...prev,
          statuses: defaultStatuses,
          statusColors: defaultStatusColors,
          defaultStatus: 'חדש'
        }));
      }
    }, (err) => {
      console.error("Settings real-time listener error:", err);
    });

    // Listen to suppliers real-time from Firestore
    let unsubscribeSuppliers = () => {};
    const suppliersQuery = query(collection(db, 'suppliers'), where('userId', '==', effectiveUserId));
    unsubscribeSuppliers = onSnapshot(suppliersQuery, (snapshot) => {
      const sups = [];
      snapshot.forEach(docSnap => {
        sups.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort alphabetically by name
      sups.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      setSuppliers(sups);
    }, (err) => {
      console.error("Suppliers real-time listener error:", err);
    });

    // Listen to contacts real-time from Firestore
    let unsubscribeContacts = () => {};
    const contactsQuery = query(collection(db, 'contacts'), where('userId', '==', effectiveUserId));
    unsubscribeContacts = onSnapshot(contactsQuery, (snapshot) => {
      const conts = [];
      snapshot.forEach(docSnap => {
        conts.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort alphabetically by name
      conts.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      setContacts(conts);
    }, (err) => {
      console.error("Contacts real-time listener error:", err);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeSuppliers();
      unsubscribeContacts();
    };
  }, [userId, impersonatedUserId]);

  const handleRoleChange = (newRole) => {
    setUserRole(newRole);
    setCurrentView('dashboard'); // reset view when changing roles
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setUserId(null);
      setImpersonatedUserId(null);
      setImpersonatedUserEmail('');
    } catch (e) {
      console.error("Sign out failed", e);
    }
  };

  const handleImpersonate = (targetUid, targetEmail) => {
    setImpersonatedUserId(targetUid);
    setImpersonatedUserEmail(targetEmail);
    setCurrentView('dashboard'); // Go back to dashboard to view their board
  };

  const handleStopImpersonation = () => {
    setImpersonatedUserId(null);
    setImpersonatedUserEmail('');
  };

  const effectiveUserId = impersonatedUserId || userId;
  const isSystemAdmin = auth.currentUser?.email === 'shaharsolutions@gmail.com';

  const handleSaveSettings = async (newSettings) => {
    if (!effectiveUserId) return;
    await saveGlobalSettings(newSettings, effectiveUserId);
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
    return <Login />;
  }

  return (
    <div className="app-container">
      {impersonatedUserId && (
        <div style={{
          backgroundColor: '#e0e7ff',
          color: '#3730a3',
          padding: '10px 20px',
          fontWeight: '600',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          borderBottom: '1px solid #c7d2fe',
          fontFamily: 'Rubik, sans-serif',
          direction: 'rtl'
        }}>
          <span>👁️ הנכם מחוברים בהתחזות עבור: <strong>{impersonatedUserEmail}</strong> (כל הפעולות יבוצעו בשמו)</span>
          <button
            onClick={handleStopImpersonation}
            style={{
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontFamily: 'inherit'
            }}
          >
            ❌ ביטול התחזות וחזרה לחשבוני
          </button>
        </div>
      )}
      <Header
        userRole={userRole}
        onChangeRole={handleRoleChange}
        showSwitcher={!isSharedLink && auth.currentUser && !auth.currentUser.isAnonymous}
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
        userId={effectiveUserId}
        userEmail={auth.currentUser?.email}
      />
      {userRole === 'admin' ? (
        currentView === 'users' ? (
          <UsersManagement
            onImpersonate={handleImpersonate}
            onBack={() => setCurrentView('dashboard')}
          />
        ) : currentView === 'settings' ? (
          <SettingsPage
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onBack={() => setCurrentView('dashboard')}
          />
        ) : currentView === 'suppliers_contacts' ? (
          <SuppliersContactsPage
            suppliers={suppliers}
            contacts={contacts}
            userId={effectiveUserId}
            onBack={() => setCurrentView('dashboard')}
          />
        ) : currentView === 'activity_log' ? (
          <ActivityLogPage
            currentUserId={userId}
            currentUserEmail={auth.currentUser?.email || ''}
            isSystemAdmin={isSystemAdmin}
            onBack={() => setCurrentView('dashboard')}
          />
        ) : (
          <AdminDashboard
            settings={settings}
            suppliers={suppliers}
            contacts={contacts}
            onSaveSettings={handleSaveSettings}
            userId={effectiveUserId}
          />
        )
      ) : (
        <ExternalDashboard settings={settings} userId={effectiveUserId} />
      )}
    </div>
  );
}
