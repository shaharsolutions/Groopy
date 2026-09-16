import { useState, useEffect, Suspense, lazy } from 'react';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Header from './components/Header';
import { DEFAULT_NEW_TASK_FIELDS } from './data/taskFieldConfig';
import { getFeatureFlags, DEFAULT_APP_VERSION, APP_VERSIONS } from './utils/featureFlags';
import { isSystemAdminEmail } from './utils/storage';
import { getShvaErrorMessage, recordPaymentAndReactivateOrg } from './utils/paymentConfig';

// Lazy loading pages for better initial load performance
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ExternalDashboard = lazy(() => import('./pages/ExternalDashboard'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ViewerSettingsPage = lazy(() => import('./pages/ViewerSettingsPage'));
const SuppliersContactsPage = lazy(() => import('./pages/SuppliersContactsPage'));
const UsersManagement = lazy(() => import('./pages/UsersManagement'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'));
const SearchModal = lazy(() => import('./components/SearchModal'));
const Login = lazy(() => import('./pages/Login'));
const OrganizationSuspendedView = lazy(() => import('./pages/OrganizationSuspendedView'));

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
  const [isOrgSuspended, setIsOrgSuspended] = useState(false);
  const [suspendedOrgInfo, setSuspendedOrgInfo] = useState(null);

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

  // Handle Tranzila payment return callback (from iframe redirect or full tab redirect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hasPaymentParam = params.has('payment_status') || params.has('Response') || params.has('response');
    if (!hasPaymentParam) return;

    const paymentStatus = params.get('payment_status');
    const responseCode = params.get('Response') || params.get('response') || params.get('res') || '';

    // Crucial: Tranzila redirects to success_url_address ONLY when the payment succeeded!
    // Even if Tranzila sends the parameters via POST or doesn't append Response=000 to the query string,
    // landing on payment_status === 'success' means the transaction was approved.
    const isSuccess = paymentStatus === 'success' || responseCode === '000';

    const confirmationCode =
      params.get('ConfirmationCode') ||
      params.get('confirmation_code') ||
      params.get('approval') ||
      params.get('Approval') ||
      params.get('auth_number') ||
      params.get('AuthNum') ||
      params.get('Index') ||
      params.get('index') ||
      params.get('transaction_id') ||
      params.get('tran_id') ||
      params.get('tempref') ||
      params.get('TranzilaTK') ||
      `AUTH-${Date.now()}`;

    const orgIdParam = params.get('orgId') || params.get('u_org_id');
    const sumParam = params.get('sum');

    // Case 1: Loaded inside iframe (in PaymentModal)
    if (window.self !== window.top) {
      if (isSuccess) {
        try {
          window.parent.postMessage({
            type: 'TRANZILA_SUCCESS',
            Response: '000',
            ConfirmationCode: confirmationCode,
            orgId: orgIdParam,
            sum: sumParam
          }, '*');
        } catch (postErr) {
          console.error('Failed to postMessage to parent window:', postErr);
        }
      } else {
        try {
          window.parent.postMessage({
            type: 'TRANZILA_FAIL',
            Response: responseCode || '004',
            message: getShvaErrorMessage(responseCode)
          }, '*');
        } catch (postErr) {
          console.error('Failed to postMessage failure to parent window:', postErr);
        }
      }
      return;
    }

    // Case 2: Loaded in top window (user completed payment in a separate tab or full window)
    if (isSuccess && orgIdParam) {
      const processTopRedirect = async () => {
        try {
          await recordPaymentAndReactivateOrg({
            organizationId: orgIdParam,
            amount: Number(sumParam) || 0,
            confirmationCode,
            transactionId: `TRZ-${confirmationCode}`,
            method: 'tranzila_recurring'
          });
        } catch (err) {
          console.error('Failed to reactivate org from redirect:', err);
        } finally {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      };
      processTopRedirect();
    }
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
    taskFieldOrder: [],
    hideWeeklyHours: false,
    autoArchiveInactiveDays: 45,
    boards: [],
    boardOrder: [],
    appVersion: DEFAULT_APP_VERSION
  });

  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const shortCode = (pathParts[0] === 'v' && pathParts[1]) ? pathParts[1] : new URLSearchParams(window.location.search).get('v');
  const isSharedLink = Boolean(shortCode) || new URLSearchParams(window.location.search).get('mode') === 'viewer';

  const effectiveUserId = impersonatedUserId || userId;
  const effectiveUserEmail = impersonatedUserEmail || auth.currentUser?.email || '';
  const effectiveOrganizationId = impersonatedOrganizationId || organizationId;
  const effectiveOrganizationName = impersonatedOrganizationName || organizationName;
  const isSystemAdmin = isSystemAdminEmail(auth.currentUser?.email);
  const effectiveIsSystemAdmin = impersonatedUserId ? isSystemAdminEmail(effectiveUserEmail) : isSystemAdmin;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('userId') || params.get('ownerId');
    const targetOrganizationId = params.get('organizationId') || '';
    const viewerToken = params.get('shareToken');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (isSharedLink) {
          // Shared link viewer mode
          try {
            const { authorizeViewerSession, resolveShortShareLink, setActiveOrganizationContext } = await import('./utils/storage');
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
            setActiveOrganizationContext(resolvedOrganizationId);
            setUserRole('external');
            setIsLoggedIn(true);
            setUserId(resolvedUserId);
            setOrganizationId(resolvedOrganizationId);
            setInitializing(false);
          } catch (viewerError) {
            console.error('Viewer authorization failed', viewerError);
            setError('קישור השיתוף אינו תקין. יש לבקש קישור חדש ממנהל/ת הארגון.');
            setInitializing(false);
          }
        } else if (user.isAnonymous) {
          // Anonymous login but no viewer query parameter -> show Login screen
          setIsLoggedIn(false);
          setUserRole('external');
          setUserId(null);
          setInitializing(false);
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
          let resolvedOrgId = '';
          let userOrg = null;
          const isSysAdmin = isSystemAdminEmail(user.email);
          try {
            const profile = await storageApi.registerUserLogin(user);
            resolvedOrgId = profile?.organizationId || '';
            storageApi.setActiveOrganizationContext(resolvedOrgId);
            setOrganizationId(resolvedOrgId);

            if (resolvedOrgId) {
              userOrg = await storageApi.getUserOrganization(user.uid);
              if (userOrg?.name) setOrganizationName(userOrg.name);
            } else if (isSysAdmin) {
              setCurrentView('users');
            }
          } catch (regError) {
            console.error("Failed to register login profile or check organization", regError);
          }

          if (!isSysAdmin && userOrg && userOrg.active === false) {
            let contactMethod = userOrg.suspendedContactMethod;
            if (!contactMethod || contactMethod === 'default') {
              try {
                contactMethod = await storageApi.getSystemSuspendedContactMethod();
              } catch {
                contactMethod = storageApi.DEFAULT_SUSPENDED_CONTACT_METHOD;
              }
            }
            setIsOrgSuspended(true);
            setSuspendedOrgInfo({
              ...userOrg,
              id: userOrg.id || resolvedOrgId,
              name: userOrg.name || resolvedOrgId,
              suspendedContactMethod: contactMethod
            });
            setInitializing(false);
            return;
          }

          setIsOrgSuspended(false);
          setSuspendedOrgInfo(null);

          // Unblock main UI immediately for instant startup!
          setInitializing(false);

          // Run background migrations & organization setup asynchronously without blocking UI
          (async () => {
            try {
              if (resolvedOrgId) {
                if (userOrg?.name) {
                  setOrganizationName(userOrg.name);
                } else {
                  const organization = await storageApi.getUserOrganization(user.uid);
                  if (organization?.name) setOrganizationName(organization.name);
                }
                await storageApi.migrateUserDataToOrganization(user.uid, resolvedOrgId);
              }
              await storageApi.migrateLegacyTasksToUser(user.uid, user.email);

              const userSettings = await storageApi.getGlobalSettings(resolvedOrgId);
              if (!userSettings && isSystemAdminEmail(user.email)) {
                const defaultSettings = {
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
    if (!userId) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const { touchUserActivity } = await import('./utils/storage');
        await touchUserActivity(auth.currentUser);
      } catch (err) {
        // silent background heartbeat
      }
    }, 2 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId]);

  // Real-time listener for organization active/suspended status
  useEffect(() => {
    if (!userId || isSystemAdmin || !organizationId) {
      return;
    }

    let unsubscribeOrg = () => {};
    let cancelled = false;

    (async () => {
      try {
        const [{ doc, onSnapshot }, { db }] = await Promise.all([
          import('firebase/firestore'),
          import('./firebaseDb')
        ]);
        if (cancelled) return;

        const orgDocRef = doc(db, 'organizations', organizationId);
        unsubscribeOrg = onSnapshot(orgDocRef, async (snap) => {
          if (cancelled) return;
          if (snap.exists()) {
            const orgData = snap.data();
            const isActive = orgData.active !== false;
            if (!isActive) {
              let contactMethod = orgData.suspendedContactMethod;
              if (!contactMethod || contactMethod === 'default') {
                try {
                  contactMethod = await storageApi.getSystemSuspendedContactMethod();
                } catch {
                  contactMethod = storageApi.DEFAULT_SUSPENDED_CONTACT_METHOD;
                }
              }
              setIsOrgSuspended(true);
              setSuspendedOrgInfo({
                ...orgData,
                id: organizationId,
                name: orgData.name || organizationName || organizationId,
                suspendedContactMethod: contactMethod
              });
            } else {
              setIsOrgSuspended(false);
              setSuspendedOrgInfo(null);
            }
          }
        }, (listenerErr) => {
          console.warn('Organization active real-time listener warning:', listenerErr);
        });
      } catch (err) {
        console.warn('Failed to attach organization active listener:', err);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeOrg();
    };
  }, [userId, organizationId, organizationName, isSystemAdmin]);

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
        let sanitizedBoards = Array.isArray(dbSettings.boards) ? dbSettings.boards : [];
        let sanitizedBoardOrder = Array.isArray(dbSettings.boardOrder) ? dbSettings.boardOrder : [];

        const hasTestBoard = sanitizedBoards.some(b => b && b.name && b.name.trim() === 'בדיקה');
        if (hasTestBoard) {
          const testBoardIds = new Set(sanitizedBoards.filter(b => b && b.name && b.name.trim() === 'בדיקה').map(b => b.id));
          sanitizedBoards = sanitizedBoards.filter(b => !testBoardIds.has(b.id));
          sanitizedBoardOrder = sanitizedBoardOrder.filter(id => !testBoardIds.has(id));
          import('./utils/storage').then(({ saveGlobalSettings }) => {
            saveGlobalSettings({
              ...dbSettings,
              boards: sanitizedBoards,
              boardOrder: sanitizedBoardOrder
            }, effectiveOrganizationId, { skipActivityLog: true }).catch(err => {
              console.warn('Could not auto-purge test board from settings', err);
            });
          });
        }

        setSettings(prev => ({
          ...prev,
          ...dbSettings,
          organizationId: effectiveOrganizationId,
          appVersion: dbSettings.appVersion || DEFAULT_APP_VERSION,
          statuses: dbSettings.statuses || defaultStatuses,
          statusColors: dbSettings.statusColors || defaultStatusColors,
          defaultStatus: dbSettings.defaultStatus || 'חדש',
          boards: sanitizedBoards,
          boardOrder: sanitizedBoardOrder,
          autoArchiveInactiveDays: Number.isFinite(Number(dbSettings.autoArchiveInactiveDays))
            ? Number(dbSettings.autoArchiveInactiveDays)
            : 45
        }));
      } else {
        setSettings(prev => ({
          ...prev,
          organizationId: effectiveOrganizationId,
          appVersion: DEFAULT_APP_VERSION,
          statuses: defaultStatuses,
          statusColors: defaultStatusColors,
          defaultStatus: 'חדש',
          hideWeeklyHours: false,
          autoArchiveInactiveDays: 45,
          boards: [],
          boardOrder: []
        }));
      }
    }, (err) => {
      console.error("Settings real-time listener error:", err);
    });

      // Listen to suppliers real-time from Firestore
      const suppliersQuery = effectiveOrganizationId
        ? query(collection(db, 'suppliers'), where('organizationId', '==', effectiveOrganizationId))
        : query(collection(db, 'suppliers'), where('userId', '==', effectiveUserId));
      unsubscribeSuppliers = onSnapshot(suppliersQuery, (snapshot) => {
        const sups = [];
        snapshot.forEach(docSnap => {
          sups.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort alphabetically by name
        sups.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
        setSuppliers(sups);
      }, (err) => {
        console.error("Suppliers real-time listener error:", err);
      });

      // Listen to contacts real-time from Firestore
      const contactsQuery = effectiveOrganizationId
        ? query(collection(db, 'contacts'), where('organizationId', '==', effectiveOrganizationId))
        : query(collection(db, 'contacts'), where('userId', '==', effectiveUserId));
      unsubscribeContacts = onSnapshot(contactsQuery, (snapshot) => {
        const conts = [];
        snapshot.forEach(docSnap => {
          conts.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort alphabetically by name
        conts.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
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
      setIsOrgSuspended(false);
      setSuspendedOrgInfo(null);
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

  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isPaymentCallback = Boolean(searchParams?.has('payment_status') || searchParams?.has('Response') || searchParams?.has('response'));

  if (isInsideIframe && isPaymentCallback) {
    const paymentStatus = searchParams?.get('payment_status');
    const rawResponse = searchParams?.get('Response') || searchParams?.get('response') || '';
    const isApproved = paymentStatus === 'success' || rawResponse === '000';
    const detailMessage = isApproved
      ? 'התשלום נקלט בהצלחה! משחרר את החסימה ומעדכן את המערכת...'
      : getShvaErrorMessage(rawResponse);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#ffffff',
        fontFamily: 'Rubik, sans-serif',
        direction: 'rtl',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: isApproved ? '#dcfce7' : '#fee2e2',
          color: isApproved ? '#16a34a' : '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          marginBottom: '12px'
        }}>
          {isApproved ? '✓' : '✕'}
        </div>
        <h3 style={{ margin: 0, fontSize: '1.25rem', color: isApproved ? '#14532d' : '#991b1b', fontWeight: '800' }}>
          {isApproved ? 'התשלום אושר בהצלחה!' : 'העסקה לא אושרה על ידי חברת האשראי'}
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '10px', maxWidth: '400px', lineHeight: '1.5' }}>
          {detailMessage}
        </p>
        {!isApproved && (
          <button
            type="button"
            onClick={() => {
              try {
                window.parent.postMessage({ type: 'TRANZILA_RETRY' }, '*');
              } catch (e) {
                console.error('Error sending TRANZILA_RETRY:', e);
              }
            }}
            style={{
              marginTop: '18px',
              padding: '10px 22px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'Rubik, sans-serif',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
            }}
          >
            <span>🔄</span> נסו שוב עם כרטיס אחר
          </button>
        )}
      </div>
    );
  }

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

  if (isOrgSuspended && !effectiveIsSystemAdmin) {
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
          טוען נתונים...
        </div>
      }>
        <OrganizationSuspendedView
          user={auth.currentUser}
          organization={suspendedOrgInfo || { id: effectiveOrganizationId, name: effectiveOrganizationName }}
          onLogout={handleLogout}
          onReactivated={() => {
            setIsOrgSuspended(false);
            setSuspendedOrgInfo(null);
          }}
        />
      </Suspense>
    );
  }

  if (!effectiveIsSystemAdmin && !effectiveOrganizationId) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Rubik, sans-serif',
        padding: '24px',
        direction: 'rtl',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '36px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏢</div>
          <h2 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '12px' }}>החשבון ממתין לשיוך לארגון</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
            שלום <strong>{auth.currentUser?.displayName || auth.currentUser?.email}</strong>,<br />
            החשבון שלך נוצר בהצלחה אך טרם שויך לארגון פעיל במערכת.<br />
            אנא פנה/י למנהל המערכת על מנת שישייך אותך לארגון המתאים.
          </p>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '10px', fontWeight: '600' }}
          >
            🚪 התנתקות
          </button>
        </div>
      </div>
    );
  }

  const flags = getFeatureFlags(settings);

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
              ? <>⚙️ עריכת {flags.terms.workSettings} של ארגון <strong>{effectiveOrganizationName}</strong></>
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
        userEmail={effectiveUserEmail}
        isSystemAdmin={isSystemAdmin}
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
              organizationId={effectiveOrganizationId}
              onSaveSettings={handleSaveSettings}
              userId={effectiveUserId}
              userEmail={effectiveUserEmail}
              isSystemAdmin={effectiveIsSystemAdmin}
              contacts={contacts}
              suppliers={suppliers}
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
              organizationId={effectiveOrganizationId}
              onSaveSettings={handleSaveSettings}
              onBack={() => setCurrentView('dashboard')}
              autoOpenSupplierId={autoOpenSupplierId}
              autoOpenContactId={autoOpenContactId}
              settings={settings}
              onClearAutoOpen={() => {
                setAutoOpenSupplierId(null);
                setAutoOpenContactId(null);
              }}
            />
          ) : currentView === 'activity_log' ? (
            <ActivityLogPage
              currentUserId={userId}
              organizationId={effectiveOrganizationId}
              currentUserEmail={effectiveUserEmail}
              isSystemAdmin={effectiveIsSystemAdmin}
              onBack={() => setCurrentView('dashboard')}
              initialSearchQuery={searchQueryForActivity}
              onClearSearchQuery={() => setSearchQueryForActivity(null)}
              settings={settings}
            />
          ) : (
            <AdminDashboard
              key={`${effectiveUserId}_${effectiveOrganizationId}`}
              settings={settings}
              suppliers={suppliers}
              contacts={contacts}
              onSaveSettings={handleSaveSettings}
              userId={effectiveUserId}
              organizationId={effectiveOrganizationId}
              userEmail={effectiveUserEmail}
              isSystemAdmin={effectiveIsSystemAdmin}
              autoOpenTaskId={autoOpenTaskId}
              onClearAutoOpen={() => setAutoOpenTaskId(null)}
            />
          )
        ) : currentView === 'settings' ? (
          <ViewerSettingsPage
            settings={settings}
            organizationName={effectiveOrganizationName}
            onBack={() => setCurrentView('dashboard')}
          />
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
            organizationId={effectiveOrganizationId}
            userRole={userRole}
            userEmail={effectiveUserEmail}
            isSystemAdmin={effectiveIsSystemAdmin}
            onNavigate={handleSearchNavigate}
            settings={settings}
          />
        </Suspense>
      )}
    </div>
  );
}
