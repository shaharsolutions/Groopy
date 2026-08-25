import { useEffect, useMemo, useState } from 'react';
import { getActivityLogs, getAllUsers, getNameMap } from '../utils/storage';
import { getFeatureFlags } from '../utils/featureFlags';

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

export default function ActivityLogPage({ currentUserId, currentUserEmail, organizationId, isSystemAdmin, onBack, initialSearchQuery, onClearSearchQuery, settings }) {
  const flags = getFeatureFlags(settings);
  const targetTypeLabels = useMemo(() => ({
    task: flags.terms.item,
    comment: 'תגובה',
    settings: 'הגדרות',
    supplier: 'ספק',
    contact: 'איש קשר',
    user: 'משתמש'
  }), [flags.terms.item]);

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    queueMicrotask(() => setCurrentPage(1));
  }, [filters]);

  useEffect(() => {
    if (initialSearchQuery !== null && initialSearchQuery !== undefined) {
      queueMicrotask(() => {
        setFilters(prev => ({ ...prev, search: initialSearchQuery }));
        if (onClearSearchQuery) onClearSearchQuery();
      });
    }
  }, [initialSearchQuery, onClearSearchQuery]);


  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      try {
        setLoading(true);
        setError('');
        const [activityLogs, usersList, nameMap] = await Promise.all([
          getActivityLogs({ isSystemAdmin, actorUid: currentUserId, organizationId }),
          isSystemAdmin ? getAllUsers() : Promise.resolve([]),
          getNameMap(currentUserId, isSystemAdmin)
        ]);
        if (cancelled) return;

        const replaceIdsWithNames = (text, mapping) => {
          if (!text) return '';
          return text.replace(/\b[a-zA-Z0-9]{20,28}\b/g, (match) => {
            if (mapping[match]) {
              return `"${mapping[match]}"`;
            }
            return match.length === 28 ? 'משתמש לא ידוע' : 'פריט שלא נמצא';
          });
        };

        const translateEnglishDetailsToHebrew = (text) => {
          if (!text) return '';
          let result = text;

          // Translate system field names
          const FIELD_TRANSLATIONS = {
            title: `שם ${flags.terms.item}`,
            description: 'תיאור',
            workType: `סוג ${flags.terms.item}`,
            storeName: 'חנות',
            supplierName: 'ספק',
            contactPerson: 'איש קשר',
            importManager: 'מנהל יבוא',
            status: 'סטטוס',
            priority: 'עדיפות',
            deadline: 'דדליין',
            driveLink: 'קישור דרייב',
            supplierContactEmail: 'אימייל ספק',
            diecutsStatus: 'סטטוס שטנצים',
            imagesStatus: 'סטטוס תמונות',
            standardsInstituteRequired: 'מכון תקנים',
            planogramFile: 'פלנוגרמה',
            workOrderFiles: 'קבצים',
            subtasks: 'תתי משימות',
            attachments: 'קבצים מצורפים',
            internalNotes: 'הערות פנימיות',
            updatedAt: 'עודכן ב',
            createdAt: 'נוצר ב',
            userId: 'מזהה משתמש'
          };

          // Translate system values/statuses
          const VALUE_TRANSLATIONS = {
            low: 'נמוכה',
            medium: 'בינונית',
            high: 'גבוהה',
            urgent: 'דחופה',
            new: 'חדש',
            'in progress': 'בטיפול',
            'sent to supplier': 'נשלח לספק',
            'approved by supplier': 'אושר לספק',
            archive: 'ארכיון',
            active: 'פעיל',
            deleted: 'נמחק'
          };

          // Translate keys
          Object.entries(FIELD_TRANSLATIONS).forEach(([eng, heb]) => {
            const regex = new RegExp(`\\b${eng}\\b`, 'g');
            result = result.replace(regex, heb);
          });

          // Translate values
          Object.entries(VALUE_TRANSLATIONS).forEach(([eng, heb]) => {
            const regex = new RegExp(`\\b${eng}\\b`, 'gi');
            result = result.replace(regex, heb);
          });

          return result;
        };

        const transformedLogs = activityLogs.map(log => {
          const resolvedTargetLabel = log.targetLabel || (log.targetId ? nameMap[log.targetId] : '');
          let resolvedDetails = replaceIdsWithNames(log.details, nameMap);
          resolvedDetails = translateEnglishDetailsToHebrew(resolvedDetails);
          return {
            ...log,
            targetLabel: resolvedTargetLabel,
            details: resolvedDetails
          };
        });

        setLogs(transformedLogs);
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
  }, [currentUserId, organizationId, isSystemAdmin]);

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
        targetTypeLabels[log.targetType]
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }, [logs, filters, targetTypeLabels]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const leftBound = Math.max(2, currentPage - 1);
      const rightBound = Math.min(totalPages - 1, currentPage + 1);
      
      pages.push(1);
      
      if (leftBound > 2) {
        pages.push('...');
      }
      
      let start = leftBound;
      let end = rightBound;
      if (currentPage <= 3) {
        end = 4;
      }
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    return pages;
  };

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
              <option key={type} value={type}>{targetTypeLabels[type] || type}</option>
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
        <>
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
              {paginatedLogs.map(log => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAt)}</td>
                  {isSystemAdmin && <td>{log.actorEmail || userEmailByUid.get(log.actorUid) || log.actorUid}</td>}
                  <td><span className="activity-action-pill">{log.actionLabel || log.action}</span></td>
                  <td>{targetTypeLabels[log.targetType] || log.targetType || '-'}</td>
                  <td>
                    <div className="activity-target-label">{log.targetLabel || '-'}</div>
                  </td>
                  <td>{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-info">
              מציג רשומות <strong>{Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)}–{Math.min(filteredLogs.length, currentPage * itemsPerPage)}</strong> מתוך <strong>{filteredLogs.length}</strong>
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                title="לעמוד הראשון"
              >
                ראשון
              </button>
              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                title="לעמוד הקודם"
              >
                קודם
              </button>
              
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>;
                }
                return (
                  <button
                    key={page}
                    type="button"
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                title="לעמוד הבא"
              >
                הבא
              </button>
              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="לעמוד האחרון"
              >
                אחרון
              </button>
            </div>
          </div>
        )}
        </>
      )}
    </main>
  );
}
