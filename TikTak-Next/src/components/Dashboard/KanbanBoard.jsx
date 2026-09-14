import React from 'react';
import { FileText, CheckCircle2, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { formatDate, getPriorityStyle } from '../../utils/helpers';

export function KanbanBoard({ tasks, statuses, projects, suppliers, onTaskClick }) {
  const getProjectName = (projId) => {
    const p = projects.find(item => item.id === projId);
    return p ? p.name : projId;
  };

  const getSupplierName = (supId) => {
    const s = suppliers.find(item => item.id === supId);
    return s ? s.name : 'ללא ספק';
  };

  return (
    <div className="kanban-grid">
      {statuses.map((status) => {
        const statusTasks = tasks.filter((t) => t.status === status.name);

        return (
          <div key={status.id} className="kanban-column">
            <div className="kanban-column-header">
              <div className="kanban-column-title">
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: status.color, display: 'inline-block' }}></span>
                <span>{status.name}</span>
              </div>
              <span className="kanban-count">{statusTasks.length}</span>
            </div>

            {statusTasks.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                אין משימות בסטטוס זה
              </div>
            ) : (
              statusTasks.map((task) => {
                const priorityStyle = getPriorityStyle(task.priority);
                const subtasksCount = task.subtasks?.length || 0;
                const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;

                return (
                  <div
                    key={task.id}
                    className="task-card"
                    onClick={() => onTaskClick(task)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
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

                      {task.hasPlanogram && (
                        <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#7C3AED' }}>
                          <FileText size={12} />
                          פלנוגרמה
                        </span>
                      )}
                    </div>

                    <div className="task-card-title">{task.title}</div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div>🏢 {getProjectName(task.projectId)}</div>
                      <div>🚚 ספק: {getSupplierName(task.supplierId)}</div>
                    </div>

                    {/* Progress Bar for Subtasks */}
                    {subtasksCount > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>תתי-משימות ({completedSubtasks}/{subtasksCount})</span>
                          <span>{Math.round((completedSubtasks / subtasksCount) * 100)}%</span>
                        </div>
                        <div style={{ height: '5px', width: '100%', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${(completedSubtasks / subtasksCount) * 100}%`,
                              background: 'var(--primary)',
                              transition: 'width 0.3s ease'
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="task-card-footer">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} />
                        <span>יעד: {formatDate(task.dueDate)}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {task.commentsCount > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <MessageSquare size={13} />
                            <span>{task.commentsCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
