import { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../utils/storage';
import AdminDetailsModal from '../components/AdminDetailsModal';
import StatusPicker from '../components/StatusPicker';

export default function AdminDashboard({ settings }) {
  const {
    statuses: STATUSES = [],
    priorities: PRIORITIES = [],
    statusColors: STATUS_CLASSES = {},
    priorityColors: PRIORITY_CLASSES = {}
  } = settings || {};
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const [viewingTask, setViewingTask] = useState(null); // holds task being viewed, or null
  const [deletingTaskId, setDeletingTaskId] = useState(null); // holds task id to delete, or null

  const loadTasks = async () => {
    const fetchedTasks = await getTasks();
    setTasks(fetchedTasks);
    setViewingTask(prev => {
      if (!prev) return null;
      const updated = fetchedTasks.find(t => t.id === prev.id);
      return updated || prev;
    });
  };

  // Fetch tasks on mount
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

  // Filter tasks whenever data or filters change
  useEffect(() => {
    let result = [...tasks];

    // Search query filter ( title, storeName, supplierName )
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

    // Priority filter
    if (priorityFilter) {
      result = result.filter(t => t.priority === priorityFilter);
    }

    // Sort by updatedAt descending
    result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    setFilteredTasks(result);
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  const handleStatusChange = async (taskId, newStatus) => {
    await updateTask(taskId, { status: newStatus });
    await loadTasks();
    // If viewing this task in the details modal, refresh it
    if (viewingTask && viewingTask.id === taskId) {
      setViewingTask(prev => ({ ...prev, status: newStatus, updatedAt: new Date().toISOString() }));
    }
  };

  const handlePriorityChange = async (taskId, newPriority) => {
    await updateTask(taskId, { priority: newPriority });
    await loadTasks();
    // If viewing this task in the details modal, refresh it
    if (viewingTask && viewingTask.id === taskId) {
      setViewingTask(prev => ({ ...prev, priority: newPriority, updatedAt: new Date().toISOString() }));
    }
  };

  const handleSaveTask = async (taskData) => {
    if (viewingTask) {
      // Edit mode
      await updateTask(viewingTask.id, taskData);
      const allTasks = await getTasks();
      const updated = allTasks.find(t => t.id === viewingTask.id);
      setViewingTask(updated || null);
    } else {
      // Create mode
      await createTask(taskData);
      setIsCreateOpen(false);
    }
    await loadTasks();
  };

  const handleCellClick = (task, e) => {
    // Check if click was on select, button, or links
    if (
      e.target.tagName === 'SELECT' || 
      e.target.tagName === 'BUTTON' || 
      e.target.closest('.actions-cell') || 
      e.target.closest('.badge') || 
      e.target.closest('.priority-badge') ||
      e.target.closest('a')
    ) {
      return;
    }
    setViewingTask(task);
  };

  const handleDeleteTask = async (taskId) => {
    await deleteTask(taskId);
    setDeletingTaskId(null);
    setViewingTask(null);
    await loadTasks();
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

  return (
    <main className="dashboard-container">
      
      {/* Upper Actions Panel */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>לוח עבודות עיצוב</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>מעקב, עריכה ויצירת משימות גרפיקה במערכת</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setViewingTask(null);
            setStartInEditMode(false);
            setIsCreateOpen(true);
          }}
        >
          ➕ עבודה חדשה
        </button>
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
        <div className="admin-filter-grid">
          {/* Search input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>חיפוש חופשי</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="חיפוש לפי כותרת, חנות או ספק..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Priority Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>סינון לפי עדיפות</label>
            <div className="segmented-control">
              <button 
                type="button" 
                className={`segmented-control-btn ${priorityFilter === '' ? 'active' : ''}`}
                onClick={() => setPriorityFilter('')}
              >
                כל העדיפויות
              </button>
              {PRIORITIES.map(pr => (
                <button 
                  key={pr}
                  type="button" 
                  className={`segmented-control-btn ${priorityFilter === pr ? `active ${PRIORITY_CLASSES[pr] || ''}` : ''}`}
                  onClick={() => setPriorityFilter(pr)}
                >
                  {pr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Summary and Clear Trigger */}
        <div className="filter-summary">
          <div>
            מציג <span className="filter-badge-info">{filteredTasks.length}</span> מתוך <span className="filter-badge-info">{tasks.length}</span> עבודות בסך הכל
          </div>
          {(searchQuery || statusFilter || priorityFilter) && (
            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setPriorityFilter('');
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
          <div className="empty-state-title">אין עבודות במערכת עדיין</div>
          <div className="empty-state-text">לחצי על הכפתור למטה כדי ליצור את עבודת הגרפיקה הראשונה במערכת!</div>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '16px' }}
            onClick={() => {
              setViewingTask(null);
              setStartInEditMode(false);
              setIsCreateOpen(true);
            }}
          >
            ➕ יצירת העבודה הראשונה
          </button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">לא נמצאו עבודות מתאימות</div>
          <div className="empty-state-text">נסו לשנות או לאפס את תנאי הסינון כדי לראות את שאר המשימות.</div>
          <button 
            className="btn btn-secondary" 
            style={{ marginTop: '16px' }}
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('');
              setPriorityFilter('');
            }}
          >
            איפוס כל המסננים
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
                  <th>ספק בסין/ארץ</th>
                  <th>סטטוס (שינוי מהיר)</th>
                  <th>עדיפות (שינוי מהיר)</th>
                  <th>תאריך יעד</th>
                  <th>עודכן ב</th>
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
                      <StatusPicker
                        currentStatus={task.status}
                        statuses={STATUSES}
                        statusColors={STATUS_CLASSES}
                        onChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                      />
                    </td>
                    <td>
                      <select 
                        className={`priority-badge ${PRIORITY_CLASSES[task.priority] || ''}`}
                        value={task.priority}
                        onChange={(e) => handlePriorityChange(task.id, e.target.value)}
                        title="שינוי עדיפות מהיר"
                      >
                        {PRIORITIES.includes(task.priority) ? null : (
                          <option value={task.priority} style={{ backgroundColor: '#fff', color: '#000' }}>
                            {task.priority}
                          </option>
                        )}
                        {PRIORITIES.map(pr => (
                          <option key={pr} value={pr} style={{ backgroundColor: '#fff', color: '#000' }}>
                            {pr}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{renderDeadline(task.deadline)}</td>
                    <td>{formatDate(task.updatedAt)}</td>
                    <td>
                      <div className="actions-cell">
                        <button 
                          className="btn btn-secondary btn-icon"
                          title="צפייה בפרטים"
                          onClick={() => setViewingTask(task)}
                        >
                          👁️
                        </button>
                        <button 
                          className="btn btn-danger btn-icon"
                          title="מחיקת משימה"
                          onClick={() => setDeletingTaskId(task.id)}
                        >
                          🗑️
                        </button>
                      </div>
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
                  <StatusPicker
                    currentStatus={task.status}
                    statuses={STATUSES}
                    statusColors={STATUS_CLASSES}
                    onChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                  />
                </div>
                
                <div className="task-card-meta">
                  <div className="meta-item">
                    <span className="meta-label">עדיפות</span>
                    <select 
                      className={`priority-badge ${PRIORITY_CLASSES[task.priority] || ''}`}
                      value={task.priority}
                      onChange={(e) => handlePriorityChange(task.id, e.target.value)}
                      style={{ width: '100%', marginTop: '4px' }}
                      title="שינוי עדיפות מהיר"
                    >
                      {PRIORITIES.includes(task.priority) ? null : (
                        <option value={task.priority} style={{ backgroundColor: '#fff', color: '#000' }}>
                          {task.priority}
                        </option>
                      )}
                      {PRIORITIES.map(pr => (
                        <option key={pr} value={pr} style={{ backgroundColor: '#fff', color: '#000' }}>
                          {pr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">תאריך יעד</span>
                    <span className="meta-value" style={{ marginTop: '6px' }}>{renderDeadline(task.deadline)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">חנות</span>
                    <span className="meta-value">{task.storeName || '-'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">ספק</span>
                    <span className="meta-value">{task.supplierName || '-'}</span>
                  </div>
                </div>

                <div className="task-card-actions">
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setViewingTask(task)}
                  >
                    פרטים
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '8px' }}
                    onClick={() => {
                      setStartInEditMode(true);
                      setViewingTask(task);
                    }}
                  >
                    ערוך
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '8px' }}
                    onClick={() => setDeletingTaskId(task.id)}
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Unified Task details/edit/create Modal */}
      {(viewingTask || isCreateOpen) && (
        <AdminDetailsModal 
          task={viewingTask}
          settings={settings}
          startInEditMode={startInEditMode}
          onClose={() => {
            setViewingTask(null);
            setIsCreateOpen(false);
            setStartInEditMode(false);
          }}
          onSave={handleSaveTask}
          onDelete={(id) => setDeletingTaskId(id)}
          onRefresh={loadTasks}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {deletingTaskId && (
        <div className="modal-overlay" onClick={() => setDeletingTaskId(null)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">מחיקת עבודה</h3>
              <button className="modal-close" onClick={() => setDeletingTaskId(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>האם את בטוחה שברצונך למחוק את העבודה הזו?</p>
              <p style={{ marginTop: '8px', color: 'var(--priority-urgent-text)', fontWeight: 'bold' }}>
                ⚠️ פעולה זו תמחק גם את כל התגובות והקבצים המקושרים לצמיתות!
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setDeletingTaskId(null)}
              >
                ביטול
              </button>
              <button 
                className="btn btn-danger" 
                style={{ backgroundColor: 'var(--color-needs-revision)', color: 'white' }}
                onClick={() => handleDeleteTask(deletingTaskId)}
              >
                כן, מחק עבודה
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
