import React from 'react';
import { formatDate, getPriorityStyle } from '../../utils/helpers';
import { FileText, Eye } from 'lucide-react';

export function TableView({ tasks, projects, suppliers, onTaskClick }) {
  const getProjectName = (projId) => {
    const p = projects.find(item => item.id === projId);
    return p ? p.name : projId;
  };

  const getSupplierName = (supId) => {
    const s = suppliers.find(item => item.id === supId);
    return s ? s.name : 'ללא ספק';
  };

  return (
    <div style={{ marginTop: '20px', overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>שם המשימה</th>
            <th>פרויקט / רשת</th>
            <th>ספק מפתח</th>
            <th>סטטוס</th>
            <th>עדיפות</th>
            <th>תאריך יעד</th>
            <th>פלנוגרמה / קבצים</th>
            <th>תתי משימות</th>
            <th>פעולה</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                לא נמצאו משימות תואמות
              </td>
            </tr>
          ) : (
            tasks.map((t) => {
              const priorityStyle = getPriorityStyle(t.priority);
              const subCount = t.subtasks?.length || 0;
              const subDone = t.subtasks?.filter(s => s.completed).length || 0;

              return (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700 }}>{t.title}</td>
                  <td>{getProjectName(t.projectId)}</td>
                  <td>{getSupplierName(t.supplierId)}</td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563EB' }}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: priorityStyle.bg,
                        color: priorityStyle.text,
                        border: `1px solid ${priorityStyle.border}`
                      }}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td>{formatDate(t.dueDate)}</td>
                  <td>
                    {t.hasPlanogram ? (
                      <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#7C3AED' }}>
                        <FileText size={12} /> {t.planogramName || 'קיימת'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ללא</span>
                    )}
                  </td>
                  <td>
                    {subCount > 0 ? `${subDone}/${subCount} הושלמו` : '-'}
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => onTaskClick(t)}>
                      <Eye size={14} /> צפייה
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
