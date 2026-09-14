import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Table as TableIcon,
  Kanban as KanbanIcon,
  Search,
  Filter,
  Code2,
  Palette,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { TaskTableView } from './TaskTableView';
import { KanbanBoard } from '../Dashboard/KanbanBoard';
import { TaskBulkActionsBar } from './TaskBulkActionsBar';
import { db } from '../../services/db';
import { ConfirmModal } from '../Common/ConfirmModal';

export function PawzaTasksPage({
  tasks = [],
  contacts = [],
  users = [],
  statuses = [],
  onTaskClick,
  onTaskUpdate,
  onTaskDelete,
  onNewTaskClick,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'dev', 'design_marketing', or 'recycleBin'
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected task IDs for single & bulk actions
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // Confirm modal states
  const [permDeletingTask, setPermDeletingTask] = useState(null);
  const [showBulkPermDeleteConfirm, setShowBulkPermDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const recycleBinTasks = db.getRecycleBinTasks();

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSelectedTaskIds([]);
  };

  // Active tasks filtering according to top tab
  const tabFilteredTasks = tasks.filter(t => {
    if (activeTab === 'dev') return t.domain === 'פיתוח';
    if (activeTab === 'design_marketing') return t.domain === 'עיצוב' || t.domain === 'תוכן' || t.domain === 'שיווק';
    return true;
  });

  const finalTasks = (activeTab === 'recycleBin' ? recycleBinTasks : tabFilteredTasks).filter(t => {
    if (activeTab !== 'recycleBin') {
      if (domainFilter !== 'all' && t.domain !== domainFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.nextAction?.toLowerCase().includes(q) ||
      t.contactName?.toLowerCase().includes(q)
    );
  });

  // Single Task Actions
  const handleTaskDuplicate = (taskId) => {
    const duplicated = db.duplicateTask(taskId);
    if (duplicated && showToast) {
      showToast(`המשימה "${duplicated.title}" שוכפלה בהצלחה!`, 'success');
    }
  };

  const handleRestoreTask = (task) => {
    db.restoreTask(task.id);
    if (showToast) showToast(`המשימה "${task.title}" שוחזרה בהצלחה מסל המחזור!`, 'success');
  };

  const handlePermanentDeleteTask = () => {
    if (!permDeletingTask) return;
    db.permanentlyDeleteTask(permDeletingTask.id);
    if (showToast) showToast(`המשימה "${permDeletingTask.title}" נמחקה לצמיתות`, 'error');
    setPermDeletingTask(null);
  };

  // Bulk Task Actions
  const handleBulkUpdate = (updates) => {
    const count = db.bulkUpdateTasks(selectedTaskIds, updates);
    if (showToast) {
      showToast(`${count} משימות עודכנו בהצלחה!`, 'success');
    }
    setSelectedTaskIds([]);
  };

  const handleBulkDuplicate = () => {
    let duplicatedCount = 0;
    selectedTaskIds.forEach(id => {
      if (db.duplicateTask(id)) duplicatedCount++;
    });
    if (showToast) {
      showToast(`${duplicatedCount} משימות שוכפלו בהצלחה!`, 'success');
    }
    setSelectedTaskIds([]);
  };

  const handleConfirmBulkDelete = () => {
    const count = db.bulkSoftDeleteTasks(selectedTaskIds);
    if (showToast) {
      showToast(`${count} משימות הועברו לסל המחזור`, 'info');
    }
    setSelectedTaskIds([]);
    setShowBulkDeleteConfirm(false);
  };

  const handleBulkRestore = () => {
    const count = db.bulkRestoreTasks(selectedTaskIds);
    if (showToast) {
      showToast(`${count} משימות שוחזרו בהצלחה מסל המחזור!`, 'success');
    }
    setSelectedTaskIds([]);
  };

  const handleConfirmBulkPermDelete = () => {
    const count = db.bulkPermanentlyDeleteTasks(selectedTaskIds);
    if (showToast) {
      showToast(`${count} משימות נמחקו לצמיתות`, 'error');
    }
    setSelectedTaskIds([]);
    setShowBulkPermDeleteConfirm(false);
  };

  const getDaysRemaining = (deletedExpiresAt) => {
    if (!deletedExpiresAt) return 30;
    const diff = new Date(deletedExpiresAt).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  };

  const toggleSelectRecycleTask = (id) => {
    if (selectedTaskIds.includes(id)) {
      setSelectedTaskIds(selectedTaskIds.filter(tId => tId !== id));
    } else {
      setSelectedTaskIds([...selectedTaskIds, id]);
    }
  };

  const toggleSelectAllRecycleTasks = () => {
    if (selectedTaskIds.length === finalTasks.length && finalTasks.length > 0) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(finalTasks.map(t => t.id));
    }
  };

  return (
    <div className="pawza-tasks-page">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">ניהול משימות PAWZA</h1>
          <p className="page-subtitle">משימות פיתוח המערכת, עיצוב ממשק, תוכן ושיווק פנסיונים</p>
        </div>
        {activeTab !== 'recycleBin' && (
          <button className="btn btn-primary" onClick={onNewTaskClick}>
            <Plus size={18} />
            <span>משימה חדשה</span>
          </button>
        )}
      </div>

      {/* Quick Category Tabs + Recycle Bin */}
      <div className="pawza-top-tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          <CheckSquare size={16} />
          <span>כל המשימות ({tasks.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'dev' ? 'active' : ''}`}
          onClick={() => handleTabChange('dev')}
        >
          <Code2 size={16} color="#2563EB" />
          <span>פיתוח המערכת ({tasks.filter(t => t.domain === 'פיתוח').length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'design_marketing' ? 'active' : ''}`}
          onClick={() => handleTabChange('design_marketing')}
        >
          <Palette size={16} color="#8B5CF6" />
          <span>עיצוב, תוכן ושיווק ({tasks.filter(t => t.domain === 'עיצוב' || t.domain === 'תוכן' || t.domain === 'שיווק').length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'recycleBin' ? 'active' : ''}`}
          style={{ marginRight: 'auto' }}
          onClick={() => handleTabChange('recycleBin')}
        >
          <Trash2 size={16} color="#EF4444" />
          <span>סל מחזור ({recycleBinTasks.length})</span>
        </button>
      </div>

      {/* Filter and View Mode Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder={activeTab === 'recycleBin' ? "חיפוש משימות בסל המחזור..." : "חיפוש משימה לפי שם, לקוח, הפעולה הבאה..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {activeTab !== 'recycleBin' && (
          <div className="filter-group">
            <select
              className="form-select"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
            >
              <option value="all">כל התחומים</option>
              <option value="פיתוח">פיתוח</option>
              <option value="עיצוב">עיצוב</option>
              <option value="תוכן">תוכן</option>
              <option value="שיווק">שיווק</option>
              <option value="מכירות">מכירות</option>
              <option value="תמיכה בלקוח">תמיכה בלקוח</option>
            </select>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">כל הסטטוסים</option>
              <option value="לביצוע">לביצוע</option>
              <option value="בתהליך">בתהליך</option>
              <option value="ממתין">ממתין</option>
              <option value="לבדיקה">לבדיקה</option>
              <option value="הושלם">הושלם</option>
            </select>

            <div className="view-mode-toggle">
              <button
                className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="תצוגת טבלה"
              >
                <TableIcon size={16} />
              </button>
              <button
                className={`toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                onClick={() => setViewMode('kanban')}
                title="תצוגת Kanban"
              >
                <KanbanIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating / Sticky Bulk Actions Bar */}
      <TaskBulkActionsBar
        selectedCount={selectedTaskIds.length}
        totalCount={finalTasks.length}
        users={users}
        isRecycleBin={activeTab === 'recycleBin'}
        onClearSelection={() => setSelectedTaskIds([])}
        onSelectAll={() => setSelectedTaskIds(finalTasks.map(t => t.id))}
        onBulkUpdate={handleBulkUpdate}
        onBulkDuplicate={handleBulkDuplicate}
        onBulkDelete={() => {
          if (activeTab === 'recycleBin') {
            setShowBulkPermDeleteConfirm(true);
          } else {
            setShowBulkDeleteConfirm(true);
          }
        }}
        onBulkRestore={handleBulkRestore}
      />

      {/* Render Main Content / Recycle Bin */}
      {activeTab === 'recycleBin' ? (
        <div className="table-responsive monday-table-wrapper">
          <table className="monday-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={finalTasks.length > 0 && selectedTaskIds.length === finalTasks.length}
                    onChange={toggleSelectAllRecycleTasks}
                  />
                </th>
                <th style={{ minWidth: '240px' }}>שם המשימה שנמחקה</th>
                <th style={{ width: '130px' }}>תחום</th>
                <th style={{ width: '130px' }}>תאריך מחיקה</th>
                <th style={{ width: '160px' }}>נותר למחיקה לצמיתות</th>
                <th style={{ width: '160px', textAlign: 'center' }}>פעולות שחזור / מחיקה</th>
              </tr>
            </thead>
            <tbody>
              {finalTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '35px', color: 'var(--text-muted)' }}>
                    סל המחזור של המשימות ריק.
                  </td>
                </tr>
              ) : (
                finalTasks.map(t => {
                  const isSelected = selectedTaskIds.includes(t.id);
                  const daysRem = getDaysRemaining(t.deletedExpiresAt);
                  return (
                    <tr key={t.id} className={`monday-task-row ${isSelected ? 'row-selected' : ''}`}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRecycleTask(t.id)}
                        />
                      </td>
                      <td className="task-title-cell">
                        <strong>{t.title}</strong>
                      </td>
                      <td>
                        <span className="domain-pill" style={{ background: 'var(--primary)', color: '#FFF' }}>
                          {t.domain}
                        </span>
                      </td>
                      <td>{t.deletedAt ? new Date(t.deletedAt).toLocaleDateString('he-IL') : '-'}</td>
                      <td>
                        <span className="badge-overdue" style={{ background: '#FEF3C7', color: '#D97706' }}>
                          נותרו {daysRem} ימים
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRestoreTask(t)}
                            title="שחזר משימה זו מתוך סל המחזור"
                          >
                            <RotateCcw size={14} color="#10B981" />
                            <span>שחזר</span>
                          </button>

                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setPermDeletingTask(t)}
                            title="מחק לצמיתות מסל המחזור"
                          >
                            <Trash2 size={14} />
                            <span>מחק לצמיתות</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'table' ? (
        <TaskTableView
          tasks={finalTasks}
          contacts={contacts}
          users={users}
          statuses={statuses}
          selectedTaskIds={selectedTaskIds}
          setSelectedTaskIds={setSelectedTaskIds}
          onTaskClick={onTaskClick}
          onTaskUpdate={onTaskUpdate}
          onTaskDuplicate={handleTaskDuplicate}
          onTaskDelete={(taskId) => {
            db.softDeleteTask(taskId);
            if (showToast) showToast('המשימה הועברה לסל המחזור ל-30 ימים', 'info');
          }}
        />
      ) : (
        <KanbanBoard
          tasks={finalTasks}
          statuses={statuses}
          onTaskClick={onTaskClick}
        />
      )}

      {/* Single Task Permanent Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(permDeletingTask)}
        title="מחיקת משימה לצמיתות"
        message={permDeletingTask ? `אזהרה: פעולה זו תמחק לצמיתות את המשימה "${permDeletingTask.title}" מסל המחזור. לא ניתן יהיה לשחזר אותה.` : ''}
        confirmText="מחק לצמיתות"
        cancelText="ביטול"
        onConfirm={handlePermanentDeleteTask}
        onCancel={() => setPermDeletingTask(null)}
      />

      {/* Bulk Soft Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        title="העברת משימות גורפת לסל המחזור"
        message={`האם אתה בטוח שברצונך להעביר ${selectedTaskIds.length} משימות לסל המחזור? ניתן יהיה לשחזר אותן ב-30 הימים הקרובים.`}
        confirmText="העבר לסל מחזור"
        cancelText="ביטול"
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />

      {/* Bulk Permanent Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showBulkPermDeleteConfirm}
        title="מחיקת משימות גורפת לצמיתות"
        message={`אזהרה חמורה: פעולה זו תמחק לצמיתות ${selectedTaskIds.length} משימות מסל המחזור. לא ניתן יהיה לשחזר משימות אלו בעתיד!`}
        confirmText="מחק לצמיתות"
        cancelText="ביטול"
        onConfirm={handleConfirmBulkPermDelete}
        onCancel={() => setShowBulkPermDeleteConfirm(false)}
      />
    </div>
  );
}
