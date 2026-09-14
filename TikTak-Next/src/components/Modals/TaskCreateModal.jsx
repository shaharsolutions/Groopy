import React, { useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { db } from '../../services/db';

export function TaskCreateModal({ contacts = [], users = [], onClose, onTaskCreated }) {
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('פיתוח');
  const [status, setStatus] = useState('לביצוע');
  const [priority, setPriority] = useState('רגילה');
  const [assigneeId, setAssigneeId] = useState(users[0]?.id || 'usr_shahar');
  const [dueDate, setDueDate] = useState('');
  const [contactId, setContactId] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedContact = contacts.find(c => c.id === contactId);

    const newTask = db.addTask({
      title: title.trim(),
      domain,
      status,
      priority,
      assigneeId,
      dueDate,
      contactId,
      contactName: selectedContact ? selectedContact.businessName : '',
      nextAction: nextAction.trim(),
      description: description.trim()
    });

    if (onTaskCreated) onTaskCreated(newTask);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.2rem' }}>
            <PackagePlus size={20} color="var(--primary)" />
            <span>יצירת משימה חדשה - PAWZA</span>
          </div>
          <button className="icon-btn-sm" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">שם המשימה *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="לדוגמה: תיקון בעיית שמירת תוספות / עיצוב מסך כניסה..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="fields-2col">
              <div className="form-group">
                <label className="form-label">תחום משימה *</label>
                <select className="form-select" value={domain} onChange={(e) => setDomain(e.target.value)}>
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
                <label className="form-label">עדיפות</label>
                <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="נמוכה">נמוכה</option>
                  <option value="רגילה">רגילה</option>
                  <option value="גבוהה">גבוהה</option>
                  <option value="דחופה">דחופה 🔥</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">אחראי</label>
                <select className="form-select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
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
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">לקוח / ליד קשור</label>
              <select className="form-select" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">ללא לקוח</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.businessName} ({c.contactType === 'lead' ? 'ליד' : 'לקוח'})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">הפעולה הבאה (Next Action)</label>
              <input
                type="text"
                className="form-input"
                placeholder="מה הצעד המעשי הבא הנדרש?"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">תיאור המשימה</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>ביטול</button>
            <button type="submit" className="btn btn-primary">צור משימה</button>
          </div>
        </form>
      </div>
    </div>
  );
}
