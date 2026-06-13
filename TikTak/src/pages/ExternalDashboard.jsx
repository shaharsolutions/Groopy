import { useState, useEffect } from 'react';
import { getTasks } from '../utils/storage';
import ExternalDetailsModal from '../components/ExternalDetailsModal';

export default function ExternalDashboard({ settings }) {
  const {
    statuses: STATUSES = [],
    statusColors: STATUS_CLASSES = {}
  } = settings || {};
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  
  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected task for modal view
  const [viewingTask, setViewingTask] = useState(null);

  const loadTasks = async () => {
    const fetchedTasks = await getTasks();
    setTasks(fetchedTasks);
  };

  useEffect(() => {
    const initTasks = async () => {
      const fetchedTasks = await getTasks();
      setTasks(fetchedTasks);
      
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
  }, []);

  // Reload tasks on window focus/active modal refresh to get updated comments or status updates
  useEffect(() => {
    let result = [...tasks];

    // Search query filter (title, storeName, supplierName)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => 
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.storeName && t.storeName.toLowerCase().includes(q)) ||
        (t.supplierName && t.supplierName.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(t => t.status === statusFilter);
    }

    // Sort by updatedAt descending so the latest modified shows first
    result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    setFilteredTasks(result);
  }, [tasks, searchQuery, statusFilter]);

  const handleCellClick = (task, e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.btn') || e.target.closest('a')) {
      return;
    }
    setViewingTask(task);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const renderDeadline = (deadlineStr) => {
    if (!deadlineStr) return '-';
    try {
      const deadlineDate = new Date(deadlineStr);
      const today = new Date();
      // Strip times to compare calendar days
      today.setHours(0,0,0,0);
      deadlineDate.setHours(0,0,0,0);
      
      const diffTime = deadlineDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const formattedDate = formatDate(deadlineStr);
      
      if (diffDays < 0) {
        return (
          <span className="deadline-danger" title="הדדליין עבר!">
            ⚠️ עבר ({formattedDate})
          </span>
        );
      } else if (diffDays === 0) {
        return (
          <span className="deadline-danger" title="היום!">
            ⏰ היום! ({formattedDate})
          </span>
        );
      } else if (diffDays <= 3) {
        return (
          <span className="deadline-warning" title={`נותרו עוד ${diffDays} ימים`}>
            ⏳ עוד {diffDays} ימים ({formattedDate})
          </span>
        );
      }
      return formattedDate;
    } catch {
      return deadlineStr;
    }
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
        <ExternalDetailsModal 
          task={viewingTask}
          settings={settings}
          onClose={null}
          isSingleProjectView={true}
        />
      </main>
    );
  }

  return (
    <main className="dashboard-container">
      
      {/* Upper Actions Panel */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>מצב צפייה ועדכון שותפים</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          צפייה בסטטוס עבודות גרפיקה, מעבר לתיקיות קבצים והוספת הערות/תיקונים לספקים וחנויות.
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
          const count = tasks.filter(t => t.status === st).length;
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
          <label className="form-label" style={{ fontSize: '0.8rem' }}>חיפוש משימה</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="חיפוש לפי כותרת עיצוב, חנות או שם ספק..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Summary and Clear Trigger */}
        <div className="filter-summary">
          <div>
            מציג <span className="filter-badge-info">{filteredTasks.length}</span> מתוך <span className="filter-badge-info">{tasks.length}</span> עבודות בסך הכל
          </div>
          {(searchQuery || statusFilter) && (
            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
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
          <div className="empty-state-title">אין עבודות במערכת</div>
          <div className="empty-state-text">מנהלת המערכת טרם הזינה עבודות עיצוב. אנא בדוק מאוחר יותר.</div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">לא נמצאו עבודות פומביות מתאימות</div>
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
                  <th>כותרת העבודה</th>
                  <th>חנות</th>
                  <th>ספק</th>
                  <th>סטטוס</th>
                  <th>תאריך יעד</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => (
                  <tr key={task.id} onClick={(e) => handleCellClick(task, e)}>
                    <td style={{ fontWeight: '600' }}>{task.title}</td>
                    <td>{task.storeName || '-'}</td>
                    <td>{task.supplierName || '-'}</td>
                    <td>
                      <span className={`badge ${STATUS_CLASSES[task.status] || ''}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>{renderDeadline(task.deadline)}</td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-icon"
                        title="צפייה והוספת הערה"
                        onClick={() => setViewingTask(task)}
                      >
                        👁️ צפייה והערות
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-cards-grid">
            {filteredTasks.map(task => (
              <div key={task.id} className="task-card" onClick={(e) => handleCellClick(task, e)}>
                <div className="task-card-header">
                  <div>
                    <h4 className="task-card-title">{task.title}</h4>
                  </div>
                  <span className={`badge ${STATUS_CLASSES[task.status] || ''}`}>
                    {task.status}
                  </span>
                </div>
                
                <div className="task-card-meta">
                  <div className="meta-item">
                    <span className="meta-label">תאריך יעד</span>
                    <span className="meta-value" style={{ marginTop: '4px' }}>{renderDeadline(task.deadline)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">חנות</span>
                    <span className="meta-value">{task.storeName || '-'}</span>
                  </div>
                  <div className="meta-item" style={{ gridColumn: 'span 2' }}>
                    <span className="meta-label">ספק</span>
                    <span className="meta-value">{task.supplierName || '-'}</span>
                  </div>
                </div>

                <div className="task-card-actions">
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '10px' }}
                    onClick={() => setViewingTask(task)}
                  >
                    👁️ צפייה והוספת הערה
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* External Viewer Task Details Modal */}
      {viewingTask && (
        <ExternalDetailsModal 
          task={viewingTask}
          settings={settings}
          onClose={() => {
            setViewingTask(null);
            loadTasks(); // refresh task list updates (like comment counts or timestamp changes)
          }}
        />
      )}
    </main>
  );
}
