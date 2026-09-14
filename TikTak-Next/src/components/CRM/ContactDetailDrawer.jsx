import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  Mail,
  Building2,
  Calendar,
  DollarSign,
  Plus,
  CheckCircle2,
  Clock,
  User,
  Activity,
  FileText,
  Trash2
} from 'lucide-react';
import { db } from '../../services/db';
import { ConfirmModal } from '../Common/ConfirmModal';

export function ContactDetailDrawer({
  contact,
  tasks = [],
  users = [],
  onClose,
  onContactUpdated,
  onTaskClick,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [newActivityText, setNewActivityText] = useState('');
  const [newActivityType, setNewActivityType] = useState('call');
  const [activities, setActivities] = useState(db.getActivities(contact?.id));

  // HTML Confirm Modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!contact) return null;

  const isLead = contact.contactType === 'lead';
  const relatedTasks = tasks.filter(t => t.contactId === contact.id);

  const handleFieldChange = (field, value) => {
    const updated = db.updateContact(contact.id, { [field]: value });
    if (onContactUpdated && updated) onContactUpdated(updated);
  };

  const handleAddActivity = (e) => {
    e.preventDefault();
    if (!newActivityText.trim()) return;

    db.addCrmActivity(contact.id, newActivityType, newActivityText.trim());
    setNewActivityText('');
    setActivities(db.getActivities(contact.id));
    if (showToast) showToast('הפעילות תועדה בהצלחה!', 'success');
  };

  const handleCreateQuickTask = (templateTitle, domain) => {
    const newTask = db.addTask({
      title: `${templateTitle} - ${contact.businessName}`,
      domain: domain || "תמיכה בלקוח",
      contactId: contact.id,
      contactName: contact.businessName,
      status: "לביצוע",
      priority: "רגילה",
      assigneeId: "usr_alina",
      nextAction: templateTitle,
      dueDate: new Date().toISOString().split('T')[0]
    });
    if (showToast) showToast(`נוצרה משימה חדשה: ${newTask.title}`, 'success');
  };

  const handleExecuteSoftDeleteContact = () => {
    db.softDeleteContact(contact.id);
    if (showToast) showToast(`הרשומה "${contact.businessName}" הועברה לסל המחזור ל-30 ימים`, 'info');
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <span className={`crm-type-badge ${isLead ? 'lead' : 'customer'}`}>
              {isLead ? 'כרטיס ליד' : 'כרטיס לקוח'}
            </span>
            <span className="task-id-tag">ID: {contact.id}</span>
          </div>

          <div className="drawer-header-actions">
            {contact.phone && (
              <a
                href={`https://wa.me/972${contact.phone.replace(/^0/, '').replace(/-/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="whatsapp-btn-sm"
                title="פתח WhatsApp"
              >
                <MessageCircle size={16} />
                <span>WhatsApp</span>
              </a>
            )}

            <button className="icon-btn-sm text-danger" onClick={() => setShowDeleteConfirm(true)} title="העבר לסל המחזור">
              <Trash2 size={16} />
            </button>

            <button className="icon-btn-sm" onClick={onClose} title="סגור">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Title Input */}
        <div className="drawer-title-section">
          <input
            type="text"
            className="drawer-title-input"
            value={contact.businessName}
            onChange={(e) => handleFieldChange('businessName', e.target.value)}
          />
        </div>

        {/* Tabs Bar */}
        <div className="drawer-tabs-bar">
          <button
            className={`drawer-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Building2 size={16} />
            <span>פרטי קשר ושרות</span>
          </button>
          <button
            className={`drawer-tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            <Activity size={16} />
            <span>ציר פעילויות ({activities.length})</span>
          </button>
          <button
            className={`drawer-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <CheckCircle2 size={16} />
            <span>משימות מקושרות ({relatedTasks.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="drawer-body">
          {activeTab === 'overview' && (
            <div className="drawer-details-grid">
              {/* Contact Info Card */}
              <div className="business-fields-card">
                <div className="card-subtitle-bold">
                  <User size={18} color="var(--primary)" />
                  <span>פרטי איש קשר ועסק</span>
                </div>

                <div className="fields-2col" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">שם איש קשר</label>
                    <input
                      type="text"
                      className="form-input"
                      value={contact.contactPerson || ''}
                      onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">טלפון</label>
                    <input
                      type="text"
                      className="form-input"
                      value={contact.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">אימייל</label>
                    <input
                      type="email"
                      className="form-input"
                      value={contact.email || ''}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">כתובת העסק</label>
                    <input
                      type="text"
                      className="form-input"
                      value={contact.address || ''}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Service & Next Action Card */}
              <div className="business-fields-card">
                <div className="card-subtitle-bold">
                  <DollarSign size={18} color="#10B981" />
                  <span>{isLead ? 'סטטוס ליד ומעקב' : 'חבילת PAWZA וסטטוס לקוח'}</span>
                </div>

                <div className="fields-2col" style={{ marginTop: '12px' }}>
                  {isLead ? (
                    <>
                      <div className="form-group">
                        <label className="form-label">מקור הליד</label>
                        <select
                          className="form-select"
                          value={contact.leadSource || 'אתר'}
                          onChange={(e) => handleFieldChange('leadSource', e.target.value)}
                        >
                          <option value="פנייה מהאתר">פנייה מהאתר</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Instagram">Instagram</option>
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="המלצה">המלצה</option>
                          <option value="פנייה יזומה">פנייה יזומה</option>
                          <option value="Google">Google</option>
                          <option value="אחר">אחר</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">סטטוס ליד</label>
                        <select
                          className="form-select"
                          value={contact.leadStatus || 'ליד חדש'}
                          onChange={(e) => handleFieldChange('leadStatus', e.target.value)}
                        >
                          <option value="ליד חדש">ליד חדש</option>
                          <option value="נוצר קשר">נוצר קשר</option>
                          <option value="נקבעה הדגמה">נקבעה הדגמה</option>
                          <option value="בוצעה הדגמה">בוצעה הדגמה</option>
                          <option value="נשלחה הצעה">נשלחה הצעה</option>
                          <option value="במעקב">במעקב</option>
                          <option value="לא רלוונטי">לא רלוונטי</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group">
                        <label className="form-label">חבילת PAWZA</label>
                        <select
                          className="form-select"
                          value={contact.packageName || 'Pro'}
                          onChange={(e) => handleFieldChange('packageName', e.target.value)}
                        >
                          <option value="בסיסית">בסיסית (250 ₪)</option>
                          <option value="Pro">Pro (350 ₪)</option>
                          <option value="Premium">Premium (500 ₪)</option>
                          <option value="מותאמת אישית">מותאמת אישית</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">מחיר חודשי (₪)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={contact.monthlyPrice || 350}
                          onChange={(e) => handleFieldChange('monthlyPrice', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label className="form-label">תאריך מעקב הבא</label>
                    <input
                      type="date"
                      className="form-input"
                      value={contact.nextFollowUpDate || ''}
                      onChange={(e) => handleFieldChange('nextFollowUpDate', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">אחראי טיפול</label>
                    <select
                      className="form-select"
                      value={contact.assigneeId || ''}
                      onChange={(e) => {
                        handleFieldChange('assigneeId', e.target.value);
                        const assignedUser = users.find(u => u.id === e.target.value);
                        if (showToast) {
                          showToast(assignedUser ? `אחראי טיפול עודכן: ${assignedUser.name}` : `הוסר אחראי טיפול`, 'success');
                        }
                      }}
                    >
                      <option value="">ללא אחראי</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">הפעולה הבאה (Next Action) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={contact.nextAction || ''}
                    placeholder="מה הפעולה הבאה הנדרשת מול הלקוח/הליד?"
                    onChange={(e) => handleFieldChange('nextAction', e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">הערות ומידע נוסף</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={contact.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Activity Log Tab */}
          {activeTab === 'activities' && (
            <div className="activities-section">
              <form onSubmit={handleAddActivity} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select
                    className="form-select"
                    style={{ width: '140px' }}
                    value={newActivityType}
                    onChange={(e) => setNewActivityType(e.target.value)}
                  >
                    <option value="call">שיחה טלפונית</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">אימייל</option>
                    <option value="demo">הדגמה</option>
                    <option value="quote">הצעת מחיר</option>
                    <option value="note">הערה</option>
                  </select>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="תעד שיחה, הודעה או פגישה..."
                    value={newActivityText}
                    onChange={(e) => setNewActivityText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    תעד
                  </button>
                </div>
              </form>

              <div className="activity-timeline">
                {activities.map(act => (
                  <div key={act.id} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <div className="timeline-action">{act.activityType.toUpperCase()}</div>
                      <div className="timeline-details">{act.description}</div>
                      <div className="timeline-time">
                        {new Date(act.createdAt).toLocaleDateString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="related-tasks-section">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>צור משימה מהירה מתוך כרטיס זה:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleCreateQuickTask('לחזור ללקוח', 'תמיכה בלקוח')}>
                    + לחזור ללקוח
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleCreateQuickTask('לשלוח הצעת מחיר', 'מכירות')}>
                    + לשלוח הצעה
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleCreateQuickTask('לקבוע הדגמה', 'מכירות')}>
                    + לקבוע הדגמה
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleCreateQuickTask('לבצע הדרכת משתמש', 'תמיכה בלקוח')}>
                    + לבצע הדרכה
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleCreateQuickTask('לפתור תקלה', 'פיתוח')}>
                    + לפתור תקלה
                  </button>
                </div>
              </div>

              <div className="dashboard-list">
                {relatedTasks.map(t => (
                  <div key={t.id} className="dashboard-list-item clickable" onClick={() => onTaskClick && onTaskClick(t)}>
                    <div className="dashboard-item-info">
                      <div className="item-title">{t.title}</div>
                      <div className="item-meta">
                        <span>תחום: {t.domain}</span> • <span>יעד: {t.dueDate || '-'}</span>
                      </div>
                    </div>
                    <span className={`badge status-${t.status}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HTML Confirm Soft Delete Modal (Recycle Bin) */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={`העברת ${isLead ? 'ליד' : 'לקוח'} לסל המחזור`}
        message={`הרשומה "${contact.businessName}" תועבר לסל המחזור ותישמר לשם בטיחות ל-30 ימים, עד למחיקתה לצמיתות. תוכל לשחזר אותה בכל עת מתוך לשונית "סל מחזור" ב-CRM.`}
        confirmText="העבר לסל המחזור"
        cancelText="ביטול"
        onConfirm={handleExecuteSoftDeleteContact}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
