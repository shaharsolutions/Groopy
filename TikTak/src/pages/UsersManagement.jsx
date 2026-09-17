import { useMemo, useState, useEffect } from 'react';
import { APP_VERSIONS, DEFAULT_APP_VERSION, getFeatureFlags } from '../utils/featureFlags';
import { isSystemAdminEmail } from '../utils/storage';
import PaymentModal from '../components/PaymentModal';
import {
  getPaymentConfig,
  savePaymentConfig,
  getPaymentRecords,
  clearAllPaymentRecords,
  buildTranzilaPaymentUrl,
  TRANZILA_DEFAULT_CONFIG
} from '../utils/paymentConfig';

let storageApiPromise = null;

const loadStorageApi = () => {
  storageApiPromise ??= import('../utils/storage');
  return storageApiPromise;
};

const adminActions = [
  {
    view: 'dashboard',
    icon: '📋',
    title: 'לוח המשימות',
    description: 'מעבר לניהול ומעקב המשימות הפעילות במערכת'
  },
  {
    view: 'settings',
    icon: '⚙️',
    title: 'הגדרות מערכת',
    description: 'ניהול סטטוסים, לוחות והעדפות מערכת'
  },
  {
    view: 'suppliers_contacts',
    icon: '👥',
    title: 'ספקים ואנשי קשר',
    description: 'ניהול ספר הספקים, אנשי הקשר ופרטי ההתקשרות'
  },
  {
    view: 'activity_log',
    icon: '🧾',
    title: 'יומן פעולות',
    description: 'מעקב אחר פעולות, עדכונים ושינויים שבוצעו במערכת'
  }
];

const getUserEffectiveActivityIso = (user, stats = {}) => {
  const timestamps = [
    user?.lastLogin,
    user?.lastActiveAt,
    stats?.lastActivityAt,
    stats?.lastProjectUpdatedAt
  ].map(dateStr => {
    const ts = Date.parse(dateStr || '');
    return Number.isFinite(ts) ? ts : 0;
  });
  const maxTs = Math.max(0, ...timestamps);
  return maxTs > 0 ? new Date(maxTs).toISOString() : (user?.lastLogin || '');
};

const getUserEffectiveJoinDate = (user, stats = {}) => {
  if (user?.joinDate) return user.joinDate;
  if (user?.createdAt) return user.createdAt;
  const directDate = user?.creationTime || user?.registeredAt || user?.joinedAt;
  if (directDate && Date.parse(directDate) > 0) return directDate;

  const candidates = [
    stats?.earliestTaskAt,
    stats?.firstActivityAt,
    user?.firstLogin,
    user?.lastLogin,
    user?.lastActiveAt,
    stats?.lastProjectUpdatedAt,
    stats?.lastActivityAt
  ].map(d => ({ ts: Date.parse(d || ''), d })).filter(item => item.ts > 0);

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.ts - b.ts);
    return candidates[0].d;
  }
  return '';
};

const USER_TABLE_COLUMNS = [
  { id: 'user', label: 'משתמש', required: true },
  { id: 'joinDate', label: 'תאריך הצטרפות' },
  { id: 'organization', label: 'ארגון' },
  { id: 'projectLoad', label: 'עומס פרויקטים' },
  { id: 'activity', label: 'פעילות ושימוש' },
  { id: 'actions', label: 'פעולות' }
];

const DEFAULT_USER_VISIBLE_COLUMNS = {
  user: true,
  joinDate: true,
  organization: true,
  projectLoad: true,
  activity: true,
  actions: true
};

export default function UsersManagement({ onImpersonate, onManageOrganization, onBack, onNavigate }) {
  const [users, setUsers] = useState([]);
  const [usageStats, setUsageStats] = useState({});
  const [organizations, setOrganizations] = useState([]);
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [savingOrganization, setSavingOrganization] = useState('');
  const [editingOrganizationId, setEditingOrganizationId] = useState('');
  const [editingOrganizationName, setEditingOrganizationName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastActive');
  const [relativeNow, setRelativeNow] = useState(0);
  const [systemContactMethod, setSystemContactMethod] = useState('whatsapp');
  const [savingSystemContactMethod, setSavingSystemContactMethod] = useState(false);
  const [contactMethodSuccessMessage, setContactMethodSuccessMessage] = useState('');

  // Payment Management States
  const [paymentConfig, setPaymentConfig] = useState(TRANZILA_DEFAULT_CONFIG);
  const [reopenPriceInput, setReopenPriceInput] = useState(TRANZILA_DEFAULT_CONFIG.defaultReopenPrice);
  const [savingReopenPrice, setSavingReopenPrice] = useState(false);
  const [reopenPriceSuccess, setReopenPriceSuccess] = useState('');
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [loadingPaymentRecords, setLoadingPaymentRecords] = useState(true);
  const [clearingPayments, setClearingPayments] = useState(false);
  const [showClearPaymentsModal, setShowClearPaymentsModal] = useState(false);
  const [clearPaymentsError, setClearPaymentsError] = useState('');
  const [paymentsPage, setPaymentsPage] = useState(1);
  const PAYMENTS_PER_PAGE = 10;

  const totalPaymentPages = Math.max(1, Math.ceil(paymentRecords.length / PAYMENTS_PER_PAGE));
  const paginatedPaymentRecords = useMemo(() => {
    const startIndex = (paymentsPage - 1) * PAYMENTS_PER_PAGE;
    return paymentRecords.slice(startIndex, startIndex + PAYMENTS_PER_PAGE);
  }, [paymentRecords, paymentsPage]);

  useEffect(() => {
    if (paymentsPage > totalPaymentPages) {
      setPaymentsPage(Math.max(1, totalPaymentPages));
    }
  }, [paymentRecords.length, totalPaymentPages, paymentsPage]);

  const [testPaymentOrg, setTestPaymentOrg] = useState(null);
  const [copiedPaymentOrgId, setCopiedPaymentOrgId] = useState('');
  const [editingPriceOrgId, setEditingPriceOrgId] = useState('');
  const [editingOrgPriceValue, setEditingOrgPriceValue] = useState('');

  const loadPayments = async () => {
    try {
      setLoadingPaymentRecords(true);
      const [config, records] = await Promise.all([
        getPaymentConfig(),
        getPaymentRecords(200)
      ]);
      if (config) {
        setPaymentConfig(config);
        setReopenPriceInput(config.reopenPrice);
      }
      if (records) {
        setPaymentRecords(records);
      }
    } catch (err) {
      console.warn('Failed to load payments data in UsersManagement:', err);
    } finally {
      setLoadingPaymentRecords(false);
    }
  };

  const handleOpenClearPaymentsModal = () => {
    if (paymentRecords.length === 0) return;
    setClearPaymentsError('');
    setShowClearPaymentsModal(true);
  };

  const handleCloseClearPaymentsModal = () => {
    if (clearingPayments) return;
    setShowClearPaymentsModal(false);
    setClearPaymentsError('');
  };

  const handleConfirmClearPayments = async () => {
    if (paymentRecords.length === 0) {
      setShowClearPaymentsModal(false);
      return;
    }

    try {
      setClearingPayments(true);
      setClearPaymentsError('');
      await clearAllPaymentRecords();
      setPaymentRecords([]);
      setPaymentsPage(1);
      setShowClearPaymentsModal(false);
    } catch (err) {
      console.error('Failed to clear payments:', err);
      setClearPaymentsError('שגיאה באיפוס יומן התשלומים: ' + (err.message || 'אנא נסה שוב'));
    } finally {
      setClearingPayments(false);
    }
  };

  useEffect(() => {
    if (!showClearPaymentsModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !clearingPayments) {
        setShowClearPaymentsModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showClearPaymentsModal, clearingPayments]);

  useEffect(() => {
    let isCancelled = false;
    const fetchInitialData = async () => {
      try {
        const [config, records] = await Promise.all([
          getPaymentConfig(),
          getPaymentRecords(200)
        ]);
        if (!isCancelled) {
          if (config) {
            setPaymentConfig(config);
            setReopenPriceInput(config.reopenPrice);
          }
          if (records) {
            setPaymentRecords(records);
          }
        }
      } catch (err) {
        console.warn('Failed to load payments data in UsersManagement:', err);
      } finally {
        if (!isCancelled) {
          setLoadingPaymentRecords(false);
        }
      }
    };
    fetchInitialData();
    return () => { isCancelled = true; };
  }, []);

  const handleSaveReopenPrice = async (e) => {
    if (e) e.preventDefault();
    const priceNum = Number(reopenPriceInput);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('אנא הזינו מחיר תקין במספרים (גדול מ-0)');
      return;
    }
    try {
      setSavingReopenPrice(true);
      setError('');
      await savePaymentConfig({ reopenPrice: priceNum });
      setPaymentConfig(prev => ({ ...prev, reopenPrice: priceNum }));
      setReopenPriceSuccess('מחיר המנוי החודשי עודכן בהצלחה!');
      setTimeout(() => setReopenPriceSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to save reopen price:', err);
      setError('שגיאה בשמירת מחיר מנוי חודשי');
    } finally {
      setSavingReopenPrice(false);
    }
  };

  const handleStartEditOrgPrice = (organization) => {
    setEditingPriceOrgId(organization.id);
    setEditingOrgPriceValue(organization.reopenPrice !== undefined && organization.reopenPrice !== null ? String(organization.reopenPrice) : '');
  };

  const handleSaveOrgPrice = async (organizationId) => {
    try {
      setSavingOrganization(`price:${organizationId}`);
      const { updateOrganization } = await loadStorageApi();
      const trimmed = String(editingOrgPriceValue || '').trim();
      const priceVal = (trimmed === '' || isNaN(Number(trimmed)) || Number(trimmed) <= 0) ? null : Number(trimmed);

      await updateOrganization(organizationId, { reopenPrice: priceVal });
      setOrganizations(current => current.map(item => (
        item.id === organizationId ? { ...item, reopenPrice: priceVal } : item
      )));
      setEditingPriceOrgId('');
      setEditingOrgPriceValue('');
      setActionNotice({
        type: 'success',
        message: priceVal
          ? `מחיר פתיחת הגישה לארגון עודכן ל-₪${priceVal}`
          : 'מחיר הארגון הוגדר לפי ברירת המחדל של המערכת'
      });
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error('Failed to update organization price', err);
      setError('עדכון מחיר הארגון נכשל.');
    } finally {
      setSavingOrganization('');
    }
  };

  const handleCopyPaymentLink = (org) => {
    try {
      const effectivePrice = (org.reopenPrice !== undefined && org.reopenPrice !== null && Number(org.reopenPrice) > 0)
        ? Number(org.reopenPrice)
        : paymentConfig.reopenPrice;
      const url = buildTranzilaPaymentUrl({
        sum: effectivePrice,
        orgId: org.id,
        orgName: org.name
      });
      navigator.clipboard.writeText(url);
      setCopiedPaymentOrgId(org.id);
      setTimeout(() => setCopiedPaymentOrgId(''), 2500);
    } catch (err) {
      console.error('Failed to copy payment link', err);
    }
  };

  const suspendedOrganizations = useMemo(() => {
    return organizations.filter(org => org.active === false);
  }, [organizations]);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('users_management_visible_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_USER_VISIBLE_COLUMNS, ...parsed, user: true };
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_USER_VISIBLE_COLUMNS;
  });
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  const toggleColumn = (columnId) => {
    if (columnId === 'user') return;
    setVisibleColumns(prev => {
      const next = { ...prev, [columnId]: !prev[columnId] };
      try {
        localStorage.setItem('users_management_visible_columns', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const showAllColumns = () => {
    setVisibleColumns(DEFAULT_USER_VISIBLE_COLUMNS);
    try {
      localStorage.setItem('users_management_visible_columns', JSON.stringify(DEFAULT_USER_VISIBLE_COLUMNS));
    } catch (e) {}
  };

  const visibleColumnCount = useMemo(() => {
    return USER_TABLE_COLUMNS.filter(col => visibleColumns[col.id] !== false).length;
  }, [visibleColumns]);

  // User Deletion States
  const [userPendingDelete, setUserPendingDelete] = useState(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Organization Deletion States
  const [orgPendingDelete, setOrgPendingDelete] = useState(null);
  const [deleteOrgConfirmationInput, setDeleteOrgConfirmationInput] = useState('');
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);

  const handleStartDeleteOrganization = (organization) => {
    setOrgPendingDelete(organization);
    setDeleteOrgConfirmationInput('');
    setError('');
  };

  const handleCancelDeleteOrganization = () => {
    if (isDeletingOrg) return;
    setOrgPendingDelete(null);
    setDeleteOrgConfirmationInput('');
  };

  const handleConfirmDeleteOrganization = async () => {
    if (!orgPendingDelete || isDeletingOrg) return;
    try {
      setIsDeletingOrg(true);
      setError('');
      const { deleteOrganization } = await loadStorageApi();
      await deleteOrganization(orgPendingDelete.id);

      const deletedName = orgPendingDelete.name || orgPendingDelete.id;
      setOrganizations(current => current.filter(o => o.id !== orgPendingDelete.id));
      setUsers(current => current.map(u => u.organizationId === orgPendingDelete.id ? { ...u, organizationId: '' } : u));

      setOrgPendingDelete(null);
      setDeleteOrgConfirmationInput('');
      setActionNotice({
        type: 'success',
        message: `הארגון "${deletedName}" נמחק בהצלחה מהמערכת.`
      });
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err) {
      console.error('Failed to delete organization', err);
      setError(err?.message || 'מחיקת הארגון נכשלה. אנא נסו שוב.');
    } finally {
      setIsDeletingOrg(false);
    }
  };

  const handleStartDeleteUser = (user) => {
    setUserPendingDelete(user);
    setDeleteConfirmationInput('');
    setError('');
  };

  const handleCancelDeleteUser = () => {
    if (isDeletingUser) return;
    setUserPendingDelete(null);
    setDeleteConfirmationInput('');
  };

  const handleConfirmDeleteUser = async () => {
    if (!userPendingDelete || isDeletingUser) return;
    try {
      setIsDeletingUser(true);
      setError('');
      const { deleteUser } = await loadStorageApi();
      await deleteUser(userPendingDelete.uid);

      const deletedEmail = userPendingDelete.email || userPendingDelete.uid;
      setUsers(current => current.filter(u => u.uid !== userPendingDelete.uid));
      setUsageStats(current => {
        const next = { ...current };
        delete next[userPendingDelete.uid];
        return next;
      });

      setUserPendingDelete(null);
      setDeleteConfirmationInput('');
      setActionNotice({
        type: 'success',
        message: `המשתמש ${deletedEmail} וכל נתוניו נמחקו לצמיתות מהמערכת.`
      });
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err) {
      console.error('Failed to delete user', err);
      setError(err?.message || 'מחיקת המשתמש נכשלה. אנא נסו שוב.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        setError('');
        const {
          getAllUsers,
          getUserManagementStats,
          getOrganizations,
          getUserJoinDateIso,
          backfillUserCreatedAtIfMissing,
          getSystemSuspendedContactMethod
        } = await loadStorageApi();
        const [usersList, statsByUser, organizationsList, currentContactMethod] = await Promise.all([
          getAllUsers(),
          getUserManagementStats(),
          getOrganizations(),
          getSystemSuspendedContactMethod ? getSystemSuspendedContactMethod() : 'whatsapp'
        ]);
        if (currentContactMethod) {
          setSystemContactMethod(currentContactMethod);
        }
        // Resolve and attach join date for each user, and backfill if missing in Firestore
        usersList.forEach(userItem => {
          const stats = statsByUser[userItem.uid] || {};
          const effectiveJoin = getUserJoinDateIso?.(userItem, stats) || getUserEffectiveJoinDate(userItem, stats);
          if (effectiveJoin) {
            userItem.joinDate = effectiveJoin;
            if (!userItem.createdAt) {
              userItem.createdAt = effectiveJoin;
              backfillUserCreatedAtIfMissing?.(userItem.uid, effectiveJoin);
            }
          }
        });
        // Sort by effective activity/login descending by default
        usersList.sort((a, b) => {
          const timeA = Date.parse(getUserEffectiveActivityIso(a, statsByUser[a.uid]) || a.lastLogin || 0) || 0;
          const timeB = Date.parse(getUserEffectiveActivityIso(b, statsByUser[b.uid]) || b.lastLogin || 0) || 0;
          return timeB - timeA;
        });
        setUsers(usersList);
        setUsageStats(statsByUser);
        setOrganizations(organizationsList);
        setRelativeNow(Date.now());
      } catch (err) {
        console.error("Failed to load users list", err);
        setError("שגיאה בטעינת רשימת המשתמשים. אנא ודאו שאתם מחוברים כאל מנהל מערכת מורשה.");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const organizationById = useMemo(() => Object.fromEntries(
    organizations.map(organization => [organization.id, organization])
  ), [organizations]);

  const organizationSummaries = useMemo(() => organizations.map(organization => {
    const members = users.filter(user => user.organizationId === organization.id);
    return members.reduce((summary, user) => {
      const stats = usageStats[user.uid] || {};
      const userActivity = getUserEffectiveActivityIso(user, stats);
      summary.projectCount += stats.projectCount || 0;
      summary.activeProjectCount += stats.activeProjectCount || 0;
      summary.activityCount += stats.activityCount || 0;
      if (userActivity && new Date(userActivity) > new Date(summary.lastActivityAt || 0)) {
        summary.lastActivityAt = userActivity;
      }
      return summary;
    }, {
      ...organization,
      members,
      memberCount: members.length,
      projectCount: 0,
      activeProjectCount: 0,
      activityCount: 0,
      lastActivityAt: ''
    });
  }), [organizations, users, usageStats]);

  const handleCreateOrganization = async (event) => {
    event.preventDefault();
    if (!newOrganizationName.trim()) return;
    try {
      setSavingOrganization('new');
      const { createOrganization } = await loadStorageApi();
      const organization = await createOrganization(newOrganizationName);
      setOrganizations(current => [...current, organization].sort((a, b) => a.name.localeCompare(b.name, 'he')));
      setNewOrganizationName('');
    } catch (err) {
      console.error('Failed to create organization', err);
      setError('יצירת הארגון נכשלה. אנא נסו שוב.');
    } finally {
      setSavingOrganization('');
    }
  };

  const handleOrganizationChange = async (userId, nextOrganizationId) => {
    try {
      setSavingOrganization(userId);
      setError('');
      const { assignUserToOrganization, migrateUserDataToOrganization } = await loadStorageApi();
      await assignUserToOrganization(userId, nextOrganizationId);
      try {
        await migrateUserDataToOrganization(userId, nextOrganizationId);
      } catch (migrationErr) {
        console.warn('Background data migration notice after assigning organization:', migrationErr);
      }
      setUsers(current => current.map(user => user.uid === userId ? { ...user, organizationId: nextOrganizationId } : user));
    } catch (err) {
      console.error('Failed to assign organization', err);
      setError('שיוך המשתמש לארגון נכשל.');
    } finally {
      setSavingOrganization('');
    }
  };

  const handleStartOrganizationEdit = (organization) => {
    setEditingOrganizationId(organization.id);
    setEditingOrganizationName(organization.name || '');
  };

  const handleSaveOrganizationName = async (organizationId) => {
    if (!editingOrganizationName.trim()) return;
    try {
      setSavingOrganization(`edit:${organizationId}`);
      const { updateOrganization } = await loadStorageApi();
      await updateOrganization(organizationId, { name: editingOrganizationName });
      setOrganizations(current => current.map(organization => (
        organization.id === organizationId
          ? { ...organization, name: editingOrganizationName.trim() }
          : organization
      )).sort((a, b) => a.name.localeCompare(b.name, 'he')));
      setEditingOrganizationId('');
      setEditingOrganizationName('');
    } catch (err) {
      console.error('Failed to rename organization', err);
      setError('עדכון שם הארגון נכשל.');
    } finally {
      setSavingOrganization('');
    }
  };

  const handleToggleOrganization = async (organization) => {
    const nextActive = organization.active === false;
    try {
      setSavingOrganization(`status:${organization.id}`);
      const { updateOrganization } = await loadStorageApi();
      await updateOrganization(organization.id, { active: nextActive });
      setOrganizations(current => current.map(item => (
        item.id === organization.id ? { ...item, active: nextActive } : item
      )));
    } catch (err) {
      console.error('Failed to update organization status', err);
      setError('עדכון סטטוס הארגון נכשל.');
    } finally {
      setSavingOrganization('');
    }
  };

  const handleToggleOrganizationVersion = async (organization) => {
    const currentVersion = organization.appVersion || DEFAULT_APP_VERSION;
    const nextVersion = currentVersion === APP_VERSIONS.LEGACY ? APP_VERSIONS.V2 : APP_VERSIONS.LEGACY;
    try {
      setSavingOrganization(`version:${organization.id}`);
      const { updateOrganization } = await loadStorageApi();
      await updateOrganization(organization.id, { appVersion: nextVersion });
      setOrganizations(current => current.map(item => (
        item.id === organization.id ? { ...item, appVersion: nextVersion } : item
      )));
    } catch (err) {
      console.error('Failed to update organization version', err);
      setError('עדכון גרסת הארגון נכשל.');
    } finally {
      setSavingOrganization('');
    }
  };

  const handleUpdateSystemContactMethod = async (nextMethod) => {
    if (savingSystemContactMethod || nextMethod === systemContactMethod) return;
    try {
      setSavingSystemContactMethod(true);
      const { setSystemSuspendedContactMethod } = await loadStorageApi();
      await setSystemSuspendedContactMethod(nextMethod);
      setSystemContactMethod(nextMethod);
      setContactMethodSuccessMessage('הגדרת ערוץ הפנייה עודכנה בהצלחה!');
      setTimeout(() => setContactMethodSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to update system suspended contact method', err);
      setError('שגיאה בעדכון הגדרת ערוץ הפנייה בהשבתה');
    } finally {
      setSavingSystemContactMethod(false);
    }
  };

  const handleUpdateOrganizationContactMethod = async (organization, nextMethod) => {
    try {
      setSavingOrganization(`contactMethod:${organization.id}`);
      const { updateOrganization } = await loadStorageApi();
      await updateOrganization(organization.id, { suspendedContactMethod: nextMethod });
      setOrganizations(current => current.map(item => (
        item.id === organization.id ? { ...item, suspendedContactMethod: nextMethod } : item
      )));
    } catch (err) {
      console.error('Failed to update organization contact method', err);
      setError('שגיאה בעדכון ערוץ פנייה עבור הארגון');
    } finally {
      setSavingOrganization('');
    }
  };

  const totals = useMemo(() => {
    return users.reduce((acc, user) => {
      const stats = usageStats[user.uid] || {};
      const userActivity = getUserEffectiveActivityIso(user, stats);
      acc.projectCount += stats.projectCount || 0;
      acc.activeProjectCount += stats.activeProjectCount || 0;
      acc.weeklyHoursTotal += stats.weeklyHoursTotal || 0;
      acc.activityCount += stats.activityCount || 0;
      if (userActivity && new Date(userActivity) > new Date(acc.lastActivityAt || 0)) {
        acc.lastActivityAt = userActivity;
      }
      return acc;
    }, { projectCount: 0, activeProjectCount: 0, activityCount: 0, weeklyHoursTotal: 0, lastActivityAt: '' });
  }, [users, usageStats]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    const result = users.filter(user =>
      (user.email || '').toLowerCase().includes(normalizedSearch)
    );

    result.sort((a, b) => {
      if (sortBy === 'joinDateDesc') {
        const timeA = Date.parse(getUserEffectiveJoinDate(a, usageStats[a.uid]) || 0) || 0;
        const timeB = Date.parse(getUserEffectiveJoinDate(b, usageStats[b.uid]) || 0) || 0;
        return timeB - timeA;
      }
      if (sortBy === 'joinDateAsc') {
        const timeA = Date.parse(getUserEffectiveJoinDate(a, usageStats[a.uid]) || 0) || 0;
        const timeB = Date.parse(getUserEffectiveJoinDate(b, usageStats[b.uid]) || 0) || 0;
        return timeA - timeB;
      }
      if (sortBy === 'projectCount') {
        const countA = usageStats[a.uid]?.projectCount || 0;
        const countB = usageStats[b.uid]?.projectCount || 0;
        return countB - countA;
      }
      if (sortBy === 'email') {
        return (a.email || '').localeCompare(b.email || '', 'he');
      }
      // Default: 'lastActive'
      const timeA = Date.parse(getUserEffectiveActivityIso(a, usageStats[a.uid]) || a.lastLogin || 0) || 0;
      const timeB = Date.parse(getUserEffectiveActivityIso(b, usageStats[b.uid]) || b.lastLogin || 0) || 0;
      return timeB - timeA;
    });

    return result;
  }, [users, usageStats, searchTerm, sortBy]);

  const formatNumber = (value) => (Number(value) || 0).toLocaleString('he-IL');
  const maxProjectCount = Math.max(1, ...users.map(user => usageStats[user.uid]?.projectCount || 0));

  const formatDateTime = (isoString) => {
    if (!isoString) return 'לא ידוע';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const formatCompactDateTime = (isoString) => {
    if (!isoString) return 'אין נתונים';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const formatJoinDate = (isoString) => {
    if (!isoString) return 'לא ידוע';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'לא ידוע';
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return isoString || 'לא ידוע';
    }
  };

  const formatJoinTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const formatRelativeJoinDate = (isoString) => {
    if (!isoString) return '';
    const ts = Date.parse(isoString);
    if (!Number.isFinite(ts) || ts <= 0) return '';
    const diffMs = (relativeNow || Date.now()) - ts;
    if (diffMs < 0) return 'זה עתה';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'הצטרף/ה היום';
    if (diffDays === 1) return 'הצטרף/ה אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return 'לפני שבוע';
    if (diffWeeks < 4) return `לפני ${diffWeeks} שבועות`;
    const diffMonths = Math.floor(diffDays / 30.44);
    if (diffMonths <= 1) return 'לפני חודש';
    if (diffMonths < 12) return `לפני ${diffMonths} חודשים`;
    const diffYears = Math.floor(diffDays / 365.25);
    if (diffYears === 1) return 'לפני שנה';
    if (diffYears === 2) return 'לפני שנתיים';
    return `לפני ${diffYears} שנים`;
  };

  const formatRelativeActivity = (isoString) => {
    if (!isoString) return 'ללא פעילות מתועדת';
    if (!relativeNow) return 'פעיל לאחרונה';
    const diffMs = relativeNow - new Date(isoString).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (!Number.isFinite(diffDays) || diffDays < 0) return 'פעיל לאחרונה';
    if (diffDays === 0) return 'פעילות היום';
    if (diffDays === 1) return 'פעילות אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  };

  const getInitials = (email = '') => {
    const name = email.split('@')[0] || '?';
    return name
      .split(/[._\-\s]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || '?';
  };

  const getActivityTone = (isoString) => {
    if (!isoString) return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
    if (!relativeNow) return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
    const diffDays = Math.floor((relativeNow - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    if (diffDays <= 30) return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
  };

  const renderMetricPill = (label, value, tone = '#334155') => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      minHeight: '28px',
      padding: '5px 9px',
      borderRadius: '999px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      color: tone,
      fontSize: '0.82rem',
      fontWeight: '700',
      whiteSpace: 'nowrap'
    }}>
      <span style={{ color: '#64748b', fontWeight: '600' }}>{label}</span>
      {value}
    </span>
  );

  const renderProgressBar = (value, maxValue) => {
    const percentage = Math.max(4, Math.min(100, Math.round(((Number(value) || 0) / maxValue) * 100)));
    return (
      <div style={{
        height: '8px',
        width: '100%',
        borderRadius: '999px',
        background: '#e2e8f0',
        overflow: 'hidden',
        marginTop: '10px'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          borderRadius: 'inherit',
          background: 'linear-gradient(90deg, #0f766e, #2563eb)'
        }} />
      </div>
    );
  };

  const renderSummaryCard = (label, value, tone = '#3730a3') => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.82)',
      border: '1px solid rgba(226, 232, 240, 0.9)',
      borderRadius: '12px',
      padding: '18px',
      boxShadow: '0 8px 18px -12px rgba(15, 23, 42, 0.35)'
    }}>
      <span style={{ display: 'block', color: '#64748b', fontSize: '0.88rem', fontWeight: '600', marginBottom: '8px' }}>{label}</span>
      <strong style={{ display: 'block', color: tone, fontSize: '1.55rem', lineHeight: 1.1 }}>{value}</strong>
    </div>
  );

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '40px auto',
      padding: '0 20px',
      fontFamily: 'Rubik, sans-serif',
      direction: 'rtl'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: '#1e293b', fontWeight: '700' }}>🛠️ פאנל ניהול</h2>
        </div>
      </div>

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        {adminActions.map((action) => (
          <button
            key={action.view}
            type="button"
            onClick={() => (action.view === 'dashboard' ? onBack() : onNavigate?.(action.view))}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              minHeight: '108px',
              padding: '18px',
              textAlign: 'right',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.82)',
              boxShadow: '0 8px 18px -12px rgba(15, 23, 42, 0.35)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: '#1e293b'
            }}
          >
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{action.icon}</span>
            <span>
              <span style={{ display: 'block', fontWeight: '700', marginBottom: '6px' }}>{action.title}</span>
              <span style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.45 }}>{action.description}</span>
            </span>
          </button>
        ))}
      </section>

      <form onSubmit={handleCreateOrganization} style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'end',
        padding: '16px',
        marginBottom: '20px',
        borderRadius: '12px',
        border: '1px solid #dbeafe',
        background: '#eff6ff'
      }}>
        <label style={{ flex: 1, color: '#1e3a8a', fontWeight: '700' }}>
          יצירת ארגון חדש
          <input
            value={newOrganizationName}
            onChange={(event) => setNewOrganizationName(event.target.value)}
            placeholder="שם הארגון"
            style={{ display: 'block', width: '100%', marginTop: '7px', padding: '10px 12px', border: '1px solid #bfdbfe', borderRadius: '8px', fontFamily: 'inherit' }}
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={savingOrganization === 'new' || !newOrganizationName.trim()}>
          {savingOrganization === 'new' ? 'יוצר...' : 'הוספת ארגון'}
        </button>
      </form>

      {/* Suspended Screen Settings Section */}
      <section style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '22px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.4rem' }}>🔒</span>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '700' }}>
                הגדרת אייקון מרחף במסך השבתת ארגון
              </h3>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
              קבעו איזה אייקון מרחף יופיע במסך ההשבתה למשתמש שנכנס למערכת כאשר הארגון שלו מושבת
            </p>
          </div>

          {contactMethodSuccessMessage && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              fontSize: '0.82rem',
              fontWeight: '700',
              border: '1px solid #86efac'
            }}>
              <span>✓</span>
              <span>{contactMethodSuccessMessage}</span>
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px'
        }}>
          {/* Option 1: WhatsApp */}
          <button
            type="button"
            onClick={() => handleUpdateSystemContactMethod('whatsapp')}
            disabled={savingSystemContactMethod}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              textAlign: 'right',
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              border: systemContactMethod === 'whatsapp' ? '2px solid #25D366' : '1px solid #e2e8f0',
              backgroundColor: systemContactMethod === 'whatsapp' ? '#f0fdf4' : '#ffffff',
              boxShadow: systemContactMethod === 'whatsapp' ? '0 4px 14px rgba(37, 211, 102, 0.18)' : 'none'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(37, 211, 102, 0.35)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.38 17.07L2 22L7.07 20.66C8.52 21.52 10.21 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="white" />
                <path d="M17.47 14.81C17.24 14.69 16.08 14.12 15.87 14.04C15.65 13.96 15.5 13.92 15.34 14.15C15.19 14.38 14.76 14.88 14.63 15.03C14.5 15.19 14.37 15.21 14.14 15.09C13.91 14.98 12.93 14.66 11.78 13.63C10.88 12.83 10.27 11.84 10.04 11.45C9.81 11.07 10.02 10.86 10.13 10.74C10.24 10.63 10.37 10.45 10.49 10.32C10.61 10.19 10.65 10.09 10.73 9.94C10.81 9.78 10.77 9.65 10.71 9.53C10.65 9.42 10.19 8.28 10 7.82C9.81 7.37 9.62 7.43 9.47 7.42C9.33 7.41 9.18 7.41 9.02 7.41C8.87 7.41 8.62 7.47 8.41 7.7C8.2 7.93 7.6 8.49 7.6 9.64C7.6 10.79 8.43 11.89 8.55 12.05C8.67 12.21 10.19 14.55 12.52 15.55C13.07 15.79 13.5 15.93 13.84 16.04C14.39 16.21 14.89 16.19 15.28 16.13C15.72 16.06 16.63 15.57 16.82 15.04C17.01 14.51 17.01 14.05 16.95 13.96C16.89 13.86 16.74 13.8 16.51 13.69" fill="#25D366" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <strong style={{ color: '#166534', fontSize: '0.98rem' }}>אייקון ווטסאפ (WhatsApp)</strong>
                {systemContactMethod === 'whatsapp' && (
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '999px' }}>פעיל</span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', color: '#15803d', fontSize: '0.82rem', lineHeight: '1.4' }}>
                אייקון מרחף שיוביל למספר <strong>052-8366744</strong> (פתיחת צ'אט ישיר)
              </p>
            </div>
          </button>

          {/* Option 2: Email */}
          <button
            type="button"
            onClick={() => handleUpdateSystemContactMethod('email')}
            disabled={savingSystemContactMethod}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              textAlign: 'right',
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              border: systemContactMethod === 'email' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: systemContactMethod === 'email' ? '#eff6ff' : '#ffffff',
              boxShadow: systemContactMethod === 'email' ? '0 4px 14px rgba(37, 99, 235, 0.18)' : 'none'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <strong style={{ color: '#1e40af', fontSize: '0.98rem' }}>אייקון אימייל (Email)</strong>
                {systemContactMethod === 'email' && (
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#2563eb', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '999px' }}>פעיל</span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', color: '#1d4ed8', fontSize: '0.82rem', lineHeight: '1.4' }}>
                אייקון מרחף שישלח הודעה למייל <strong>shaharsolutions@gmail.com</strong>
              </p>
            </div>
          </button>

          {/* Option 3: None */}
          <button
            type="button"
            onClick={() => handleUpdateSystemContactMethod('none')}
            disabled={savingSystemContactMethod}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              textAlign: 'right',
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              border: systemContactMethod === 'none' ? '2px solid #64748b' : '1px solid #e2e8f0',
              backgroundColor: systemContactMethod === 'none' ? '#f8fafc' : '#ffffff',
              boxShadow: systemContactMethod === 'none' ? '0 4px 14px rgba(100, 116, 139, 0.18)' : 'none'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '1.2rem',
              color: 'white'
            }}>
              🚫
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <strong style={{ color: '#334155', fontSize: '0.98rem' }}>ללא אייקון (מוסתר)</strong>
                {systemContactMethod === 'none' && (
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '999px' }}>פעיל</span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem', lineHeight: '1.4' }}>
                מסך ההשבתה יוצג ללא אייקון פנייה מרחף
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Payments & Pricing Management Section */}
      <section style={{
        background: '#ffffff',
        border: '1px solid #c7d2fe',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 8px 24px -6px rgba(99, 102, 241, 0.12)'
      }}>
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.6rem' }}>💳</span>
              <h3 style={{ margin: 0, color: '#1e1b4b', fontSize: '1.35rem', fontWeight: '800' }}>
                ניהול תשלומים ופתיחת גישה (סליקת Tranzila)
              </h3>
            </div>
            <p style={{ margin: 0, color: '#4338ca', fontSize: '0.9rem', lineHeight: '1.5' }}>
              הגדרת המחיר שארגונים מושבתים יצטרכו לשלם כדי לקבל גישה למערכת, פרטי מסוף הסליקה Tranzila, ריכוז ארגונים מושבתים ויומן עסקאות.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setTestPaymentOrg({ id: 'test-org-preview', name: 'ארגון לבדיקה' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
              title="בדיקת דף תשלום Tranzila בזמן אמת"
            >
              <span>🧪</span>
              <span>בדיקת דף תשלום</span>
            </button>

            <button
              type="button"
              onClick={loadPayments}
              disabled={loadingPaymentRecords}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontWeight: '600',
                fontSize: '0.84rem',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
              title="רענון נתוני תשלומים"
            >
              <span>🔄</span>
              <span>{loadingPaymentRecords ? 'מרענן...' : 'רענון'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Price Setting + Gateway Details */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {/* Card 1: Setting Reopen Price */}
          <div style={{
            border: '1px solid #e0e7ff',
            backgroundColor: '#f5f7ff',
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ color: '#1e1b4b', fontSize: '1.05rem' }}>💰 קביעת מחיר מנוי חודשי לארגון מושבת</strong>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#4338ca', backgroundColor: '#e0e7ff', padding: '2px 10px', borderRadius: '999px' }}>
                  ₪{paymentConfig.reopenPrice} / חודש
                </span>
              </div>
              <p style={{ margin: '0 0 14px 0', color: '#475569', fontSize: '0.84rem', lineHeight: '1.45' }}>
                סכום זה ייגבה בהוראת קבע חודשית דרך Tranzila עבור פתיחת ושימור הגישה של ארגון מושבת. עם אישור התשלום, המערכת תיפתח למשתמשי הארגון מיידית.
              </p>

              {/* Presets */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>קיצורים מהירים:</span>
                {[99, 150, 200, 250, 350, 500].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setReopenPriceInput(val)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      border: Number(reopenPriceInput) === val ? '1px solid #4338ca' : '1px solid #cbd5e1',
                      backgroundColor: Number(reopenPriceInput) === val ? '#4338ca' : '#ffffff',
                      color: Number(reopenPriceInput) === val ? '#ffffff' : '#334155',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    ₪{val}
                  </button>
                ))}
              </div>

              {/* Price Form */}
              <form onSubmit={handleSaveReopenPrice} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: '700' }}>₪</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={reopenPriceInput}
                    onChange={(e) => setReopenPriceInput(e.target.value)}
                    placeholder="הזינו מחיר בש״ח"
                    style={{
                      width: '100%',
                      padding: '9px 28px 9px 10px',
                      borderRadius: '8px',
                      border: '1px solid #a5b4fc',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingReopenPrice}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#4338ca',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: savingReopenPrice ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {savingReopenPrice ? 'שומר...' : 'שמור מחיר'}
                </button>
              </form>
            </div>

            {reopenPriceSuccess && (
              <div style={{
                marginTop: '10px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                border: '1px solid #86efac',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>✓</span>
                <span>{reopenPriceSuccess}</span>
              </div>
            )}
          </div>

          {/* Card 2: Tranzila Gateway Status */}
          <div style={{
            border: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ color: '#0f172a', fontSize: '1.05rem' }}>🛡️ פרטי ספק סליקה (Tranzila)</strong>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#166534', backgroundColor: '#dcfce7', border: '1px solid #86efac', padding: '3px 10px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>●</span>
                  <span>מסוף מחובר ופעיל</span>
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', color: '#475569', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>מסוף ראשי:</span>
                  <strong style={{ color: '#0f172a', direction: 'ltr' }}>{paymentConfig.mainTerminal || 'shaher1'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>מסוף מנויים / הוראות קבע (טוקנים):</span>
                  <strong style={{ color: '#16a34a', direction: 'ltr' }}>{paymentConfig.tokenTerminal || 'shaher1tok'} (פעיל)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>מפתח App Key:</span>
                  <span style={{ color: '#64748b', direction: 'ltr', fontSize: '0.78rem' }}>1klmutNv...h0L</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>תקן אבטחה:</span>
                  <strong style={{ color: '#0f172a' }}>PCI-DSS Level 1</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              <a
                href="https://docs.tranzila.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}
              >
                דוקומנטציה Tranzila ↗
              </a>
              <span style={{ color: '#cbd5e1' }}>·</span>
              <a
                href="https://my.tranzila.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}
              >
                פורטל מסוף my.tranzila ↗
              </a>
            </div>
          </div>
        </div>

        {/* Suspended Organizations Table & Direct Actions */}
        <div style={{
          border: '1px solid #fed7aa',
          backgroundColor: '#fffbeb',
          borderRadius: '12px',
          padding: '16px 18px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🔒</span>
              <strong style={{ color: '#9a3412', fontSize: '0.98rem' }}>
                ארגונים מושבתים כעת ({suspendedOrganizations.length})
              </strong>
            </div>
            <span style={{ fontSize: '0.82rem', color: '#b45309' }}>
              ניתן להעתיק קישור תשלום ישיר ולשלוח ללקוח בוואטסאפ או במייל
            </span>
          </div>

          {suspendedOrganizations.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: '#15803d', backgroundColor: '#f0fdf4', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '600', border: '1px solid #bbf7d0' }}>
              ✓ כל הארגונים במערכת פעילים כעת! אין ארגונים מושבתים.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suspendedOrganizations.map(org => {
                const isCopied = copiedPaymentOrgId === org.id;
                return (
                  <div
                    key={org.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#ffffff',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{org.name}</strong>
                      <span style={{ color: '#cbd5e1' }}>|</span>

                      {editingPriceOrgId === org.id ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0f9ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                          <span style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: '700' }}>מחיר ספציפי:</span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>₪</span>
                          <input
                            autoFocus
                            type="number"
                            min="1"
                            value={editingOrgPriceValue}
                            onChange={(e) => setEditingOrgPriceValue(e.target.value)}
                            placeholder={`ברירת מחדל (${paymentConfig.reopenPrice})`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveOrgPrice(org.id);
                              if (e.key === 'Escape') setEditingPriceOrgId('');
                            }}
                            style={{
                              width: '90px',
                              padding: '3px 6px',
                              border: '1px solid #0284c7',
                              borderRadius: '4px',
                              fontSize: '0.82rem',
                              fontFamily: 'inherit',
                              fontWeight: '700'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveOrgPrice(org.id)}
                            disabled={savingOrganization === `price:${org.id}`}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.76rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {savingOrganization === `price:${org.id}` ? 'שומר...' : 'שמור'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOrgPriceValue('');
                              handleSaveOrgPrice(org.id);
                            }}
                            title="ביטול מחיר ספציפי ושימוש בברירת המחדל של המערכת"
                            style={{
                              padding: '3px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#ffffff',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            איפוס לברירת מחדל
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPriceOrgId('')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#64748b',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              padding: '0 2px'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
                            מנוי חודשי:{' '}
                            {org.reopenPrice !== undefined && org.reopenPrice !== null && Number(org.reopenPrice) > 0 ? (
                              <strong style={{ color: '#1d4ed8', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '999px', fontSize: '0.84rem' }}>
                                ₪{org.reopenPrice} / חודש (ספציפי)
                              </strong>
                            ) : (
                              <strong style={{ color: '#334155' }}>
                                ₪{paymentConfig.reopenPrice} / חודש (ברירת מחדל)
                              </strong>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEditOrgPrice(org)}
                            title="עריכת מחיר פתיחת גישה ספציפי עבור ארגון זה"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#2563eb',
                              fontSize: '0.76rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              textDecoration: 'underline'
                            }}
                          >
                            ✏️ {org.reopenPrice ? 'שינוי מחיר' : 'קביעת מחיר ספציפי'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleCopyPaymentLink(org)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: isCopied ? '#dcfce7' : '#eff6ff',
                          color: isCopied ? '#15803d' : '#1d4ed8',
                          border: isCopied ? '1px solid #86efac' : '1px solid #bfdbfe',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                        title="העתקת קישור סליקה ישיר לשליחה ללקוח"
                      >
                        <span>{isCopied ? '✓' : '📋'}</span>
                        <span>{isCopied ? 'הקישור הועתק!' : 'העתק קישור לתשלום'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleOrganization(org)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#f8fafc',
                          color: '#166534',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                        title="פתיחה ידנית ללא תשלום אשראי (למשל תשלום בהעברה בנקאית)"
                      >
                        <span>🔓</span>
                        <span>פתיחה ידנית</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transactions / Payment Records Log */}
        <div style={{
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#ffffff'
        }}>
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🧾</span>
              <strong style={{ color: '#1e293b', fontSize: '0.94rem' }}>
                יומן תשלומי פתיחת גישה ({paymentRecords.length})
                {totalPaymentPages > 1 && (
                  <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b', marginRight: '6px' }}>
                    • עמוד {paymentsPage} מתוך {totalPaymentPages}
                  </span>
                )}
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {paymentRecords.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenClearPaymentsModal}
                  disabled={clearingPayments}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: clearingPayments ? 'not-allowed' : 'pointer',
                    opacity: clearingPayments ? 0.6 : 1,
                    fontFamily: 'inherit'
                  }}
                  title="איפוס ומחיקת כל רשומות יומן התשלומים"
                >
                  <span>🗑️</span>
                  <span>{clearingPayments ? 'מאפס...' : 'איפוס יומן'}</span>
                </button>
              )}
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>10 בעמוד</span>
            </div>
          </div>

          {loadingPaymentRecords ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
              טוען יומן תשלומים...
            </div>
          ) : paymentRecords.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
              טרם בוצעו תשלומים לפתיחת ארגונים במערכת.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 14px' }}>תאריך ושעה</th>
                      <th style={{ padding: '10px 14px' }}>שם ארגון</th>
                      <th style={{ padding: '10px 14px' }}>משתמש משלם</th>
                      <th style={{ padding: '10px 14px' }}>סכום</th>
                      <th style={{ padding: '10px 14px' }}>מזהה עסקה</th>
                      <th style={{ padding: '10px 14px' }}>סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPaymentRecords.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleString('he-IL') : '-'}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>
                          {item.organizationName || item.organizationId}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569', direction: 'ltr', textAlign: 'right' }}>
                          {item.userEmail || '-'}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: '800', color: '#15803d' }}>
                          ₪{item.amount}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b' }}>
                          {item.confirmationCode || item.transactionId || '-'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.74rem',
                            fontWeight: '800'
                          }}>
                            ✓ הושלם
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                fontSize: '0.85rem'
              }}>
                <div style={{ color: '#64748b' }}>
                  מציג רשומות <strong>{(paymentsPage - 1) * PAYMENTS_PER_PAGE + 1}–{Math.min(paymentRecords.length, paymentsPage * PAYMENTS_PER_PAGE)}</strong> מתוך <strong>{paymentRecords.length}</strong>
                </div>

                {totalPaymentPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <button
                      type="button"
                      disabled={paymentsPage === 1}
                      onClick={() => setPaymentsPage(1)}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: paymentsPage === 1 ? '#f1f5f9' : '#ffffff',
                        color: paymentsPage === 1 ? '#94a3b8' : '#334155',
                        cursor: paymentsPage === 1 ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontFamily: 'inherit',
                        fontSize: '0.8rem'
                      }}
                      title="לעמוד הראשון"
                    >
                      ראשון
                    </button>
                    <button
                      type="button"
                      disabled={paymentsPage === 1}
                      onClick={() => setPaymentsPage(prev => Math.max(1, prev - 1))}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: paymentsPage === 1 ? '#f1f5f9' : '#ffffff',
                        color: paymentsPage === 1 ? '#94a3b8' : '#334155',
                        cursor: paymentsPage === 1 ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontFamily: 'inherit',
                        fontSize: '0.8rem'
                      }}
                      title="לעמוד הקודם"
                    >
                      הקודם
                    </button>

                    {Array.from({ length: totalPaymentPages }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === totalPaymentPages || Math.abs(page - paymentsPage) <= 1)
                      .reduce((acc, page, idx, arr) => {
                        if (idx > 0 && page - arr[idx - 1] > 1) {
                          acc.push('ellipsis-' + page);
                        }
                        acc.push(page);
                        return acc;
                      }, [])
                      .map(item => {
                        if (typeof item === 'string') {
                          return <span key={item} style={{ color: '#94a3b8', padding: '0 3px' }}>...</span>;
                        }
                        const isActive = item === paymentsPage;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPaymentsPage(item)}
                            style={{
                              padding: '4px 9px',
                              minWidth: '30px',
                              borderRadius: '6px',
                              border: isActive ? '1px solid #4338ca' : '1px solid #cbd5e1',
                              background: isActive ? '#4f46e5' : '#ffffff',
                              color: isActive ? '#ffffff' : '#334155',
                              cursor: 'pointer',
                              fontWeight: isActive ? '700' : '500',
                              fontFamily: 'inherit',
                              fontSize: '0.8rem'
                            }}
                          >
                            {item}
                          </button>
                        );
                      })}

                    <button
                      type="button"
                      disabled={paymentsPage === totalPaymentPages}
                      onClick={() => setPaymentsPage(prev => Math.min(totalPaymentPages, prev + 1))}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: paymentsPage === totalPaymentPages ? '#f1f5f9' : '#ffffff',
                        color: paymentsPage === totalPaymentPages ? '#94a3b8' : '#334155',
                        cursor: paymentsPage === totalPaymentPages ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontFamily: 'inherit',
                        fontSize: '0.8rem'
                      }}
                      title="לעמוד הבא"
                    >
                      הבא
                    </button>
                    <button
                      type="button"
                      disabled={paymentsPage === totalPaymentPages}
                      onClick={() => setPaymentsPage(totalPaymentPages)}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: paymentsPage === totalPaymentPages ? '#f1f5f9' : '#ffffff',
                        color: paymentsPage === totalPaymentPages ? '#94a3b8' : '#334155',
                        cursor: paymentsPage === totalPaymentPages ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontFamily: 'inherit',
                        fontSize: '0.8rem'
                      }}
                      title="לעמוד האחרון"
                    >
                      אחרון
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section style={{
        background: 'rgba(255, 255, 255, 0.82)',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '22px',
        marginBottom: '24px',
        boxShadow: '0 10px 25px -16px rgba(15, 23, 42, 0.35)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem' }}>ארגונים במערכת</h3>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.9rem' }}>ניהול ארגונים, שיוכים ונתוני שימוש מרוכזים</p>
          </div>
          <span style={{ padding: '6px 11px', borderRadius: '999px', background: '#eef2ff', color: '#4338ca', fontWeight: '800' }}>
            {formatNumber(organizations.length)} ארגונים
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>טוען ארגונים...</div>
        ) : organizationSummaries.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>עדיין לא נוצרו ארגונים.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '14px' }}>
            {organizationSummaries.map(organization => {
              const isActive = organization.active !== false;
              const isEditing = editingOrganizationId === organization.id;
              const orgFlags = getFeatureFlags(organization);
              return (
                <article key={organization.id} style={{
                  border: `1px solid ${isActive ? '#c7d2fe' : '#e2e8f0'}`,
                  borderRadius: '14px',
                  padding: '17px',
                  background: isActive ? 'linear-gradient(145deg, #ffffff, #f8faff)' : '#f8fafc'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '7px' }}>
                          <input
                            autoFocus
                            value={editingOrganizationName}
                            onChange={(event) => setEditingOrganizationName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') handleSaveOrganizationName(organization.id);
                              if (event.key === 'Escape') setEditingOrganizationId('');
                            }}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #a5b4fc', borderRadius: '7px', fontFamily: 'inherit', fontWeight: '700' }}
                          />
                          <button type="button" className="btn btn-primary" onClick={() => handleSaveOrganizationName(organization.id)} disabled={savingOrganization === `edit:${organization.id}`}>שמור</button>
                        </div>
                      ) : (
                        <>
                          <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.08rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{organization.name}</strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '7px' }}>
                            <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '999px', background: isActive ? '#dcfce7' : '#e2e8f0', color: isActive ? '#166534' : '#475569', fontSize: '0.77rem', fontWeight: '800' }}>
                              {isActive ? 'ארגון פעיל' : 'ארגון לא פעיל'}
                            </span>
                            {organization.trialEndsAt && (!organization.subscription || organization.subscription.status === 'trial') && (
                              new Date(organization.trialEndsAt).getTime() >= Date.now() ? (
                                <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.77rem', fontWeight: '800' }}>
                                  🎁 ניסיון ({Math.max(0, Math.ceil((new Date(organization.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} ימים)
                                </span>
                              ) : (
                                <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '999px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontSize: '0.77rem', fontWeight: '800' }}>
                                  ⏰ תם הניסיון
                                </span>
                              )
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleOrganizationVersion(organization)}
                              disabled={savingOrganization === `version:${organization.id}`}
                              title="לחצי להחלפת גרסת המערכת עבור ארגון זה"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '999px',
                                background: orgFlags.isV2 ? '#eff6ff' : '#fef3c7',
                                color: orgFlags.isV2 ? '#1d4ed8' : '#b45309',
                                border: orgFlags.isV2 ? '1px solid #bfdbfe' : '1px solid #fde68a',
                                fontSize: '0.77rem',
                                fontWeight: '800',
                                cursor: 'pointer'
                              }}
                            >
                              {orgFlags.isV2 ? '✨ גרסה 2 (חדשה)' : '🏛️ Legacy (קלאסית)'}
                              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>⇄</span>
                            </button>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.74rem'
                            }}>
                              <span title="אייקון במסך השבתה">🔒</span>
                              <select
                                value={organization.suspendedContactMethod || 'default'}
                                onChange={(e) => handleUpdateOrganizationContactMethod(organization, e.target.value)}
                                disabled={savingOrganization === `contactMethod:${organization.id}`}
                                title="קביעת ערוץ הפנייה שיוצג במסך ההשבתה של ארגון זה"
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#334155',
                                  fontSize: '0.74rem',
                                  fontWeight: '600',
                                  fontFamily: 'inherit',
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                <option value="default">ברירת מחדל ({systemContactMethod === 'whatsapp' ? 'ווטסאפ' : systemContactMethod === 'email' ? 'מייל' : 'ללא'})</option>
                                <option value="whatsapp">🟢 ווטסאפ (052-8366744)</option>
                                <option value="email">✉️ מייל (shaharsolutions@gmail.com)</option>
                                <option value="none">🚫 ללא אייקון (מוסתר)</option>
                              </select>
                            </div>

                            {/* Organization Specific Reopen Price Badge & Quick Edit */}
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              backgroundColor: organization.reopenPrice ? '#eff6ff' : '#f8fafc',
                              border: organization.reopenPrice ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                              fontSize: '0.74rem'
                            }}>
                              <span title="מחיר פתיחת גישה">💳</span>
                              {editingPriceOrgId === organization.id ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    autoFocus
                                    type="number"
                                    min="1"
                                    value={editingOrgPriceValue}
                                    onChange={(e) => setEditingOrgPriceValue(e.target.value)}
                                    placeholder={`ברירת מחדל (${paymentConfig.reopenPrice})`}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveOrgPrice(organization.id);
                                      if (e.key === 'Escape') setEditingPriceOrgId('');
                                    }}
                                    style={{
                                      width: '75px',
                                      padding: '2px 4px',
                                      border: '1px solid #3b82f6',
                                      borderRadius: '4px',
                                      fontSize: '0.74rem',
                                      fontFamily: 'inherit'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveOrgPrice(organization.id)}
                                    disabled={savingOrganization === `price:${organization.id}`}
                                    style={{
                                      background: '#2563eb',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '0.7rem',
                                      cursor: 'pointer',
                                      fontWeight: '700'
                                    }}
                                  >
                                    שמור
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingOrgPriceValue('');
                                      handleSaveOrgPrice(organization.id);
                                    }}
                                    title="איפוס למחיר ברירת מחדל"
                                    style={{
                                      background: '#e2e8f0',
                                      color: '#475569',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '2px 4px',
                                      fontSize: '0.68rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    איפוס
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPriceOrgId('')}
                                    style={{
                                      background: 'transparent',
                                      color: '#94a3b8',
                                      border: 'none',
                                      padding: '0 2px',
                                      fontSize: '0.7rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditOrgPrice(organization)}
                                  title="לחצי לקביעת מחיר פתיחת גישה ספציפי לארגון זה"
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: organization.reopenPrice ? '#1d4ed8' : '#475569',
                                    fontSize: '0.74rem',
                                    fontWeight: organization.reopenPrice ? '800' : '600',
                                    fontFamily: 'inherit',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}
                                >
                                  <span>
                                     {organization.reopenPrice
                                       ? `₪${organization.reopenPrice}/חודש (ספציפי)`
                                       : `ברירת מחדל (₪${paymentConfig.reopenPrice}/חודש)`}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>✏️</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {!isEditing && (
                      <button type="button" className="btn btn-secondary" onClick={() => handleStartOrganizationEdit(organization)} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>עריכת שם</button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '16px 0' }}>
                    {[
                      ['משתמשים', organization.memberCount],
                      [orgFlags.terms.items, organization.projectCount],
                      ['פעילים', organization.activeProjectCount]
                    ].map(([label, value]) => (
                      <div key={label} style={{ padding: '9px', borderRadius: '9px', background: '#f8fafc', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <strong style={{ display: 'block', color: '#1e293b' }}>{formatNumber(value)}</strong>
                        <span style={{ color: '#64748b', fontSize: '0.76rem' }}>{label}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ minHeight: '38px', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    {organization.members.length > 0
                      ? organization.members.slice(0, 3).map(member => member.email).filter(Boolean).join(' · ')
                      : 'אין משתמשים משויכים לארגון'}
                    {organization.members.length > 3 ? ` ועוד ${organization.members.length - 3}` : ''}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop: '13px', marginTop: '13px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                    <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      פעילות אחרונה: {formatCompactDateTime(organization.lastActivityAt)}
                    </span>
                    <div style={{ display: 'flex', gap: '7px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onManageOrganization?.(organization.id, organization.name)}
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      >
                        ⚙️ {orgFlags.terms.workSettings}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleToggleOrganization(organization)}
                        disabled={savingOrganization === `status:${organization.id}`}
                        style={{ padding: '6px 10px', fontSize: '0.8rem', color: isActive ? '#b45309' : '#166534' }}
                      >
                        {isActive ? 'השבתת ארגון' : 'הפעלת ארגון'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleStartDeleteOrganization(organization)}
                        style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fecaca', backgroundColor: '#fff5f5' }}
                        title="מחיקת ארגון"
                      >
                        🗑️ מחיקה
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        {renderSummaryCard('משתמשים במערכת', loading ? '...' : formatNumber(users.length))}
        {renderSummaryCard('פרויקטים במערכת', loading ? '...' : formatNumber(totals.projectCount), '#0f766e')}
        {renderSummaryCard('פרויקטים פעילים', loading ? '...' : formatNumber(totals.activeProjectCount), '#1d4ed8')}
        {renderSummaryCard('פעולות מתועדות', loading ? '...' : formatNumber(totals.activityCount), '#7c2d12')}
        {renderSummaryCard('שעות עבודה מדווחות', loading ? '...' : formatNumber(totals.weeklyHoursTotal), '#6d28d9')}
      </section>

      <div style={{
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '18px',
          flexWrap: 'wrap'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: '700', margin: 0 }}>משתמשים ונתוני שימוש</h3>
          </div>
          <span style={{ color: '#64748b', fontWeight: '600', fontSize: '0.92rem' }}>
            {loading ? 'טוען נתוני ניהול...' : `פעילות אחרונה: ${formatDateTime(totals.lastActivityAt)}`}
          </span>
        </div>

        {/* Search & Sort Bar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="חיפוש משתמשים"
              placeholder="חיפוש לפי אימייל..."
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                fontFamily: 'inherit',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="user-sort-select" style={{ color: '#475569', fontSize: '0.88rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
              מיון לפי:
            </label>
            <select
              id="user-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '11px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: 'white',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                fontWeight: '600',
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              <option value="lastActive">פעילות אחרונה</option>
              <option value="joinDateDesc">תאריך הצטרפות (החדשים ביותר)</option>
              <option value="joinDateAsc">תאריך הצטרפות (הוותיקים ביותר)</option>
              <option value="projectCount">כמות פרויקטים</option>
              <option value="email">לפי אימייל (א-ת)</option>
            </select>
          </div>

          {/* Column Visibility Picker */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsColumnPickerOpen(prev => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 14px',
                borderRadius: '8px',
                border: `1px solid ${isColumnPickerOpen ? '#4f46e5' : '#cbd5e1'}`,
                background: isColumnPickerOpen ? '#eef2ff' : '#ffffff',
                color: isColumnPickerOpen ? '#4338ca' : '#1e293b',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease'
              }}
              title="הצגת/הסתרת עמודות בטבלה"
            >
              <span>👁️</span>
              <span>התאמת עמודות ({visibleColumnCount}/{USER_TABLE_COLUMNS.length})</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>{isColumnPickerOpen ? '▲' : '▼'}</span>
            </button>

            {isColumnPickerOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                  onClick={() => setIsColumnPickerOpen(false)}
                />
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 101,
                  minWidth: '220px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  boxShadow: '0 12px 28px -6px rgba(15, 23, 42, 0.18), 0 4px 10px rgba(15, 23, 42, 0.08)',
                  padding: '12px',
                  direction: 'rtl'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>
                      הצגת/הסתרת עמודות
                    </span>
                    <button
                      type="button"
                      onClick={showAllColumns}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#4f46e5',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '4px'
                      }}
                      title="הצגת כל העמודות בטבלה"
                    >
                      הצג הכל
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {USER_TABLE_COLUMNS.map(col => {
                      const isChecked = visibleColumns[col.id] !== false;
                      const isRequired = col.required;
                      return (
                        <label
                          key={col.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            cursor: isRequired ? 'not-allowed' : 'pointer',
                            fontSize: '0.86rem',
                            color: isRequired ? '#64748b' : '#1e293b',
                            backgroundColor: isChecked ? '#f8fafc' : 'transparent',
                            userSelect: 'none',
                            transition: 'background-color 0.15s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRequired}
                            onChange={() => toggleColumn(col.id)}
                            style={{
                              cursor: isRequired ? 'not-allowed' : 'pointer',
                              accentColor: '#4f46e5',
                              width: '16px',
                              height: '16px'
                            }}
                          />
                          <span style={{ fontWeight: isChecked ? '600' : '400', flex: 1 }}>
                            {col.label}
                          </span>
                          {isRequired && (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>(נעול)</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {actionNotice && (
          <div style={{
            backgroundColor: actionNotice.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: actionNotice.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${actionNotice.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontWeight: '600',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{actionNotice.message}</span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'var(--priority-urgent-bg)',
            color: 'var(--priority-urgent-text)',
            padding: '14px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-muted)'
          }}>
            טוען רשימת משתמשים...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-muted)'
          }}>
            {searchTerm ? 'לא נמצאו משתמשים התואמים את החיפוש.' : 'אין משתמשים רשומים במערכת.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              minWidth: visibleColumnCount <= 2 ? '100%' : `${Math.max(650, visibleColumnCount * 180)}px`,
              borderCollapse: 'collapse',
              textAlign: 'right'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {visibleColumns.user !== false && (
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', width: visibleColumnCount === 1 ? '100%' : '25%' }}>משתמש</th>
                  )}
                  {visibleColumns.joinDate !== false && (
                    <th
                      style={{
                        padding: '12px 16px',
                        color: '#475569',
                        fontWeight: '700',
                        width: '16%',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      onClick={() => setSortBy(current => current === 'joinDateDesc' ? 'joinDateAsc' : 'joinDateDesc')}
                      title="לחץ/י למיון לפי תאריך הצטרפות"
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>תאריך הצטרפות</span>
                        <span style={{ fontSize: '0.8rem', opacity: sortBy.startsWith('joinDate') ? 1 : 0.4 }}>
                          {sortBy === 'joinDateDesc' ? '▼' : sortBy === 'joinDateAsc' ? '▲' : '⇅'}
                        </span>
                      </div>
                    </th>
                  )}
                  {visibleColumns.organization !== false && (
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', width: '13%' }}>ארגון</th>
                  )}
                  {visibleColumns.projectLoad !== false && (
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', width: '18%' }}>עומס פרויקטים</th>
                  )}
                  {visibleColumns.activity !== false && (
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', width: '17%' }}>פעילות ושימוש</th>
                  )}
                  {visibleColumns.actions !== false && (
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600', textAlign: 'center', width: '11%' }}>פעולות</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const stats = usageStats[user.uid] || {};
                  const effectiveLastSeen = getUserEffectiveActivityIso(user, stats);
                  const joinDate = getUserEffectiveJoinDate(user, stats);
                  const activityTone = getActivityTone(effectiveLastSeen);
                  return (
                    <tr
                      key={user.uid}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {visibleColumns.user !== false && (
                        <td style={{ padding: '16px', color: '#1e293b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flex: '0 0 42px',
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, #eef2ff, #ecfeff)',
                              border: '1px solid #c7d2fe',
                              color: '#3730a3',
                              fontWeight: '800'
                            }}>
                              {getInitials(user.email)}
                            </span>
                            <span style={{ minWidth: 0 }}>
                              <span style={{
                                display: 'block',
                                maxWidth: '220px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontWeight: '800',
                                color: '#0f172a'
                              }}>
                                {user.email || 'ללא אימייל'}
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '999px',
                                  background: activityTone.bg,
                                  color: activityTone.color,
                                  border: `1px solid ${activityTone.border}`,
                                  fontSize: '0.76rem',
                                  fontWeight: '700'
                                }}>
                                  {formatRelativeActivity(effectiveLastSeen)}
                                </span>
                                {isSystemAdminEmail(user.email) && (
                                  <span style={{
                                    display: 'inline-flex',
                                    fontSize: '0.74rem',
                                    backgroundColor: '#e0e7ff',
                                    color: '#4f46e5',
                                    padding: '3px 8px',
                                    borderRadius: '999px',
                                    fontWeight: '700'
                                  }}>מנהל מערכת</span>
                                )}
                              </div>
                              <span style={{
                                display: 'block',
                                color: '#64748b',
                                fontSize: '0.8rem',
                                marginTop: '6px',
                                lineHeight: 1.35
                              }}>
                                חיבור אחרון: {formatCompactDateTime(effectiveLastSeen)}
                              </span>
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.joinDate !== false && (
                        <td style={{ padding: '16px', color: '#1e293b', whiteSpace: 'nowrap' }}>
                          {joinDate ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }} title={`תאריך הצטרפות מלא: ${formatDateTime(joinDate)}`}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '1rem', lineHeight: 1 }}>📅</span>
                                <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                                  {formatJoinDate(joinDate)}
                                </strong>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', paddingRight: '22px' }}>
                                {formatJoinTime(joinDate) && <span>{formatJoinTime(joinDate)}</span>}
                                {formatJoinTime(joinDate) && <span>•</span>}
                                <span style={{ color: '#475569', fontWeight: '600' }}>{formatRelativeJoinDate(joinDate)}</span>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>לא ידוע</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.organization !== false && (
                        <td style={{ padding: '16px', color: '#475569' }}>
                          <select
                            value={user.organizationId || ''}
                            onChange={(event) => handleOrganizationChange(user.uid, event.target.value)}
                            disabled={savingOrganization === user.uid}
                            aria-label={`ארגון עבור ${user.email || user.uid}`}
                            style={{ minWidth: '150px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', fontFamily: 'inherit' }}
                          >
                            <option value="">-- ללא שיוך לארגון --</option>
                            {organizations.map(organization => (
                              <option key={organization.id} value={organization.id}>{organization.name}</option>
                            ))}
                          </select>
                        </td>
                      )}
                      {visibleColumns.projectLoad !== false && (
                        <td style={{ padding: '16px', color: '#475569' }}>
                          <div style={{ display: 'flex', borderSpacing: 0, justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
                            <strong style={{ color: '#0f172a', fontSize: '1.08rem' }}>{formatNumber(stats.projectCount)} פרויקטים</strong>
                            <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: '700' }}>
                              {stats.projectCount ? `${Math.round(((stats.activeProjectCount || 0) / stats.projectCount) * 100)}% פעילים` : 'אין פרויקטים'}
                            </span>
                          </div>
                          {renderProgressBar(stats.projectCount, maxProjectCount)}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                            {renderMetricPill('פעילים', formatNumber(stats.activeProjectCount), '#047857')}
                            {renderMetricPill('ארכיון', formatNumber(stats.archivedProjectCount), '#475569')}
                          </div>
                        </td>
                      )}
                      {visibleColumns.activity !== false && (
                        <td style={{ padding: '16px', color: '#475569' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                            {renderMetricPill('פעולות', formatNumber(stats.activityCount), '#7c2d12')}
                            {renderMetricPill('שעות', formatNumber(stats.weeklyHoursTotal), '#6d28d9')}
                          </div>
                          <div style={{ display: 'grid', gap: '5px', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.45 }}>
                            <span><strong style={{ color: '#334155' }}>עדכון פרויקט:</strong> {formatCompactDateTime(stats.lastProjectUpdatedAt)}</span>
                            <span><strong style={{ color: '#334155' }}>פעילות אחרונה:</strong> {formatCompactDateTime(stats.lastActivityAt || stats.lastProjectUpdatedAt || effectiveLastSeen)}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.actions !== false && (
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {!isSystemAdminEmail(user.email) ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => onImpersonate(
                                  user.uid,
                                  user.email,
                                  user.organizationId || '',
                                  user.organizationId ? (organizationById[user.organizationId]?.name || user.organizationId) : 'ללא ארגון'
                                )}
                                style={{
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  borderColor: '#3b82f6',
                                  fontWeight: '600',
                                  padding: '6px 12px',
                                  fontSize: '0.85rem'
                                }}
                              >
                                👁️ להתחזות ולערוך
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartDeleteUser(user)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: '#fff1f2',
                                  color: '#e11d48',
                                  border: '1px solid #fecdd3',
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                  padding: '6px 12px',
                                  fontSize: '0.85rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  fontFamily: 'inherit'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#ffe4e6';
                                  e.currentTarget.style.borderColor = '#fda4af';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fff1f2';
                                  e.currentTarget.style.borderColor = '#fecdd3';
                                }}
                                title="מחיקת משתמש לצמיתות מהמערכת"
                              >
                                🗑️ מחק משתמש
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
                              חשבון מנהל ראשי
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Prominent Delete Confirmation Modal */}
      {userPendingDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: '20px',
          direction: 'rtl'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '540px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '2px solid #fda4af',
            overflow: 'hidden',
            fontFamily: 'Rubik, sans-serif'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
              padding: '20px 24px',
              borderBottom: '1px solid #fecdd3',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#dc2626',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(220, 38, 38, 0.3)'
              }}>
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.28rem', fontWeight: '800' }}>
                  מחיקת משתמש לצמיתות מהמערכת
                </h3>
                <p style={{ margin: '4px 0 0', color: '#b91c1c', fontSize: '0.88rem' }}>
                  פעולה זו תמחק את כל נתוני המשתמש והיא בלתי הפיכה!
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* User summary card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '0.9rem'
                  }}>
                    {getInitials(userPendingDelete.email)}
                  </span>
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.05rem' }}>
                      {userPendingDelete.email || 'ללא אימייל'}
                    </strong>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#64748b', fontSize: '0.84rem', marginTop: '3px', flexWrap: 'wrap' }}>
                      <span>ארגון: {userPendingDelete.organizationId ? (organizationById[userPendingDelete.organizationId]?.name || userPendingDelete.organizationId) : 'ללא ארגון'}</span>
                      <span>•</span>
                      <span>הצטרף/ה: {formatJoinDate(getUserEffectiveJoinDate(userPendingDelete, usageStats[userPendingDelete.uid]))}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {renderMetricPill('פרויקטים שיימחקו', formatNumber(usageStats[userPendingDelete.uid]?.projectCount || 0), '#dc2626')}
                  {renderMetricPill('פעולות מתועדות', formatNumber(usageStats[userPendingDelete.uid]?.activityCount || 0), '#7c2d12')}
                  {renderMetricPill('שעות עבודה', formatNumber(usageStats[userPendingDelete.uid]?.weeklyHoursTotal || 0), '#6d28d9')}
                </div>
              </div>

              {/* Warning Alert Box */}
              <div style={{
                background: '#fff5f5',
                border: '1px solid #fed7d7',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '20px',
                color: '#9b2c2c',
                fontSize: '0.9rem',
                lineHeight: 1.55
              }}>
                <strong>🚨 שים/י לב:</strong>
                <ul style={{ margin: '6px 0 0', paddingRight: '20px' }}>
                  <li>חשבון המשתמש יימחק לחלוטין ממאגר המערכת.</li>
                  <li>כל הפרויקטים, המשימות, ההערות, התגובות, הספקים ואנשי הקשר של המשתמש יימחקו <strong>לצמיתות</strong>.</li>
                  <li>לא ניתן יהיה לשחזר את הנתונים לאחר ביצוע הפעולה.</li>
                </ul>
              </div>

              {/* Confirmation Input Field */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontWeight: '700', color: '#1e293b', fontSize: '0.92rem', marginBottom: '8px' }}>
                  לאישור המחיקה, נא להקליד את המילה <span style={{ color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>מחק</span> בשדה הבא:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  placeholder="הקלד/י 'מחק' כאן..."
                  disabled={isDeletingUser}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: `2px solid ${deleteConfirmationInput.trim() === 'מחק' ? '#dc2626' : '#cbd5e1'}`,
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    backgroundColor: deleteConfirmationInput.trim() === 'מחק' ? '#fff1f2' : '#ffffff',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              background: '#f8fafc',
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelDeleteUser}
                disabled={isDeletingUser}
                style={{ minWidth: '100px', padding: '10px 18px', fontWeight: '600' }}
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={deleteConfirmationInput.trim() !== 'מחק' || isDeletingUser}
                style={{
                  minWidth: '180px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: deleteConfirmationInput.trim() === 'מחק' && !isDeletingUser ? '#dc2626' : '#fca5a5',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: deleteConfirmationInput.trim() === 'מחק' && !isDeletingUser ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: deleteConfirmationInput.trim() === 'מחק' && !isDeletingUser ? '0 4px 12px rgba(220, 38, 38, 0.35)' : 'none',
                  fontFamily: 'inherit'
                }}
              >
                {isDeletingUser ? '⏳ מוחק משתמש ונתונים...' : '🗑️ כן, מחק משתמש לצמיתות'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Organization Confirmation Modal */}
      {orgPendingDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px',
          direction: 'rtl',
          fontFamily: 'Rubik, sans-serif'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #fee2e2',
            animation: 'fadeIn 0.15s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              background: '#fef2f2',
              borderBottom: '1px solid #fecaca',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0,
                border: '2px solid #fca5a5'
              }}>
                🗑️
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.28rem', fontWeight: '800' }}>
                  מחיקת ארגון מהמערכת
                </h3>
                <p style={{ margin: '4px 0 0', color: '#b91c1c', fontSize: '0.88rem' }}>
                  הארגון יימחק והמשתמשים שבו ינותקו משיוך
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '18px'
              }}>
                <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.1rem', marginBottom: '6px' }}>
                  {orgPendingDelete.name}
                </strong>
                <span style={{ color: '#64748b', fontSize: '0.86rem' }}>
                  מזהה: {orgPendingDelete.id} • חברים: {users.filter(u => u.organizationId === orgPendingDelete.id).length} משתמשים
                </span>
              </div>

              {/* Warning Alert Box */}
              <div style={{
                background: '#fff5f5',
                border: '1px solid #fed7d7',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '20px',
                color: '#9b2c2c',
                fontSize: '0.9rem',
                lineHeight: 1.55
              }}>
                <strong>🚨 שים/י לב:</strong>
                <ul style={{ margin: '6px 0 0', paddingRight: '20px' }}>
                  <li>הארגון יימחק לצמיתות מרשימת הארגונים וההגדרות שלו יוסרו.</li>
                  <li>כל המשתמשים שהיו משויכים לארגון זה יישארו במערכת אך יוגדרו כ<strong>ללא ארגון</strong> עד שיוך מחדש.</li>
                </ul>
              </div>

              {/* Confirmation Input Field */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontWeight: '700', color: '#1e293b', fontSize: '0.92rem', marginBottom: '8px' }}>
                  לאישור המחיקה, נא להקליד את המילה <span style={{ color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>מחק</span> בשדה הבא:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={deleteOrgConfirmationInput}
                  onChange={(e) => setDeleteOrgConfirmationInput(e.target.value)}
                  placeholder="הקלד/י 'מחק' כאן..."
                  disabled={isDeletingOrg}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: `2px solid ${deleteOrgConfirmationInput.trim() === 'מחק' ? '#dc2626' : '#cbd5e1'}`,
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    backgroundColor: deleteOrgConfirmationInput.trim() === 'מחק' ? '#fff1f2' : '#ffffff',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              background: '#f8fafc',
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelDeleteOrganization}
                disabled={isDeletingOrg}
                style={{ minWidth: '100px', padding: '10px 18px', fontWeight: '600' }}
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrganization}
                disabled={deleteOrgConfirmationInput.trim() !== 'מחק' || isDeletingOrg}
                style={{
                  minWidth: '160px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: deleteOrgConfirmationInput.trim() === 'מחק' && !isDeletingOrg ? '#dc2626' : '#fca5a5',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: deleteOrgConfirmationInput.trim() === 'מחק' && !isDeletingOrg ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: deleteOrgConfirmationInput.trim() === 'מחק' && !isDeletingOrg ? '0 4px 12px rgba(220, 38, 38, 0.35)' : 'none',
                  fontFamily: 'inherit'
                }}
              >
                {isDeletingOrg ? '⏳ מוחק ארגון...' : '🗑️ כן, מחק ארגון'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test / Preview Payment Modal */}
      {testPaymentOrg && (
        <PaymentModal
          isOpen={Boolean(testPaymentOrg)}
          onClose={() => setTestPaymentOrg(null)}
          organization={testPaymentOrg}
          user={{ uid: 'admin-preview', email: 'shaharsolutions@gmail.com', displayName: 'מנהל מערכת' }}
          amount={paymentConfig.reopenPrice}
          onPaymentSuccess={() => {
            loadPayments();
          }}
        />
      )}

      {/* Reset Payment Log Confirmation Modal (HTML Modal) */}
      {showClearPaymentsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            padding: '20px',
            direction: 'rtl',
            fontFamily: 'Rubik, sans-serif'
          }}
          onClick={handleCloseClearPaymentsModal}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '2px solid #fda4af',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
              padding: '18px 24px',
              borderBottom: '1px solid #fecdd3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#dc2626',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(220, 38, 38, 0.25)'
                }}>
                  🗑️
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.24rem', fontWeight: '800' }}>
                    איפוס יומן תשלומים
                  </h3>
                  <p style={{ margin: '3px 0 0', color: '#b91c1c', fontSize: '0.84rem' }}>
                    מחיקת היסטוריית עסקאות מהמערכת
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseClearPaymentsModal}
                disabled={clearingPayments}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.6rem',
                  cursor: clearingPayments ? 'not-allowed' : 'pointer',
                  color: '#991b1b',
                  lineHeight: 1,
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
                title="סגור חלון"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <div style={{
                background: '#fff5f5',
                border: '1px solid #fed7d7',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '18px',
                color: '#9b2c2c',
                fontSize: '0.92rem',
                lineHeight: '1.6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '800', fontSize: '1rem', color: '#991b1b' }}>
                  <span>⚠️</span>
                  <span>האם אתה בטוח שברצונך לאפס את יומן התשלומים?</span>
                </div>
                <p style={{ margin: '0 0 10px 0' }}>
                  פעולה זו תמחק לצמיתות את כל <strong>{paymentRecords.length}</strong> הרשומות מיומן התשלומים.
                </p>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  color: '#b91c1c'
                }}>
                  🚨 <strong>שים/י לב:</strong> פעולה זו הינה בלתי הפיכה. נתוני התשלומים, מספרי העסקאות וקודי האישור יימחקו ממאגר הנתונים ולא יהיו ניתנים לשחזור.
                </div>
              </div>

              {clearPaymentsError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  marginBottom: '14px',
                  border: '1px solid #f87171'
                }}>
                  {clearPaymentsError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              background: '#f8fafc',
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseClearPaymentsModal}
                disabled={clearingPayments}
                style={{ minWidth: '100px', padding: '10px 18px', fontWeight: '600' }}
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmClearPayments}
                disabled={clearingPayments}
                style={{
                  minWidth: '160px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: clearingPayments ? '#fca5a5' : '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: clearingPayments ? 'not-allowed' : 'pointer',
                  boxShadow: clearingPayments ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.35)',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                {clearingPayments ? '⏳ מאפס יומן...' : '🗑️ כן, אפס יומן'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
