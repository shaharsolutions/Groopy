import React, { useState } from 'react';
import {
  CheckSquare,
  X,
  Trash2,
  Copy,
  RotateCcw,
  Calendar,
  User,
  Tag,
  CheckCircle2,
  AlertCircle,
  ChevronDown
} from 'lucide-react';

export function TaskBulkActionsBar({
  selectedCount = 0,
  totalCount = 0,
  users = [],
  isRecycleBin = false,
  onClearSelection,
  onSelectAll,
  onBulkUpdate,
  onBulkDuplicate,
  onBulkDelete,
  onBulkRestore
}) {
  const [activeMenu, setActiveMenu] = useState(null); // 'status', 'priority', 'assignee', 'domain', 'date'
  const [customDate, setCustomDate] = useState('');

  if (selectedCount === 0) return null;

  const handleApplyUpdate = (updates) => {
    onBulkUpdate(updates);
    setActiveMenu(null);
  };

  return (
    <div className="task-bulk-actions-bar">
      {/* Selection Info */}
      <div className="bulk-selection-info">
        <div className="bulk-badge">
          <CheckSquare size={16} />
          <span>{selectedCount} משימות נבחרו</span>
        </div>
        
        {selectedCount < totalCount ? (
          <button className="bulk-link-btn" onClick={onSelectAll}>
            בחר את כל ({totalCount})
          </button>
        ) : null}

        <button className="bulk-icon-btn clear-btn" onClick={onClearSelection} title="ניקוי בחירה">
          <X size={16} />
          <span>ביטול בחירה</span>
        </button>
      </div>

      <div className="bulk-divider" />

      {/* Action Buttons Group */}
      <div className="bulk-actions-group">
        {isRecycleBin ? (
          /* Recycle Bin Actions */
          <>
            <button className="bulk-action-btn restore-btn" onClick={onBulkRestore}>
              <RotateCcw size={16} />
              <span>שחזור גורף ({selectedCount})</span>
            </button>

            <button className="bulk-action-btn danger-btn" onClick={onBulkDelete}>
              <Trash2 size={16} />
              <span>מחיקה לצמיתות ({selectedCount})</span>
            </button>
          </>
        ) : (
          /* Active Tasks Actions */
          <>
            {/* Status Change Dropdown */}
            <div className="bulk-dropdown-wrapper">
              <button
                className={`bulk-action-btn ${activeMenu === 'status' ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === 'status' ? null : 'status')}
              >
                <CheckCircle2 size={15} />
                <span>שינוי סטטוס</span>
                <ChevronDown size={13} />
              </button>

              {activeMenu === 'status' && (
                <div className="bulk-menu-popover">
                  <div className="bulk-menu-header">בחר סטטוס חדש למשימות</div>
                  <button onClick={() => handleApplyUpdate({ status: 'לביצוע' })}>
                    <span className="status-dot status-dot-todo" /> לביצוע
                  </button>
                  <button onClick={() => handleApplyUpdate({ status: 'בתהליך' })}>
                    <span className="status-dot status-dot-in-progress" /> בתהליך
                  </button>
                  <button onClick={() => handleApplyUpdate({ status: 'ממתין' })}>
                    <span className="status-dot status-dot-waiting" /> ממתין
                  </button>
                  <button onClick={() => handleApplyUpdate({ status: 'לבדיקה' })}>
                    <span className="status-dot status-dot-review" /> לבדיקה
                  </button>
                  <button onClick={() => handleApplyUpdate({ status: 'הושלם' })}>
                    <span className="status-dot status-dot-done" /> הושלם ✨
                  </button>
                  <button onClick={() => handleApplyUpdate({ status: 'בוטל' })}>
                    <span className="status-dot status-dot-cancelled" /> בוטל
                  </button>
                </div>
              )}
            </div>

            {/* Priority Change Dropdown */}
            <div className="bulk-dropdown-wrapper">
              <button
                className={`bulk-action-btn ${activeMenu === 'priority' ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === 'priority' ? null : 'priority')}
              >
                <AlertCircle size={15} />
                <span>שינוי עדיפות</span>
                <ChevronDown size={13} />
              </button>

              {activeMenu === 'priority' && (
                <div className="bulk-menu-popover">
                  <div className="bulk-menu-header">בחר עדיפות למשימות שנבחרו</div>
                  <button onClick={() => handleApplyUpdate({ priority: 'נמוכה' })}>🟢 נמוכה</button>
                  <button onClick={() => handleApplyUpdate({ priority: 'רגילה' })}>🔵 רגילה</button>
                  <button onClick={() => handleApplyUpdate({ priority: 'גבוהה' })}>🟠 גבוהה</button>
                  <button onClick={() => handleApplyUpdate({ priority: 'דחופה' })}>🔥 דחופה</button>
                </div>
              )}
            </div>

            {/* Assignee Change Dropdown */}
            <div className="bulk-dropdown-wrapper">
              <button
                className={`bulk-action-btn ${activeMenu === 'assignee' ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === 'assignee' ? null : 'assignee')}
              >
                <User size={15} />
                <span>שיוך לאחראי</span>
                <ChevronDown size={13} />
              </button>

              {activeMenu === 'assignee' && (
                <div className="bulk-menu-popover">
                  <div className="bulk-menu-header">שיוך למשתמש/ת במערכת</div>
                  {users.map(u => (
                    <button key={u.id} onClick={() => handleApplyUpdate({ assigneeId: u.id })}>
                      <span>{u.name}</span>
                      <span className="bulk-user-role">({u.role === 'admin' ? 'מנהל' : 'עובד'})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Domain Change Dropdown */}
            <div className="bulk-dropdown-wrapper">
              <button
                className={`bulk-action-btn ${activeMenu === 'domain' ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === 'domain' ? null : 'domain')}
              >
                <Tag size={15} />
                <span>שינוי תחום</span>
                <ChevronDown size={13} />
              </button>

              {activeMenu === 'domain' && (
                <div className="bulk-menu-popover">
                  <div className="bulk-menu-header">הגדר תחום גורף</div>
                  <button onClick={() => handleApplyUpdate({ domain: 'פיתוח' })}>💻 פיתוח</button>
                  <button onClick={() => handleApplyUpdate({ domain: 'עיצוב' })}>🎨 עיצוב</button>
                  <button onClick={() => handleApplyUpdate({ domain: 'תוכן' })}>📝 תוכן</button>
                  <button onClick={() => handleApplyUpdate({ domain: 'שיווק' })}>📢 שיווק</button>
                  <button onClick={() => handleApplyUpdate({ domain: 'מכירות' })}>📈 מכירות</button>
                  <button onClick={() => handleApplyUpdate({ domain: 'תפעול' })}>⚙️ תפעול</button>
                  <button onClick={() => handleApplyUpdate({ domain: 'תמיכה בלקוח' })}>🎧 תמיכה בלקוח</button>
                </div>
              )}
            </div>

            {/* Due Date Dropdown */}
            <div className="bulk-dropdown-wrapper">
              <button
                className={`bulk-action-btn ${activeMenu === 'date' ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === 'date' ? null : 'date')}
              >
                <Calendar size={15} />
                <span>תאריך יעד</span>
                <ChevronDown size={13} />
              </button>

              {activeMenu === 'date' && (
                <div className="bulk-menu-popover date-popover">
                  <div className="bulk-menu-header">קבע תאריך יעד חדש</div>
                  <div className="bulk-date-input-group">
                    <input
                      type="date"
                      className="form-input"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!customDate}
                      onClick={() => handleApplyUpdate({ dueDate: customDate })}
                    >
                      עדכן
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Duplicate Selected Tasks */}
            <button className="bulk-action-btn" onClick={onBulkDuplicate} title="שכפל משימות שנבחרו">
              <Copy size={15} />
              <span>שכפול</span>
            </button>

            {/* Soft Delete Selected Tasks */}
            <button className="bulk-action-btn danger-btn" onClick={onBulkDelete} title="העבר לסל המחזור">
              <Trash2 size={15} />
              <span>העבר לסל מחזור</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
