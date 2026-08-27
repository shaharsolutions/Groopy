import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { getBoardStatusConfig } from '../utils/boardStatusHelper';
import { getFeatureFlags } from '../utils/featureFlags';
const ExternalDetailsModal = lazy(() => import('../components/ExternalDetailsModal'));
import PlanogramIndicator from '../components/PlanogramIndicator';

let storageApiPromise = null;

const loadStorageApi = () => {
  storageApiPromise ??= import('../utils/storage');
  return storageApiPromise;
};

const SORT_PREFERENCE_KEY = 'tiktak_external_sort_preference';
const SORT_MODES = new Set(['default', 'status', 'title', 'contactPerson']);

const readSortPreference = () => {
  try {
    const savedPreference = JSON.parse(localStorage.getItem(SORT_PREFERENCE_KEY) || '{}');
    return {
      mode: SORT_MODES.has(savedPreference.mode) ? savedPreference.mode : 'default',
      direction: savedPreference.direction === 'desc' ? 'desc' : 'asc'
    };
  } catch {
    return { mode: 'default', direction: 'asc' };
  }
};

const saveSortPreference = (mode, direction) => {
  try {
    localStorage.setItem(SORT_PREFERENCE_KEY, JSON.stringify({ mode, direction }));
  } catch (err) {
    console.warn('Could not store sort preference locally', err);
  }
};

export default function ExternalDashboard({ settings, userId, organizationId, autoOpenTaskId, onClearAutoOpen }) {
  const {
    statuses: STATUSES = [],
    statusColors: STATUS_CLASSES = {}
  } = settings || {};
  const flags = getFeatureFlags(settings);
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  
  // Search, Filter and Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortMode, setSortMode] = useState(() => readSortPreference().mode);
  const [sortDirection, setSortDirection] = useState(() => readSortPreference().direction);

  // Selected task for modal view
  const [viewingTask, setViewingTask] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const initTasks = async () => {
      const { getTasks, getContacts } = await loadStorageApi();
      const [fetchedTasks, fetchedContacts] = await Promise.all([
        getTasks(userId),
        getContacts(userId)
      ]);
      if (cancelled) return;
      setTasks(fetchedTasks || []);
      setContacts(fetchedContacts || []);
      
      const params = new URLSearchParams(window.location.search);
      const urlTaskId = params.get('taskId');
      if (urlTaskId) {
        const taskToOpen = fetchedTasks.find(t => t.id === urlTaskId);
        if (taskToOpen) {
          setViewingTask(taskToOpen);
        }
      }
    };
    initTasks();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Listen to autoOpenTaskId from global search to open the details modal
  useEffect(() => {
    if (autoOpenTaskId && tasks.length > 0) {
      const taskToOpen = tasks.find(t => t.id === autoOpenTaskId);
      if (taskToOpen) {
        queueMicrotask(() => {
          setViewingTask(taskToOpen);
          if (onClearAutoOpen) onClearAutoOpen();
        });
      }
    }
  }, [autoOpenTaskId, tasks, onClearAutoOpen]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search query filter (title, supplierContact)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => 
        (t.title && t.title.toLowerCase().includes(q)) ||
        ((t.contactPerson || t.supplierContactName) && (t.contactPerson || t.supplierContactName).toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(t => t.status === statusFilter);
    }

    // Sorting logic
    if (sortMode !== 'default') {
      const statusOrder = new Map(STATUSES.map((status, index) => [status, index]));
      const direction = sortDirection === 'asc' ? 1 : -1;

      result.sort((a, b) => {
        let comparison = 0;
        if (sortMode === 'status') {
          comparison = (statusOrder.get(a.status) ?? 999) - (statusOrder.get(b.status) ?? 999);
        } else if (sortMode === 'contactPerson') {
          const contactA = a.contactPerson || a.supplierContactName || '';
          const contactB = b.contactPerson || b.supplierContactName || '';
          comparison = contactA.localeCompare(contactB, 'he', { sensitivity: 'base', numeric: true });
        } else if (sortMode === 'title') {
          comparison = (a.title || '').localeCompare(b.title || '', 'he', { sensitivity: 'base', numeric: true });
        }

        if (comparison !== 0) return comparison * direction;
        return (a.title || '').localeCompare(b.title || '', 'he', { sensitivity: 'base' });
      });
    } else {
      // Default sort by updatedAt descending so the latest modified shows first
      result.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }

    return result;
  }, [tasks, searchQuery, statusFilter, sortMode, sortDirection, STATUSES]);

  const handleSort = (column) => {
    const nextDirection = sortMode === column
      ? (sortDirection === 'asc' ? 'desc' : 'asc')
      : 'asc';
    setSortMode(column);
    setSortDirection(nextDirection);
    saveSortPreference(column, nextDirection);
  };

  const getAriaSort = (column) => {
    if (sortMode !== column) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortableHeader = (column, label) => (
    <th aria-sort={getAriaSort(column)}>
      <button
        type="button"
        className={`sortable-header ${sortMode === column ? 'active' : ''}`}
        onClick={() => handleSort(column)}
        title={`מיון לפי ${label}`}
      >
        <span>{label}</span>
        <span className="sort-indicator" aria-hidden="true">
          {sortMode === column ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );

  const statusCounts = useMemo(() => {
    const counts = new Map();
    tasks.forEach(task => {
      counts.set(task.status, (counts.get(task.status) || 0) + 1);
    });
    return counts;
  }, [tasks]);

  const handleCellClick = (task, e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.btn') || e.target.closest('a')) {
      return;
    }
    setViewingTask(task);
  };

  const params = new URLSearchParams(window.location.search);
  const urlTaskId = params.get('taskId');

  if (urlTaskId) {
    const taskExists = tasks.some(t => t.id === urlTaskId);
    if (tasks.length > 0 && !taskExists) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '16px' }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <h3>הפרויקט לא נמצא</h3>
          <p style={{ color: 'var(--text-muted)' }}>ייתכן שהפרויקט נמחק או שהקישור אינו תקין.</p>
        </div>
      );
    }
    if (!viewingTask) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'var(--text-muted)' }}>
          טוען פרויקט...
        </div>
      );
    }
    return (
      <main className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '24px 0' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--text-muted)', fontFamily: 'Rubik, sans-serif' }}>
            טוען פרטי {flags.terms.item}...
          </div>
        }>
          <ExternalDetailsModal 
            task={viewingTask}
            settings={settings}
            onClose={null}
            isSingleProjectView={true}
            userId={userId}
            organizationId={organizationId}
          />
        </Suspense>
      </main>
    );
  }

  return (
    <main className="dashboard-container">
      
      {/* Upper Actions Panel */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>מצב צפייה לשותפים</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          צפייה בלבד בסטטוס {flags.terms.items} ובקבצים המצורפים.
        </p>
      </div>

      {/* Status Filter Chips */}
      <div className="status-chips-container">
        <button 
          type="button" 
          className={`status-chip ${statusFilter === '' ? 'active' : ''}`}
          onClick={() => setStatusFilter('')}
        >
          הכל <span className="chip-count">{tasks.length}</span>
        </button>
        {STATUSES.map(st => {
          const count = statusCounts.get(st) || 0;
          return (
            <button 
              key={st}
              type="button" 
              className={`status-chip ${statusFilter === st ? 'active' : ''} ${count === 0 ? 'empty' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st} <span className="chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Panel */}
      <div className="filter-panel">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>חיפוש {flags.terms.item}</label>
          <input 
            type="text" 
            className="form-control" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Summary and Clear Trigger */}
        <div className="filter-summary">
          <div>
            מציג <span className="filter-badge-info">{filteredTasks.length}</span> מתוך <span className="filter-badge-info">{tasks.length}</span> {flags.terms.items} בסך הכל
          </div>
          {(searchQuery || statusFilter || sortMode !== 'default') && (
            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setSortMode('default');
                setSortDirection('asc');
                saveSortPreference('default', 'asc');
              }}
              style={{ fontSize: '0.8rem', padding: '4px 10px', height: 'auto' }}
            >
              ❌ נקה מסננים
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <div className="empty-state-title">אין {flags.terms.items} במערכת</div>
          <div className="empty-state-text">מנהלת המערכת טרם הזינה {flags.terms.items}. אנא בדוק מאוחר יותר.</div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">לא נמצאו {flags.terms.items} מתאימים</div>
          <div className="empty-state-text">אנא ודא שהחיפוש נכון, או נקה את שורת החיפוש.</div>
          <button 
            className="btn btn-secondary" 
            style={{ marginTop: '16px' }}
            onClick={() => setSearchQuery('')}
          >
            איפוס החיפוש
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-container">
            <table className="task-table">
              <thead>
                <tr>
                  {renderSortableHeader('title', `שם ה${flags.terms.item}`)}
                  {renderSortableHeader('contactPerson', 'איש קשר')}
                  {renderSortableHeader('status', 'סטטוס')}
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => {
                  const taskConfig = getBoardStatusConfig(settings, task.boardId);
                  const colorClass = taskConfig.statusColors[task.status] || '';
                  const currentPlanogram = task.planogramFile || task.planogram;
                  return (
                    <tr key={task.id} onClick={(e) => handleCellClick(task, e)}>
                      <td style={{ fontWeight: '600' }}>
                        <span className="task-title-with-indicator">
                          <span>{task.title}</span>
                          {currentPlanogram && <PlanogramIndicator />}
                        </span>
                      </td>
                      <td>{(task.contactPerson || task.supplierContactName) || '-'}</td>
                      <td>
                        <span className={`badge ${colorClass}`}>
                          {task.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          title={`צפייה בפרטי ה${flags.terms.item}`}
                          onClick={() => setViewingTask(task)}
                        >
                          👁️ צפייה בפרטים
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-cards-grid">
            {filteredTasks.map(task => {
              const taskConfig = getBoardStatusConfig(settings, task.boardId);
              const colorClass = taskConfig.statusColors[task.status] || '';
              const currentPlanogram = task.planogramFile || task.planogram;
              return (
                <div key={task.id} className="task-card" onClick={(e) => handleCellClick(task, e)}>
                  <div className="task-card-header">
                    <div>
                      <h4 className="task-card-title">
                        <span className="task-title-with-indicator">
                          <span>{task.title}</span>
                          {currentPlanogram && <PlanogramIndicator compact />}
                        </span>
                      </h4>
                    </div>
                    <span className={`badge ${colorClass}`}>
                      {task.status}
                    </span>
                  </div>
                  
                  <div className="task-card-meta">
                    <div className="meta-item">
                      <span className="meta-label">איש קשר</span>
                      <span className="meta-value">{(task.contactPerson || task.supplierContactName) || '-'}</span>
                    </div>
                    {(() => {
                      const currentContactPerson = task.contactPerson || task.supplierContactName;
                      const cObj = currentContactPerson ? contacts.find(c => (typeof c === 'string' ? c : c?.name)?.trim().toLowerCase() === currentContactPerson.trim().toLowerCase()) : null;
                      const phone = cObj?.phone || task.phone || task.contactPhone || task.supplierContactPhone || '';
                      const email = task.supplierContactEmail || task.contactEmail || task.email || task.supplierEmail || (cObj ? cObj.email : '');
                      return (
                        <>
                          {phone && (
                            <div className="meta-item">
                              <span className="meta-label">טלפון</span>
                              <span className="meta-value">
                                <a className="directory-phone-link direction-ltr" href={`tel:${phone.replace(/\s+/g, '')}`} onClick={(e) => e.stopPropagation()}>{phone}</a>
                              </span>
                            </div>
                          )}
                          {email && (
                            <div className="meta-item">
                              <span className="meta-label">אימייל</span>
                              <span className="meta-value">
                                <a className="direction-ltr mobile-email-link" href={`mailto:${email}`} onClick={(e) => e.stopPropagation()}>{email}</a>
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="task-card-actions">
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1, padding: '10px' }}
                      onClick={() => setViewingTask(task)}
                    >
                      👁️ צפייה בפרטים
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* External Viewer Task Details Modal */}
      {viewingTask && (
        <Suspense fallback={null}>
          <ExternalDetailsModal 
            task={viewingTask}
            settings={settings}
            contacts={contacts}
            onClose={() => {
              setViewingTask(null);
            }}
            userId={userId}
            organizationId={organizationId}
          />
        </Suspense>
      )}
    </main>
  );
}
