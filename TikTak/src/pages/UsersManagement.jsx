import { useMemo, useState, useEffect } from 'react';

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
    description: 'ניהול סטטוסים, סוגי עבודה והעדפות מערכת'
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
  const [relativeNow, setRelativeNow] = useState(0);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        setError('');
        const { getAllUsers, getUserManagementStats, getOrganizations } = await loadStorageApi();
        const [usersList, statsByUser, organizationsList] = await Promise.all([
          getAllUsers(),
          getUserManagementStats(),
          getOrganizations()
        ]);
        // Sort by lastLogin descending
        usersList.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
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
      summary.projectCount += stats.projectCount || 0;
      summary.activeProjectCount += stats.activeProjectCount || 0;
      summary.activityCount += stats.activityCount || 0;
      if (stats.lastActivityAt && new Date(stats.lastActivityAt) > new Date(summary.lastActivityAt || 0)) {
        summary.lastActivityAt = stats.lastActivityAt;
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

  const totals = useMemo(() => {
    return users.reduce((acc, user) => {
      const stats = usageStats[user.uid] || {};
      acc.projectCount += stats.projectCount || 0;
      acc.activeProjectCount += stats.activeProjectCount || 0;
      acc.weeklyHoursTotal += stats.weeklyHoursTotal || 0;
      acc.activityCount += stats.activityCount || 0;
      if (stats.lastActivityAt && new Date(stats.lastActivityAt) > new Date(acc.lastActivityAt || 0)) {
        acc.lastActivityAt = stats.lastActivityAt;
      }
      return acc;
    }, { projectCount: 0, activeProjectCount: 0, activityCount: 0, weeklyHoursTotal: 0, lastActivityAt: '' });
  }, [users, usageStats]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    return users.filter(user =>
      (user.email || '').toLowerCase().includes(normalizedSearch)
    );
  }, [users, searchTerm]);

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
                          <span style={{ display: 'inline-block', marginTop: '7px', padding: '4px 8px', borderRadius: '999px', background: isActive ? '#dcfce7' : '#e2e8f0', color: isActive ? '#166534' : '#475569', fontSize: '0.77rem', fontWeight: '800' }}>
                            {isActive ? 'ארגון פעיל' : 'ארגון לא פעיל'}
                          </span>
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
                      ['פרויקטים', organization.projectCount],
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
                        ⚙️ הגדרות עבודה
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

        {/* Search Bar */}
        <div style={{ marginBottom: '24px' }}>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="חיפוש משתמשים"
            placeholder="חיפוש לפי אימייל..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '1rem',
              outline: 'none',
              fontFamily: 'inherit',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
            }}
          />
        </div>

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
              minWidth: '1080px',
              borderCollapse: 'collapse',
              textAlign: 'right'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', width: '33%' }}>משתמש</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700' }}>ארגון</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', width: '28%' }}>עומס פרויקטים</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', width: '27%' }}>פעילות ושימוש</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600', textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const stats = usageStats[user.uid] || {};
                  const activityTone = getActivityTone(stats.lastActivityAt || user.lastLogin);
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
                              maxWidth: '260px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: '800',
                              color: '#0f172a'
                            }}>
                              {user.email || 'ללא אימייל'}
                            </span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '7px',
                              padding: '4px 8px',
                              borderRadius: '999px',
                              background: activityTone.bg,
                              color: activityTone.color,
                              border: `1px solid ${activityTone.border}`,
                              fontSize: '0.78rem',
                              fontWeight: '700'
                            }}>
                              {formatRelativeActivity(stats.lastActivityAt || user.lastLogin)}
                            </span>
                            {user.email === 'shaharsolutions@gmail.com' && (
                              <span style={{
                                display: 'inline-flex',
                                marginRight: '8px',
                                fontSize: '0.75rem',
                                backgroundColor: '#e0e7ff',
                                color: '#4f46e5',
                                padding: '4px 8px',
                                borderRadius: '999px',
                                fontWeight: '700'
                              }}>אני (מנהל)</span>
                            )}
                            <span style={{
                              display: 'block',
                              color: '#64748b',
                              fontSize: '0.82rem',
                              marginTop: '7px',
                              lineHeight: 1.35
                            }}>
                              חיבור אחרון: {formatCompactDateTime(user.lastLogin)}
                            </span>
                          </span>
                        </div>
                      </td>
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
                      <td style={{ padding: '16px', color: '#475569' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
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
                      <td style={{ padding: '16px', color: '#475569' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                          {renderMetricPill('פעולות', formatNumber(stats.activityCount), '#7c2d12')}
                          {renderMetricPill('שעות', formatNumber(stats.weeklyHoursTotal), '#6d28d9')}
                        </div>
                        <div style={{ display: 'grid', gap: '5px', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.45 }}>
                          <span><strong style={{ color: '#334155' }}>עדכון פרויקט:</strong> {formatCompactDateTime(stats.lastProjectUpdatedAt)}</span>
                          <span><strong style={{ color: '#334155' }}>פעילות אחרונה:</strong> {formatCompactDateTime(stats.lastActivityAt)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {user.email !== 'shaharsolutions@gmail.com' ? (
                          <button
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
                              padding: '6px 14px',
                              fontSize: '0.9rem'
                            }}
                          >
                            👁️ להתחזות ולערוך
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>אין אפשרות להתחזות לעצמך</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
