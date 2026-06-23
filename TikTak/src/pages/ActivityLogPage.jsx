import { useEffect, useMemo, useState } from 'react';
import { getActivityLogs, getAllUsers } from '../utils/storage';

const TARGET_TYPE_LABELS = {
  task: 'עבודה',
  comment: 'תגובה',
  settings: 'הגדרות',
  supplier: 'ספק',
  contact: 'איש קשר',
  user: 'משתמש'
};

const formatDateTime = (isoString) => {
  if (!isoString) return 'לא ידוע';
  try {
    return new Date(isoString).toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
};

const getDateOnly = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export default function ActivityLogPage({ currentUserId, currentUserEmail, isSystemAdmin, onBack }) {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    actorUid: '',
    action: '',
    targetType: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      try {
        setLoading(true);
        setError('');
        const [activityLogs, usersList] = await Promise.all([
          getActivityLogs({ isSystemAdmin, actorUid: currentUserId }),
          isSystemAdmin ? getAllUsers() : Promise.resolve([])
        ]);
        if (cancelled) return;
        setLogs(activityLogs);
        setUsers(usersList.sort((a, b) => (a.email || '').localeCompare(b.email || '', 'he')));
      } catch (err) {
        console.error('Failed to load activity log', err);
        if (!cancelled) setError('שגיאה בטעינת יומן הפעולות. נסו לרענן את המסך.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadActivity();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, isSystemAdmin]);

  const userEmailByUid = useMemo(() => {
    const map = new Map(users.map(user => [user.uid, user.email]));
    if (currentUserId && currentUserEmail) map.set(currentUserId, currentUserEmail);
    logs.forEach(log => {
      if (log.actorUid && log.actorEmail) map.set(log.actorUid, log.actorEmail);
    });
    return map;
  }, [users, logs, currentUserId, currentUserEmail]);

  const uniqueActions = useMemo(() => {
    const actionMap = new Map();
    logs.forEach(log => {
      if (log.action) actionMap.set(log.action, log.actionLabel || log.action);
    });
    return Array.from(actionMap.entries()).sort((a, b) => a[1].localeCompare(b[1], 'he'));
  }, [logs]);

  const uniqueTargetTypes = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.targetType).filter(Boolean)))
      .sort((a, b) => (TARGET_TYPE_LABELS[a] || a).localeCompare(TARGET_TYPE_LABELS[b] || b, 'he'));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return logs.filter(log => {
      if (filters.actorUid && log.actorUid !== filters.actorUid) return false;
      if (filters.action && log.action !== filters.action) return false;
      if (filters.targetType && log.targetType !== filters.targetType) return false;

      const dateOnly = getDateOnly(log.createdAt);
      if (filters.dateFrom && dateOnly < filters.dateFrom) return false;
      if (filters.dateTo && dateOnly > filters.dateTo) return false;

      if (!search) return true;
      const haystack = [
        log.actorEmail,
        log.actionLabel,
        log.targetLabel,
        log.details,
        TARGET_TYPE_LABELS[log.targetType],
        log.targetId
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }, [logs, filters]);

  const resetFilters = () => {
    setFilters({
      search: '',
      actorUid: '',
      action: '',
      targetType: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <main className="dashboard-container activity-log-page">
      <div className="activity-log-header">
        <div>
          <h2>יומן פעולות</h2>
          <p>
            {isSystemAdmin
              ? 'צפייה בכלל הפעולות שבוצעו במערכת וסינון לפי משתמש, סוג פעולה ותאריך.'
              : 'כאן מוצגות הפעולות שביצעת במערכת בלבד.'}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          📋 חזרה ללוח המשימות
        </button>
      </div>

      <section className="activity-filters" aria-label="סינון יומן פעולות">
        <div className="form-group">
          <label className="form-label">חיפוש חופשי</label>
          <input
            type="text"
            className="form-control"
            placeholder="חיפוש לפי פעולה, פריט, משתמש או מזהה"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>

        {isSystemAdmin && (
          <div className="form-group">
            <label className="form-label">משתמש מבצע</label>
            <select
              className="form-control"
              value={filters.actorUid}
              onChange={(e) => setFilters(prev => ({ ...prev, actorUid: e.target.value }))}
            >
              <option value="">כל המשתמשים</option>
              {Array.from(userEmailByUid.entries()).map(([uid, email]) => (
                <option key={uid} value={uid}>{email || uid}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">סוג פעולה</label>
          <select
            className="form-control"
            value={filters.action}
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
          >
            <option value="">כל הפעולות</option>
            {uniqueActions.map(([action, label]) => (
              <option key={action} value={action}>{label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">אזור במערכת</label>
          <select
            className="form-control"
            value={filters.targetType}
            onChange={(e) => setFilters(prev => ({ ...prev, targetType: e.target.value }))}
          >
            <option value="">כל האזורים</option>
            {uniqueTargetTypes.map(type => (
              <option key={type} value={type}>{TARGET_TYPE_LABELS[type] || type}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">מתאריך</label>
          <input
            type="date"
            className="form-control"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">עד תאריך</label>
          <input
            type="date"
            className="form-control"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
          />
        </div>

        {hasActiveFilters && (
          <button type="button" className="btn btn-secondary activity-clear-filters" onClick={resetFilters}>
            ניקוי מסננים
          </button>
        )}
      </section>

      <div className="activity-summary">
        מציג <strong>{filteredLogs.length}</strong> מתוך <strong>{logs.length}</strong> פעולות
      </div>

      {error && <div className="activity-error">{error}</div>}

      {loading ? (
        <div className="empty-state">טוען יומן פעולות...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <div className="empty-state-title">אין פעולות להצגה</div>
          <div className="empty-state-text">פעולות חדשות שתבצעו במערכת יופיעו כאן לאחר השמירה.</div>
        </div>
      ) : (
        <div className="table-container activity-table-container">
          <table className="task-table activity-table">
            <thead>
              <tr>
                <th>מועד</th>
                {isSystemAdmin && <th>משתמש</th>}
                <th>פעולה</th>
                <th>אזור</th>
                <th>פריט</th>
                <th>פירוט</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAt)}</td>
                  {isSystemAdmin && <td>{log.actorEmail || userEmailByUid.get(log.actorUid) || log.actorUid}</td>}
                  <td><span className="activity-action-pill">{log.actionLabel || log.action}</span></td>
                  <td>{TARGET_TYPE_LABELS[log.targetType] || log.targetType || '-'}</td>
                  <td>
                    <div className="activity-target-label">{log.targetLabel || '-'}</div>
                    {log.targetId && <div className="activity-target-id">{log.targetId}</div>}
                  </td>
                  <td>{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
