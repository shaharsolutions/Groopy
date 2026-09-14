import React, { useState } from 'react';
import {
  CheckSquare,
  Check,
  Code2,
  Palette,
  FileText,
  Megaphone,
  TrendingUp,
  Headphones,
  Settings,
  AlertCircle,
  Eye,
  Copy,
  Trash2,
  MoreVertical,
  RotateCcw
} from 'lucide-react';

export function TaskTableView({
  tasks = [],
  contacts = [],
  users = [],
  statuses = [],
  selectedTaskIds = [],
  setSelectedTaskIds,
  onTaskClick,
  onTaskUpdate,
  onTaskDuplicate,
  onTaskDelete
}) {
  const [internalSelectedIds, setInternalSelectedIds] = useState([]);
  const [editingCell, setEditingCell] = useState(null); // { taskId, field }
  const [cellValue, setCellValue] = useState('');
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  const activeSelectedIds = setSelectedTaskIds ? selectedTaskIds : internalSelectedIds;
  const updateSelectedIds = setSelectedTaskIds || setInternalSelectedIds;

  const domainColors = {
    "פיתוח": "#2563EB",
    "עיצוב": "#8B5CF6",
    "תוכן": "#10B981",
    "שיווק": "#F97316",
    "מכירות": "#0284C7",
    "תמיכה בלקוח": "#EC4899",
    "תפעול": "#64748B"
  };

  const domainIcons = {
    "פיתוח": Code2,
    "עיצוב": Palette,
    "תוכן": FileText,
    "שיווק": Megaphone,
    "מכירות": TrendingUp,
    "תמיכה בלקוח": Headphones,
    "תפעול": Settings
  };

  const toggleSelectAll = () => {
    if (activeSelectedIds.length === tasks.length && tasks.length > 0) {
      updateSelectedIds([]);
    } else {
      updateSelectedIds(tasks.map(t => t.id));
    }
  };

  const toggleSelectTask = (id) => {
    if (activeSelectedIds.includes(id)) {
      updateSelectedIds(activeSelectedIds.filter(tId => tId !== id));
    } else {
      updateSelectedIds([...activeSelectedIds, id]);
    }
  };

  const handleCellBlur = (taskId, field) => {
    if (onTaskUpdate) {
      onTaskUpdate(taskId, { [field]: cellValue });
    }
    setEditingCell(null);
  };

  return (
    <div className="monday-table-container">
      <div className="table-responsive monday-table-wrapper">
        <table className="monday-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={tasks.length > 0 && activeSelectedIds.length === tasks.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th style={{ minWidth: '240px' }}>משימה</th>
              <th style={{ width: '120px' }}>תחום</th>
              <th style={{ width: '120px' }}>סטטוס</th>
              <th style={{ width: '110px' }}>עדיפות</th>
              <th style={{ width: '130px' }}>אחראי</th>
              <th style={{ width: '120px' }}>תאריך יעד</th>
              <th style={{ width: '150px' }}>לקוח / ליד קשור</th>
              <th style={{ minWidth: '180px' }}>הפעולה הבאה</th>
              <th style={{ width: '130px', textAlign: 'center' }}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  אין משימות תואמות. לחץ על "+ משימה חדשה" ליצירת משימה.
                </td>
              </tr>
            ) : (
              tasks.map(task => {
                const isSelected = activeSelectedIds.includes(task.id);
                const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && task.status !== 'הושלם';
                const DomainIcon = domainIcons[task.domain] || Settings;

                return (
                  <tr key={task.id} className={`monday-task-row ${isSelected ? 'row-selected' : ''}`}>
                    {/* Checkbox */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectTask(task.id)}
                      />
                    </td>

                    {/* Task Title */}
                    <td className="task-title-cell clickable" onClick={() => onTaskClick && onTaskClick(task)}>
                      <div className="task-title-wrapper">
                        <button
                          className="task-complete-check-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskUpdate && onTaskUpdate(task.id, { status: task.status === 'הושלם' ? 'לביצוע' : 'הושלם' });
                          }}
                          title="סימון כהושלם"
                        >
                          <Check size={12} />
                        </button>
                        <span className={`task-title-text ${task.status === 'הושלם' ? 'completed-text' : ''}`}>
                          {task.title}
                        </span>
                        {isOverdue && <span className="badge-overdue">באיחור</span>}
                      </div>
                    </td>

                    {/* Domain Pill */}
                    <td>
                      <span
                        className="domain-pill"
                        style={{ backgroundColor: domainColors[task.domain] || '#3B82F6', color: '#FFF' }}
                      >
                        <DomainIcon size={12} />
                        <span>{task.domain || 'פיתוח'}</span>
                      </span>
                    </td>

                    {/* Status Select */}
                    <td className="status-cell">
                      <select
                        className={`inline-select status-${task.status}`}
                        value={task.status}
                        onChange={(e) => onTaskUpdate && onTaskUpdate(task.id, { status: e.target.value })}
                      >
                        <option value="לביצוע">לביצוע</option>
                        <option value="בתהליך">בתהליך</option>
                        <option value="ממתין">ממתין</option>
                        <option value="לבדיקה">לבדיקה</option>
                        <option value="הושלם">הושלם</option>
                        <option value="בוטל">בוטל</option>
                      </select>
                    </td>

                    {/* Priority Select */}
                    <td className="priority-cell">
                      <select
                        className={`inline-select priority-${task.priority}`}
                        value={task.priority}
                        onChange={(e) => onTaskUpdate && onTaskUpdate(task.id, { priority: e.target.value })}
                      >
                        <option value="נמוכה">נמוכה</option>
                        <option value="רגילה">רגילה</option>
                        <option value="גבוהה">גבוהה</option>
                        <option value="דחופה">דחופה 🔥</option>
                      </select>
                    </td>

                    {/* Assignee */}
                    <td className="assignee-cell">
                      <select
                        className="inline-select"
                        value={task.assigneeId || ''}
                        onChange={(e) => onTaskUpdate && onTaskUpdate(task.id, { assigneeId: e.target.value })}
                      >
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Due Date */}
                    <td className="date-cell">
                      <input
                        type="date"
                        className="inline-date-input"
                        value={task.dueDate || ''}
                        onChange={(e) => onTaskUpdate && onTaskUpdate(task.id, { dueDate: e.target.value })}
                      />
                    </td>

                    {/* Related Customer / Lead */}
                    <td>
                      <select
                        className="inline-select"
                        value={task.contactId || ''}
                        onChange={(e) => {
                          const cnt = contacts.find(c => c.id === e.target.value);
                          onTaskUpdate && onTaskUpdate(task.id, {
                            contactId: e.target.value,
                            contactName: cnt ? cnt.businessName : ''
                          });
                        }}
                      >
                        <option value="">ללא לקוח</option>
                        {contacts.map(c => (
                          <option key={c.id} value={c.id}>{c.businessName} ({c.contactType === 'lead' ? 'ליד' : 'לקוח'})</option>
                        ))}
                      </select>
                    </td>

                    {/* Next Action Inline Edit */}
                    <td className="editable-text-cell">
                      {editingCell?.taskId === task.id && editingCell?.field === 'nextAction' ? (
                        <input
                          type="text"
                          className="inline-text-input"
                          autoFocus
                          value={cellValue}
                          onChange={(e) => setCellValue(e.target.value)}
                          onBlur={() => handleCellBlur(task.id, 'nextAction')}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(task.id, 'nextAction')}
                        />
                      ) : (
                        <span
                          className="editable-cell-text"
                          onClick={() => {
                            setEditingCell({ taskId: task.id, field: 'nextAction' });
                            setCellValue(task.nextAction || '');
                          }}
                        >
                          {task.nextAction || <span className="placeholder-text">+ הזן פעולה הבאה</span>}
                        </span>
                      )}
                    </td>

                    {/* Row Single Task Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <div className="task-row-actions">
                        <button
                          className="row-action-btn"
                          title="צפייה / עריכת משימה"
                          onClick={() => onTaskClick && onTaskClick(task)}
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          className="row-action-btn"
                          title="שכפול משימה"
                          onClick={() => onTaskDuplicate && onTaskDuplicate(task.id)}
                        >
                          <Copy size={15} />
                        </button>

                        <button
                          className="row-action-btn danger-hover"
                          title="העברה לסל המחזור"
                          onClick={() => onTaskDelete && onTaskDelete(task.id)}
                        >
                          <Trash2 size={15} />
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
    </div>
  );
}
