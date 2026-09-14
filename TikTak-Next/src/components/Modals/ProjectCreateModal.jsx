import React, { useState } from 'react';
import { X, Sparkles, FolderPlus } from 'lucide-react';
import { INITIAL_PROJECT_TEMPLATES } from '../../data/mockInitialData';

export function ProjectCreateModal({ users = [], onClose, onProjectCreated }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState(`PRJ-${Math.floor(1000 + Math.random() * 9000)}`);
  const [network, setNetwork] = useState('שופרסל');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState(users[0]?.id || 'usr_admin1');
  const [dueDate, setDueDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    let groups = [
      { id: `grp_${Date.now()}_1`, name: "חדש", color: "#64748B", orderIndex: 0 },
      { id: `grp_${Date.now()}_2`, name: "בביצוע", color: "#2563EB", orderIndex: 1 },
      { id: `grp_${Date.now()}_3`, name: "הושלם", color: "#16A34A", orderIndex: 2 }
    ];

    if (selectedTemplate) {
      const tpl = INITIAL_PROJECT_TEMPLATES.find(t => t.id === selectedTemplate);
      if (tpl && tpl.defaultGroups) {
        groups = tpl.defaultGroups.map((gName, idx) => ({
          id: `grp_${Date.now()}_${idx}`,
          name: gName,
          color: idx === 0 ? "#3B82F6" : idx === 1 ? "#8B5CF6" : idx === 2 ? "#F59E0B" : "#10B981",
          orderIndex: idx
        }));
      }
    }

    const newProject = {
      name,
      code,
      network,
      description,
      managerId,
      dueDate,
      icon: network === 'שופרסל' ? '❄️' : network === 'יוחננוף' ? '🛍️' : '🛒',
      groups
    };

    if (onProjectCreated) onProjectCreated(newProject);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.2rem' }}>
            <FolderPlus size={22} color="var(--primary)" />
            <span>הקמת פרויקט חדש</span>
          </div>
          <button className="icon-btn-sm" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Template Picker */}
            <div className="form-group">
              <label className="form-label">בחירת תבנית (אופציונלי)</label>
              <select
                className="form-select"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                <option value="">פרויקט רגיל (ללא תבנית)</option>
                {INITIAL_PROJECT_TEMPLATES.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name} ({tpl.description})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">שם הפרויקט *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="לדוגמה: פרויקט מקררים ומדפים - שופרסל סניף X"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="fields-2col">
              <div className="form-group">
                <label className="form-label">קוד פרויקט</label>
                <input
                  type="text"
                  className="form-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">רשת קמעונאית</label>
                <select
                  className="form-select"
                  value={network}
                  onChange={(e) => setNetwork(e.target.value)}
                >
                  <option value="שופרסל">שופרסל</option>
                  <option value="יוחננוף">יוחננוף</option>
                  <option value="רמי לוי">רמי לוי</option>
                  <option value="חצי חינם">חצי חינם</option>
                  <option value="פרטי / אחר">פרטי / אחר</option>
                </select>
              </div>
            </div>

            <div className="fields-2col">
              <div className="form-group">
                <label className="form-label">מנהל פרויקט</label>
                <select
                  className="form-select"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">תאריך יעד לסיום</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">תיאור הפרויקט</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="פירוט מטרת הפרויקט, יעדים, דגשים..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className="btn btn-primary">
              צור פרויקט
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
