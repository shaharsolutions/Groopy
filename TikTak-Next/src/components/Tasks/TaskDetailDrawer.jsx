import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  User,
  FileText,
  Paperclip,
  MessageSquare,
  Plus,
  Trash2,
  Calendar,
  Share2,
  ChevronDown,
  ChevronUp,
  Code2,
  Palette,
  Megaphone,
  Building2,
  ExternalLink
} from 'lucide-react';
import { db } from '../../services/db';
import { ConfirmModal } from '../Common/ConfirmModal';

export function TaskDetailDrawer({
  task,
  contacts = [],
  statuses = [],
  users = [],
  onClose,
  onTaskUpdated,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('details');
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [comments, setComments] = useState(db.getComments(task?.id));

  // Confirm delete modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!task) return null;

  const currentContact = contacts.find(c => c.id === task.contactId);

  const handleFieldChange = (field, value) => {
    const updated = db.updateTask(task.id, { [field]: value });
    if (onTaskUpdated && updated) onTaskUpdated(updated);
  };

  const handleNestedFieldChange = (section, field, value) => {
    const currentSection = task[section] || {};
    const updated = db.updateTask(task.id, {
      [section]: { ...currentSection, [field]: value }
    });
    if (onTaskUpdated && updated) onTaskUpdated(updated);
  };

  const handleToggleSubtask = (subtaskId) => {
    db.toggleSubtask(task.id, subtaskId);
    const updated = db.getTaskById(task.id);
    if (onTaskUpdated && updated) onTaskUpdated(updated);
  };

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    db.addSubtask(task.id, newSubtaskText.trim());
    setNewSubtaskText('');
    const updated = db.getTaskById(task.id);
    if (onTaskUpdated && updated) onTaskUpdated(updated);
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    db.addComment(task.id, { id: 'usr_shahar', name: 'שחר (PAWZA)', role: 'admin' }, newCommentText.trim());
    setNewCommentText('');
    setComments(db.getComments(task.id));
    const updated = db.getTaskById(task.id);
    if (onTaskUpdated && updated) onTaskUpdated(updated);
  };

  const handleExecuteDelete = () => {
    db.deleteTask(task.id);
    if (showToast) showToast(`המשימה "${task.title}" נמחקה`, 'error');
    setShowDeleteConfirm(false);
    onClose();
  };

  const completedSubtasks = (task.subtasks || []).filter(st => st.completed).length;
  const totalSubtasks = (task.subtasks || []).length;
  const subtaskProgressPct = totalSubtasks ? Math.round((completedSubtasks / totalSubtasks) * 100) : task.progress || 0;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <span className="domain-pill" style={{ backgroundColor: 'var(--primary)', color: '#FFF' }}>
              {task.domain || 'פיתוח'}
            </span>
            <span className="task-id-tag">ID: {task.id}</span>
          </div>

          <div className="drawer-header-actions">
            <button className="icon-btn-sm text-danger" onClick={() => setShowDeleteConfirm(true)} title="מחק משימה">
              <Trash2 size={16} />
            </button>
            <button className="icon-btn-sm" onClick={onClose} title="סגור">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Task Title Input */}
        <div className="drawer-title-section">
          <input
            type="text"
            className="drawer-title-input"
            value={task.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
          />
        </div>

        {/* Tabs Bar */}
        <div className="drawer-tabs-bar">
          <button
            className={`drawer-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <FileText size={16} />
            <span>פרטי משימה</span>
          </button>
          <button
            className={`drawer-tab-btn ${activeTab === 'subtasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('subtasks')}
          >
            <CheckCircle2 size={16} />
            <span>תתי-משימות ({completedSubtasks}/{totalSubtasks})</span>
          </button>
          <button
            className={`drawer-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            <MessageSquare size={16} />
            <span>תגובות ({comments.length})</span>
          </button>
          <button
            className={`drawer-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <Paperclip size={16} />
            <span>קבצים ({task.files?.length || 0})</span>
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="drawer-body">
          {activeTab === 'details' && (
            <div className="drawer-details-grid">
              {/* Primary Fields Grid */}
              <div className="fields-2col">
                <div className="form-group">
                  <label className="form-label">תחום *</label>
                  <select
                    className="form-select"
                    value={task.domain || 'פיתוח'}
                    onChange={(e) => handleFieldChange('domain', e.target.value)}
                  >
                    <option value="פיתוח">פיתוח</option>
                    <option value="עיצוב">עיצוב</option>
                    <option value="תוכן">תוכן</option>
                    <option value="שיווק">שיווק</option>
                    <option value="מכירות">מכירות</option>
                    <option value="תמיכה בלקוח">תמיכה בלקוח</option>
                    <option value="תפעול">תפעול</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">סטטוס *</label>
                  <select
                    className={`form-select status-${task.status}`}
                    value={task.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  >
                    <option value="לביצוע">לביצוע</option>
                    <option value="בתהליך">בתהליך</option>
                    <option value="ממתין">ממתין</option>
                    <option value="לבדיקה">לבדיקה</option>
                    <option value="הושלם">הושלם</option>
                    <option value="בוטל">בוטל</option>
                  </select>
                </div>

                {/* Conditional "Waiting for" field */}
                {task.status === 'ממתין' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label text-warning" style={{ color: '#D97706', fontWeight: 700 }}>
                      ממתין למי או למה? *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ borderColor: '#F59E0B' }}
                      value={task.waitingFor || ''}
                      placeholder="לדוגמה: ממתין לאלינה / ממתין ללקוח / ממתין לאישור Google"
                      onChange={(e) => handleFieldChange('waitingFor', e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">עדיפות</label>
                  <select
                    className={`form-select priority-${task.priority}`}
                    value={task.priority}
                    onChange={(e) => handleFieldChange('priority', e.target.value)}
                  >
                    <option value="נמוכה">נמוכה</option>
                    <option value="רגילה">רגילה</option>
                    <option value="גבוהה">גבוהה</option>
                    <option value="דחופה">דחופה 🔥</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">אחראי</label>
                  <select
                    className="form-select"
                    value={task.assigneeId || ''}
                    onChange={(e) => handleFieldChange('assigneeId', e.target.value)}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">תאריך יעד</label>
                  <input
                    type="date"
                    className="form-input"
                    value={task.dueDate || ''}
                    onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">לקוח / ליד קשור</label>
                  <select
                    className="form-select"
                    value={task.contactId || ''}
                    onChange={(e) => {
                      const cnt = contacts.find(c => c.id === e.target.value);
                      handleFieldChange('contactId', e.target.value);
                      if (cnt) handleFieldChange('contactName', cnt.businessName);
                    }}
                  >
                    <option value="">ללא שיוך לקוח</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.businessName} ({c.contactType === 'lead' ? 'ליד' : 'לקוח'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Next Action */}
              <div className="form-group">
                <label className="form-label">הפעולה הבאה (Next Action) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={task.nextAction || ''}
                  placeholder="מה הצעד המעשי הבא הנדרש?"
                  onChange={(e) => handleFieldChange('nextAction', e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">תיאור המשימה</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={task.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="פרט את מהות המשימה והנחיות..."
                />
              </div>

              {/* Collapsible Section: Additional Technical Details */}
              <div className="collapsible-section">
                <button
                  type="button"
                  className="collapsible-toggle-btn"
                  onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    {task.domain === 'פיתוח' ? <Code2 size={16} color="#2563EB" /> : <Palette size={16} color="#8B5CF6" />}
                    <span>פרטים נוספים ({task.domain || 'פיתוח'})</span>
                  </div>
                  {showAdvancedDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {showAdvancedDetails && (
                  <div className="collapsible-content">
                    {task.domain === 'פיתוח' && (
                      <div className="fields-2col">
                        <div className="form-group">
                          <label className="form-label">סוג משימת פיתוח</label>
                          <select
                            className="form-select"
                            value={task.devDetails?.devType || 'פיתוח פיצ\'ר'}
                            onChange={(e) => handleNestedFieldChange('devDetails', 'devType', e.target.value)}
                          >
                            <option value="פיתוח פיצ'ר">פיתוח פיצ'ר</option>
                            <option value="תיקון באג">תיקון באג</option>
                            <option value="שיפור ממשק">שיפור ממשק</option>
                            <option value="שיפור ביצועים">שיפור ביצועים</option>
                            <option value="שינוי מסד נתונים">שינוי מסד נתונים</option>
                            <option value="אינטגרציה">אינטגרציה</option>
                            <option value="בדיקות">בדיקות</option>
                            <option value="אבטחה">אבטחה</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">סביבת עבודה</label>
                          <select
                            className="form-select"
                            value={task.devDetails?.environment || 'Development'}
                            onChange={(e) => handleNestedFieldChange('devDetails', 'environment', e.target.value)}
                          >
                            <option value="Development">Development</option>
                            <option value="Staging">Staging</option>
                            <option value="Production">Production</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">קישור ל-GitHub / PR</label>
                          <input
                            type="text"
                            className="form-input"
                            value={task.devDetails?.gitPr || ''}
                            placeholder="https://github.com/..."
                            onChange={(e) => handleNestedFieldChange('devDetails', 'gitPr', e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">חומרת באג</label>
                          <select
                            className="form-select"
                            value={task.devDetails?.bugSeverity || 'נמוכה'}
                            onChange={(e) => handleNestedFieldChange('devDetails', 'bugSeverity', e.target.value)}
                          >
                            <option value="נמוכה">נמוכה</option>
                            <option value="בינונית">בינונית</option>
                            <option value="גבוהה">גבוהה</option>
                            <option value="קריטית">קריטית 🔥</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {(task.domain === 'עיצוב' || task.domain === 'תוכן' || task.domain === 'שיווק') && (
                      <div className="fields-2col">
                        <div className="form-group">
                          <label className="form-label">קישור ל-Figma / Canva</label>
                          <input
                            type="text"
                            className="form-input"
                            value={task.designDetails?.figmaLink || ''}
                            placeholder="https://figma.com/..."
                            onChange={(e) => handleNestedFieldChange('designDetails', 'figmaLink', e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">סטטוס אישור</label>
                          <select
                            className="form-select"
                            value={task.designDetails?.approvalStatus || 'טרם נשלח'}
                            onChange={(e) => handleNestedFieldChange('designDetails', 'approvalStatus', e.target.value)}
                          >
                            <option value="טרם נשלח">טרם נשלח</option>
                            <option value="ממתין לאישור">ממתין לאישור</option>
                            <option value="נדרשים תיקונים">נדרשים תיקונים</option>
                            <option value="אושר">אושר</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subtasks Tab */}
          {activeTab === 'subtasks' && (
            <div className="subtasks-section">
              <div className="subtask-progress-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700 }}>תתי-משימות ({completedSubtasks}/{totalSubtasks})</span>
                  <strong>{subtaskProgressPct}% הושלמו</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${subtaskProgressPct}%`, backgroundColor: '#10B981' }}></div>
                </div>
              </div>

              <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="הוסף תת-משימה חדשה..."
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  <Plus size={16} />
                  <span>הוסף</span>
                </button>
              </form>

              <div className="subtasks-list">
                {(task.subtasks || []).map(st => (
                  <div key={st.id} className={`subtask-item ${st.completed ? 'completed' : ''}`}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => handleToggleSubtask(st.id)}
                      />
                      <span className="subtask-title-text">{st.title}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="comments-section">
              <form onSubmit={handleAddComment} className="comment-form">
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="כתיבת תגובה או עדכון..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary btn-sm">
                    שלח תגובה
                  </button>
                </div>
              </form>

              <div className="comments-list" style={{ marginTop: '20px' }}>
                {comments.map(c => (
                  <div key={c.id} className="comment-bubble">
                    <div className="comment-header">
                      <strong>{c.authorName}</strong>
                      <span className="comment-time">{new Date(c.createdAt).toLocaleDateString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="comment-text">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="files-section">
              <div className="upload-dropzone">
                <Paperclip size={24} color="var(--primary)" />
                <div>העלאת קבצים או קישורים</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HTML Confirm Delete Task Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="אישור מחיקת משימה"
        message={`האם אתה בטוח שברצונך למחוק את המשימה "${task.title}"?`}
        confirmText="מחק משימה"
        cancelText="ביטול"
        onConfirm={handleExecuteDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
