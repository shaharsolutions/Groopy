import React, { useState } from 'react';
import { X, CheckSquare, MessageSquare, Paperclip, FileText, Send, Plus, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { formatDate, formatDateTime, getPriorityStyle } from '../../utils/helpers';
import { db } from '../../services/db';

export function TaskDetailsModal({ task, projects, suppliers, statuses, onClose, onTaskUpdated }) {
  if (!task) return null;
import { ConfirmModal } from '../Common/ConfirmModal';

export function TaskDetailsModal({ task, projects = [], suppliers = [], statuses = [], users = [], onClose, onTaskUpdated, showToast }) {
  const [activeTab, setActiveTab] = useState('details');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!task) return null;

  const handleFieldChange = (field, value) => {
    const updated = db.updateTask(task.id, { [field]: value });
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
    db.addComment(task.id, { id: 'usr_current', name: 'מנהל TikTak Next', role: 'admin' }, newCommentText.trim());
    setNewCommentText('');
    const updated = db.getTaskById(task.id);
    if (onTaskUpdated && updated) onTaskUpdated(updated);
  };

  const handleExecuteDelete = () => {
    db.deleteTask(task.id);
    if (showToast) showToast(`המשימה נמחקה`, 'error');
    setShowDeleteConfirm(false);
    onClose();
  };

  const comments = db.getComments(task.id);
  const project = projects.find(p => p.id === task.projectId);
  const supplier = suppliers.find(s => s.id === task.supplierId);
  const priorityStyle = getPriorityStyle(task.priority);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {showDeleteConfirm && (
          <ConfirmModal
            title="מחיקת משימה"
            message="האם אתה בטוח שברצונך למחוק משימה זו? פעולה זו אינה ניתנת לביטול."
            onConfirm={handleExecuteDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                className="badge"
                style={{
                  background: priorityStyle.bg,
                  color: priorityStyle.text,
                  border: `1px solid ${priorityStyle.border}`
                }}
              >
                {task.priority}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                מזהה משימה: {task.id}
              </span>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px' }}>{task.title}</h2>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'var(--bg-light)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div className="form-group">
              <label className="form-label">שינוי סטטוס משימה:</label>
              <select className="form-select" value={currentStatus} onChange={handleStatusChange}>
                {statuses.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">פרויקט:</label>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{project ? project.name : task.projectId}</div>
            </div>

            <div className="form-group">
              <label className="form-label">ספק אחראי:</label>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{supplier ? supplier.name : 'לא שויך ספק'}</div>
            </div>

            <div className="form-group">
              <label className="form-label">תאריך יעד:</label>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="var(--primary)" />
                {formatDate(task.dueDate)}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>תיאור המשימה</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', background: '#F8FAFC', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              {task.description || "אין תיאור מפורט"}
            </p>
          </div>

          {/* Planogram & Preview Section */}
          {task.hasPlanogram && (
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={18} color="#7C3AED" />
                פלנוגרמה מצורפת ({task.planogramName || 'קובץ תצוגה'})
              </h4>
              {task.planogramUrl && (
                <img
                  src={task.planogramUrl}
                  alt="Planogram Preview"
                  className="planogram-img-preview"
                />
              )}
            </div>
          )}

          {/* Files Attachments */}
          {task.files && task.files.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Paperclip size={18} />
                קבצים נלווים ({task.files.length})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {task.files.map(file => (
                  <div key={file.id} className="attachment-card">
                    <Paperclip size={16} color="var(--primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks Checklist */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckSquare size={18} color="var(--primary)" />
              תתי-משימות (Checklist)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {(task.subtasks || []).map((subtask) => (
                <label
                  key={subtask.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: subtask.completed ? '#F1F5F9' : 'var(--surface-white)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    textDecoration: subtask.completed ? 'line-through' : 'none',
                    color: subtask.completed ? 'var(--text-muted)' : 'var(--text-main)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => handleToggleSubtask(subtask.id)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{subtask.text}</span>
                </label>
              ))}
            </div>

            {/* Add subtask form */}
            <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="הוסף תת-משימה חדשה..."
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary">
                <Plus size={16} /> הוסף
              </button>
            </form>
          </div>

          {/* Comments Section */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={18} color="var(--secondary)" />
              תגובות ועדכונים ({comments.length})
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
              {comments.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                  טרם נרשמו תגובות במשימה זו
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                      <span style={{ color: comment.authorRole === 'admin' ? 'var(--primary)' : 'var(--text-main)' }}>
                        {comment.authorName} ({comment.authorRole})
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{comment.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Add comment */}
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="כתוב תגובה או דיווח חדש..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Send size={16} /> שלח
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-danger" onClick={handleDeleteTask}>
            <Trash2 size={16} /> מחק משימה
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
