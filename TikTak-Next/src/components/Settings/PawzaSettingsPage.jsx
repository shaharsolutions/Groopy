import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  DollarSign,
  Users,
  UserPlus,
  Trash2,
  Edit2,
  RefreshCw,
  Lock,
  UserCheck,
  Plus,
  X,
  CheckCircle2,
  Save,
  Image
} from 'lucide-react';
import { db } from '../../services/db';
import { ConfirmModal } from '../Common/ConfirmModal';

export function PawzaSettingsPage({ users = [], packages = [], onResetMock, currentRole = 'admin', showToast }) {
  const [basicPrice, setBasicPrice] = useState(250);
  const [proPrice, setProPrice] = useState(350);
  const [premiumPrice, setPremiumPrice] = useState(500);

  // User Add Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState('employee');
  const [newUserStatus, setNewUserStatus] = useState('פעיל');
  const [newUserAvatar, setNewUserAvatar] = useState('');

  // User Edit Modal State
  const [editingUser, setEditingUser] = useState(null);

  // HTML Confirm Modals State
  const [deletingUser, setDeletingUser] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    db.addUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim(),
      role: newUserRole,
      status: newUserStatus,
      avatar: newUserAvatar.trim() || undefined
    });

    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserAvatar('');
    setShowAddUserModal(false);
    if (showToast) showToast('המשתמש נוסף בהצלחה למערכת!', 'success');
  };

  const handleSaveEditUser = (e) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name.trim()) return;

    db.updateUser(editingUser.id, {
      name: editingUser.name.trim(),
      email: editingUser.email.trim(),
      phone: editingUser.phone?.trim() || '',
      role: editingUser.role,
      status: editingUser.status,
      avatar: editingUser.avatar?.trim() || ''
    });

    if (showToast) showToast(`פרטי המשתמש ${editingUser.name} עודכנו בהצלחה!`, 'success');
    setEditingUser(null);
  };

  const handleUpdateUserStatus = (userId, newStatus) => {
    db.updateUser(userId, { status: newStatus });
    if (showToast) showToast('סטטוס המשתמש עודכן', 'info');
  };

  const handleUpdateUserRole = (userId, newRole) => {
    db.updateUser(userId, { role: newRole });
    if (showToast) showToast('תפקיד המשתמש עודכן', 'info');
  };

  const handleExecuteDeleteUser = () => {
    if (!deletingUser) return;
    db.deleteUser(deletingUser.id);
    if (showToast) showToast(`המשתמש ${deletingUser.name} נמחק`, 'error');
    setDeletingUser(null);
  };

  const handleExecuteResetMock = () => {
    onResetMock();
    if (showToast) showToast("נתוני המערכת אופסו בהצלחה לנתוני ברירת המחדל!", "info");
    setShowResetConfirm(false);
  };

  return (
    <div className="pawza-settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">הגדרות מערכת PAWZA</h1>
          <p className="page-subtitle">ניהול משתמשים והרשאות, חבילות מחיר ואיפוס נתונים</p>
        </div>
      </div>

      {/* User Management Section (Main Priority for System Admin) */}
      <div className="dashboard-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} color="var(--primary)" />
            <h3>ניהול משתמשי המערכת והרשאות</h3>
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => setShowAddUserModal(true)}>
            <UserPlus size={16} />
            <span>משתמש חדש</span>
          </button>
        </div>

        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
          אזור זה מורשה למנהל המערכת בלבד לצורך הוספה, עריכת כל הנתונים, עדכון הרשאות ושינוי תפקידים בצוות PAWZA.
        </p>

        <div className="table-responsive monday-table-wrapper">
          <table className="monday-table">
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>שם המשתמש</th>
                <th style={{ minWidth: '180px' }}>אימייל</th>
                <th style={{ width: '130px' }}>טלפון</th>
                <th style={{ width: '180px' }}>תפקיד / הרשאה</th>
                <th style={{ width: '120px' }}>סטטוס</th>
                <th style={{ width: '110px', textAlign: 'center' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="monday-task-row">
                  <td className="task-title-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={u.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"}
                        alt={u.name}
                        style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <strong>{u.name}</strong>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone || '-'}</td>

                  <td>
                    <select
                      className="inline-select"
                      value={u.role || 'employee'}
                      onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                    >
                      <option value="admin">מנהל מערכת (Admin)</option>
                      <option value="project_manager">מובילת פרויקט</option>
                      <option value="employee">חבר צוות</option>
                      <option value="viewer">צופה (קריאה בלבד)</option>
                    </select>
                  </td>

                  <td>
                    <select
                      className={`inline-select ${u.status === 'פעיל' ? 'status-הושלם' : 'status-בוטל'}`}
                      value={u.status || 'פעיל'}
                      onChange={(e) => handleUpdateUserStatus(u.id, e.target.value)}
                    >
                      <option value="פעיל">פעיל</option>
                      <option value="לא פעיל">לא פעיל</option>
                    </select>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        className="icon-btn-sm"
                        onClick={() => setEditingUser({ ...u })}
                        title="ערוך את כל נתוני המשתמש"
                      >
                        <Edit2 size={15} color="var(--primary)" />
                      </button>

                      <button
                        className="icon-btn-sm text-danger"
                        onClick={() => setDeletingUser(u)}
                        title="מחק משתמש"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-grid-2col">
        {/* Packages Configuration */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3><DollarSign size={18} color="#10B981" /> חבילות PAWZA ומחירים חודשיים</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label">חבילה בסיסית (₪/חודש)</label>
              <input
                type="number"
                className="form-input"
                value={basicPrice}
                onChange={(e) => setBasicPrice(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">חבילת Pro (₪/חודש)</label>
              <input
                type="number"
                className="form-input"
                value={proPrice}
                onChange={(e) => setProPrice(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">חבילת Premium (₪/חודש)</label>
              <input
                type="number"
                className="form-input"
                value={premiumPrice}
                onChange={(e) => setPremiumPrice(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => showToast && showToast("הגדרות החבילות נשמרו בהצלחה!", "success")}
            >
              שמור חבילות
            </button>
          </div>
        </div>

        {/* System Safety & Reset Data */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3><ShieldCheck size={18} color="var(--primary)" /> איפוס נתוני מערכת ובידוד</h3>
          </div>

          <p className="text-muted" style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
            מערכת TikTak V2 מבודדת לחלוטין. כפתור זה מאפס את כל נתוני המשימות, הלידים, הלקוחות והמשתמשים לערכי ברירת המחדל הראשוניים.
          </p>

          <button
            className="btn btn-danger"
            onClick={() => setShowResetConfirm(true)}
          >
            <RefreshCw size={16} />
            <span>איפוס נתוני המערכת</span>
          </button>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.2rem' }}>
                <UserPlus size={20} color="var(--primary)" />
                <span>הוספת משתמש חדש למערכת</span>
              </div>
              <button className="icon-btn-sm" onClick={() => setShowAddUserModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">שם המשתמש *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="לדוגמה: יובל כהן"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">כתובת אימייל *</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    placeholder="yuval@pawza.co.il"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">מספר טלפון</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="05X-XXXXXXX"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">קישור לתמונת פרופיל / אווטאר (אופציונלי)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://..."
                    value={newUserAvatar}
                    onChange={(e) => setNewUserAvatar(e.target.value)}
                  />
                </div>

                <div className="fields-2col">
                  <div className="form-group">
                    <label className="form-label">תפקיד / הרשאה</label>
                    <select
                      className="form-select"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="admin">מנהל מערכת (Admin)</option>
                      <option value="project_manager">מובילת פרויקט</option>
                      <option value="employee">חבר צוות</option>
                      <option value="viewer">צופה (קריאה בלבד)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">סטטוס</label>
                    <select
                      className="form-select"
                      value={newUserStatus}
                      onChange={(e) => setNewUserStatus(e.target.value)}
                    >
                      <option value="פעיל">פעיל</option>
                      <option value="לא פעיל">לא פעיל</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>ביטול</button>
                <button type="submit" className="btn btn-primary">הוסף משתמש</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.2rem' }}>
                <Edit2 size={20} color="var(--primary)" />
                <span>עריכת כל נתוני המשתמש - {editingUser.name}</span>
              </div>
              <button className="icon-btn-sm" onClick={() => setEditingUser(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveEditUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">שם המשתמש *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">כתובת אימייל *</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">מספר טלפון</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">קישור לתמונת פרופיל / אווטאר</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingUser.avatar || ''}
                    placeholder="https://..."
                    onChange={(e) => setEditingUser({ ...editingUser, avatar: e.target.value })}
                  />
                </div>

                <div className="fields-2col">
                  <div className="form-group">
                    <label className="form-label">תפקיד / הרשאה</label>
                    <select
                      className="form-select"
                      value={editingUser.role || 'employee'}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    >
                      <option value="admin">מנהל מערכת (Admin)</option>
                      <option value="project_manager">מובילת פרויקט</option>
                      <option value="employee">חבר צוות</option>
                      <option value="viewer">צופה (קריאה בלבד)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">סטטוס משתמש</label>
                    <select
                      className="form-select"
                      value={editingUser.status || 'פעיל'}
                      onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                    >
                      <option value="פעיל">פעיל</option>
                      <option value="לא פעיל">לא פעיל</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} />
                  <span>שמור שינויים</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HTML Confirm Delete User Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingUser)}
        title="אישור מחיקת משתמש"
        message={deletingUser ? `האם אתה בטוח שברצונך למחוק את המשתמש "${deletingUser.name}" מהמערכת?` : ''}
        confirmText="מחק משתמש"
        cancelText="ביטול"
        onConfirm={handleExecuteDeleteUser}
        onCancel={() => setDeletingUser(null)}
      />

      {/* HTML Confirm Reset Mock Data Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="אישור איפוס נתוני מערכת"
        message="אזהרה: פעולה זו תאפס את כל המשימות, הלידים, הלקוחות והמשתמשים במערכת לערכי ברירת המחדל. האם להמשיך?"
        confirmText="איפוס מוחלט"
        cancelText="ביטול"
        onConfirm={handleExecuteResetMock}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
