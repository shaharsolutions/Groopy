import { useMemo, useState, useEffect } from 'react';
import { APP_VERSIONS, DEFAULT_APP_VERSION, getFeatureFlags } from '../utils/featureFlags';

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
          backfillUserCreatedAtIfMissing
        } = await loadStorageApi();
        const [usersList, statsByUser, organizationsList] = await Promise.all([
          getAllUsers(),
          getUserManagementStats(),
          getOrganizations()
        ]);
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
    const members = users.filter(user => (user.organizationId || 'groopy') === organization.id);
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
      const { assignUserToOrganization, migrateUserDataToOrganization } = await loadStorageApi();
      await assignUserToOrganization(userId, nextOrganizationId);
      await migrateUserDataToOrganization(userId, nextOrganizationId);
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
    if (organization.id === 'groopy') return;
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
                      {organization.id === 'groopy' ? (
                        <span style={{ color: '#4338ca', fontSize: '0.78rem', fontWeight: '800' }}>ארגון ברירת מחדל</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleToggleOrganization(organization)}
                          disabled={savingOrganization === `status:${organization.id}`}
                          style={{ padding: '6px 10px', fontSize: '0.8rem', color: isActive ? '#b45309' : '#166534' }}
                        >
                          {isActive ? 'השבתת ארגון' : 'הפעלת ארגון'}
                        </button>
                      )}
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
                                {user.email === 'shaharsolutions@gmail.com' && (
                                  <span style={{
                                    display: 'inline-flex',
                                    fontSize: '0.74rem',
                                    backgroundColor: '#e0e7ff',
                                    color: '#4f46e5',
                                    padding: '3px 8px',
                                    borderRadius: '999px',
                                    fontWeight: '700'
                                  }}>אני (מנהל)</span>
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
                            value={user.organizationId || 'groopy'}
                            onChange={(event) => handleOrganizationChange(user.uid, event.target.value)}
                            disabled={savingOrganization === user.uid}
                            aria-label={`ארגון עבור ${user.email || user.uid}`}
                            style={{ minWidth: '150px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', fontFamily: 'inherit' }}
                          >
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
                          {user.email !== 'shaharsolutions@gmail.com' ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => onImpersonate(
                                  user.uid,
                                  user.email,
                                  user.organizationId || 'groopy',
                                  organizationById[user.organizationId || 'groopy']?.name || 'Groopy'
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
                      <span>ארגון: {organizationById[userPendingDelete.organizationId || 'groopy']?.name || 'Groopy'}</span>
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
    </div>
  );
}
