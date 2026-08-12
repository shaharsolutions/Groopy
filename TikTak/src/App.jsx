import { useState, useEffect, Suspense, lazy } from 'react';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Header from './components/Header';
import { DEFAULT_NEW_TASK_FIELDS } from './data/taskFieldConfig';

// Lazy loading pages for better initial load performance
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ExternalDashboard = lazy(() => import('./pages/ExternalDashboard'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SuppliersContactsPage = lazy(() => import('./pages/SuppliersContactsPage'));
const UsersManagement = lazy(() => import('./pages/UsersManagement'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'));
const SearchModal = lazy(() => import('./components/SearchModal'));
const Login = lazy(() => import('./pages/Login'));

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
  const [organizationId, setOrganizationId] = useState(null);
  const [organizationName, setOrganizationName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Global search states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [autoOpenTaskId, setAutoOpenTaskId] = useState(null);
  const [autoOpenSupplierId, setAutoOpenSupplierId] = useState(null);
  const [autoOpenContactId, setAutoOpenContactId] = useState(null);
  const [searchQueryForActivity, setSearchQueryForActivity] = useState(null);

  // Shortcut key listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchNavigate = (view, params) => {
    setCurrentView(view);
    if (params.autoOpenTaskId) {
      setAutoOpenTaskId(params.autoOpenTaskId);
    }
    if (params.autoOpenSupplierId) {
      setAutoOpenSupplierId(params.autoOpenSupplierId);
    }
    if (params.autoOpenContactId) {
      setAutoOpenContactId(params.autoOpenContactId);
    }
    if (params.initialSearchQuery) {
      setSearchQueryForActivity(params.initialSearchQuery);
    }
    setIsSearchOpen(false);
  };

  // Impersonation states for admin
  const [impersonatedUserId, setImpersonatedUserId] = useState(null);
  const [impersonatedUserEmail, setImpersonatedUserEmail] = useState('');
  const [impersonatedOrganizationId, setImpersonatedOrganizationId] = useState(null);
  const [impersonatedOrganizationName, setImpersonatedOrganizationName] = useState('');
  const [organizationManagementMode, setOrganizationManagementMode] = useState(false);

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
    },
    newTaskFields: DEFAULT_NEW_TASK_FIELDS,
    hideWeeklyHours: false,
    autoArchiveInactiveDays: 45
  });

  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const shortCode = (pathParts[0] === 'v' && pathParts[1]) ? pathParts[1] : new URLSearchParams(window.location.search).get('v');
  const isSharedLink = Boolean(shortCode) || new URLSearchParams(window.location.search).get('mode') === 'viewer';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('userId') || params.get('ownerId');
    const targetOrganizationId = params.get('organizationId') || 'groopy';
    const viewerToken = params.get('shareToken');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (isSharedLink) {
          // Shared link viewer mode
          try {
            const { authorizeViewerSession, resolveShortShareLink } = await import('./utils/storage');
            let resolvedUserId = targetUserId;
            let resolvedOrganizationId = targetOrganizationId;
            let resolvedToken = viewerToken;

            if (shortCode) {
              const linkData = await resolveShortShareLink(shortCode);
              if (linkData) {
                resolvedUserId = linkData.userId;
                resolvedOrganizationId = linkData.organizationId;
                resolvedToken = linkData.shareToken;
              } else {
                throw new Error('קישור שיתוף קצר לא נמצא');
              }
            }

            if (!resolvedUserId || !resolvedOrganizationId || !resolvedToken) {
              throw new Error('פרטי קישור שיתוף חסרים');
            }

            await authorizeViewerSession(resolvedOrganizationId, resolvedToken, resolvedUserId);
            setUserRole('external');
            setIsLoggedIn(true);
            setUserId(resolvedUserId);
            setOrganizationId(resolvedOrganizationId);
          } catch (viewerError) {
            console.error('Viewer authorization failed', viewerError);
            setError('קישור השיתוף אינו תקין. יש לבקש קישור חדש ממנהל/ת הארגון.');
          }
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

          let storageApi;
          try {
            storageApi = await import('./utils/storage');
          } catch (storageImportError) {
            console.error("Failed to load storage utilities", storageImportError);
            setError("שגיאה בטעינת נתוני המערכת. אנא נסו שנית.");
            setInitializing(false);
            return;
          }

          // Register user login profile and set organization context
          let resolvedOrgId = storageApi.DEFAULT_ORGANIZATION_ID;
          try {
            const profile = await storageApi.registerUserLogin(user);
            resolvedOrgId = profile?.organizationId || storageApi.DEFAULT_ORGANIZATION_ID;
            storageApi.setActiveOrganizationContext(resolvedOrgId);
            setOrganizationId(resolvedOrgId);
          } catch (regError) {
            console.error("Failed to register login profile", regError);
          }

          // Unblock main UI immediately for instant startup!
          setInitializing(false);

          // Run background migrations & organization setup asynchronously without blocking UI
          (async () => {
            try {
              const organization = await storageApi.getUserOrganization(user.uid);
              if (organization?.name) setOrganizationName(organization.name);
              await storageApi.migrateUserDataToOrganization(user.uid, resolvedOrgId);
              if (user.email === 'shaharsolutions@gmail.com') {
                await storageApi.assignExistingUsersToDefaultOrganization();
              }
              await storageApi.migrateLegacyTasksToUser(user.uid, user.email);

              const userSettings = await storageApi.getGlobalSettings(resolvedOrgId);
              if (!userSettings && user.email === 'shaharsolutions@gmail.com') {
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
                  },
                  newTaskFields: DEFAULT_NEW_TASK_FIELDS,
                  hideWeeklyHours: false,
                  autoArchiveInactiveDays: 45
                };
                await storageApi.saveGlobalSettings(defaultSettings, resolvedOrgId, { skipActivityLog: true });
              }
              await storageApi.removeDefaultSuppliersAndContacts(user.uid);
              await storageApi.seedUserDatabaseIfEmpty(user.uid);
            } catch (bgError) {
              console.error("Background initialization error", bgError);
            }
          })();
          return;
        }
      } else {
        // Not authenticated
        if (isSharedLink) {
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
    const effectiveOrganizationId = impersonatedOrganizationId || organizationId;
    if (!effectiveUserId || !effectiveOrganizationId) return;

    let unsubscribeSettings = () => {};
    let unsubscribeSuppliers = () => {};
    let unsubscribeContacts = () => {};
    let cancelled = false;

    const attachDirectoryListeners = async () => {
      const [{ doc, onSnapshot, collection, query, where }, { db }] = await Promise.all([
        import('firebase/firestore'),
        import('./firebaseDb')
      ]);
      if (cancelled) return;

      // Listen to settings in real time from Firestore
      const settingsDocRef = doc(db, 'settings', effectiveOrganizationId);
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
          defaultStatus: dbSettings.defaultStatus || 'חדש',
          autoArchiveInactiveDays: Number.isFinite(Number(dbSettings.autoArchiveInactiveDays))
            ? Number(dbSettings.autoArchiveInactiveDays)
            : 45
        }));
      } else {
        setSettings(prev => ({
          ...prev,
          statuses: defaultStatuses,
          statusColors: defaultStatusColors,
          defaultStatus: 'חדש',
          hideWeeklyHours: false,
          autoArchiveInactiveDays: 45
        }));
      }
    }, (err) => {
      console.error("Settings real-time listener error:", err);
    });

      // Listen to suppliers real-time from Firestore
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
    };

    attachDirectoryListeners().catch((err) => {
      console.error("Failed to attach directory listeners:", err);
    });

    return () => {
      cancelled = true;
      unsubscribeSettings();
      unsubscribeSuppliers();
      unsubscribeContacts();
    };
  }, [userId, impersonatedUserId, organizationId, impersonatedOrganizationId]);

  const handleRoleChange = (newRole) => {
    setUserRole(newRole);
    setCurrentView('dashboard'); // reset view when changing roles
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setUserId(null);
      setOrganizationId(null);
      setOrganizationName('');
      setImpersonatedUserId(null);
      setImpersonatedUserEmail('');
      setImpersonatedOrganizationId(null);
      setImpersonatedOrganizationName('');
      setOrganizationManagementMode(false);
    } catch (e) {
      console.error("Sign out failed", e);
    }
  };

  const handleImpersonate = (targetUid, targetEmail, targetOrganizationId, targetOrganizationName = '') => {
    setImpersonatedUserId(targetUid);
    setImpersonatedUserEmail(targetEmail);
    setImpersonatedOrganizationId(targetOrganizationId);
    setImpersonatedOrganizationName(targetOrganizationName);
    setOrganizationManagementMode(false);
    setCurrentView('dashboard'); // Go back to dashboard to view their board
  };

  const handleStopImpersonation = () => {
    setImpersonatedUserId(null);
    setImpersonatedUserEmail('');
    setImpersonatedOrganizationId(null);
    setImpersonatedOrganizationName('');
    setOrganizationManagementMode(false);
  };

  const handleManageOrganizationSettings = (targetOrganizationId, targetOrganizationName) => {
    setImpersonatedUserId(null);
    setImpersonatedUserEmail('');
    setImpersonatedOrganizationId(targetOrganizationId);
    setImpersonatedOrganizationName(targetOrganizationName);
    setOrganizationManagementMode(true);
    setCurrentView('settings');
  };

  const effectiveUserId = impersonatedUserId || userId;
  const effectiveOrganizationId = impersonatedOrganizationId || organizationId;
  const effectiveOrganizationName = impersonatedOrganizationName || organizationName;
  const isSystemAdmin = auth.currentUser?.email === 'shaharsolutions@gmail.com';

  useEffect(() => {
    import('./utils/storage').then(({ setActiveOrganizationContext }) => {
      setActiveOrganizationContext(effectiveOrganizationId);
    });
  }, [effectiveOrganizationId]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!effectiveUserId || !currentUser || currentUser.isAnonymous) return;
    if (impersonatedOrganizationId && !isSystemAdmin) return;

    let cancelled = false;
    const cleanupDefaultDirectoryRecords = async () => {
      const { removeDefaultSuppliersAndContacts } = await import('./utils/storage');
      if (!cancelled) {
        removeDefaultSuppliersAndContacts(effectiveUserId);
      }
    };

    cleanupDefaultDirectoryRecords();

    return () => {
      cancelled = true;
    };
  }, [effectiveUserId, impersonatedOrganizationId, isSystemAdmin]);

  const handleSaveSettings = async (newSettings) => {
    if (!effectiveOrganizationId) return;
    const { saveGlobalSettings } = await import('./utils/storage');
    await saveGlobalSettings(newSettings, effectiveOrganizationId);
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
      <Suspense fallback={
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'Rubik, sans-serif',
          color: 'var(--text-muted)'
        }}>
          טוען דף התחברות...
        </div>
      }>
        <Login />
      </Suspense>
    );
  }

  return (
    <div className="app-container">
      {(impersonatedUserId || organizationManagementMode) && (
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
          <span>
            {organizationManagementMode
              ? <>⚙️ עריכת הגדרות העבודה של ארגון <strong>{effectiveOrganizationName}</strong></>
              : <>👁️ צפייה בארגון <strong>{effectiveOrganizationName}</strong> דרך המשתמש/ת {impersonatedUserEmail}</>}
          </span>
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
        organizationId={effectiveOrganizationId}
        userEmail={auth.currentUser?.email}
        onSearchTrigger={() => setIsSearchOpen(true)}
        onOpenTask={(taskId) => setAutoOpenTaskId(taskId)}
        settings={settings}
        organizationName={effectiveOrganizationName}
      />
      <Suspense fallback={
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          fontFamily: 'Rubik, sans-serif',
          color: 'var(--text-muted)'
        }}>
          טוען תוכן...
        </div>
      }>
        {userRole === 'admin' ? (
          currentView === 'users' ? (
            <UsersManagement
              onImpersonate={handleImpersonate}
              onManageOrganization={handleManageOrganizationSettings}
              onBack={() => setCurrentView('dashboard')}
              onNavigate={setCurrentView}
            />
          ) : currentView === 'settings' ? (
            <SettingsPage
              key={`${effectiveOrganizationId}:${JSON.stringify(settings)}`}
              settings={settings}
              organizationName={effectiveOrganizationName}
              onSaveSettings={handleSaveSettings}
              onBack={() => {
                if (organizationManagementMode) {
                  handleStopImpersonation();
                  setCurrentView('users');
                } else {
                  setCurrentView('dashboard');
                }
              }}
            />
          ) : currentView === 'suppliers_contacts' ? (
            <SuppliersContactsPage
              suppliers={suppliers}
              contacts={contacts}
              userId={effectiveUserId}
              onBack={() => setCurrentView('dashboard')}
              autoOpenSupplierId={autoOpenSupplierId}
              autoOpenContactId={autoOpenContactId}
              onClearAutoOpen={() => {
                setAutoOpenSupplierId(null);
                setAutoOpenContactId(null);
              }}
            />
          ) : currentView === 'activity_log' ? (
            <ActivityLogPage
              currentUserId={userId}
              organizationId={effectiveOrganizationId}
              currentUserEmail={auth.currentUser?.email || ''}
              isSystemAdmin={isSystemAdmin}
              onBack={() => setCurrentView('dashboard')}
              initialSearchQuery={searchQueryForActivity}
              onClearSearchQuery={() => setSearchQueryForActivity(null)}
            />
          ) : (
            <AdminDashboard
              settings={settings}
              suppliers={suppliers}
              contacts={contacts}
              onSaveSettings={handleSaveSettings}
              userId={effectiveUserId}
              organizationId={effectiveOrganizationId}
              autoOpenTaskId={autoOpenTaskId}
              onClearAutoOpen={() => setAutoOpenTaskId(null)}
            />
          )
        ) : (
          <ExternalDashboard 
            settings={settings} 
            userId={effectiveUserId} 
            organizationId={effectiveOrganizationId}
            autoOpenTaskId={autoOpenTaskId}
            onClearAutoOpen={() => setAutoOpenTaskId(null)}
          />
        )}
      </Suspense>
      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            userId={effectiveUserId}
            userRole={userRole}
            onNavigate={handleSearchNavigate}
          />
        </Suspense>
      )}
    </div>
  );
}
