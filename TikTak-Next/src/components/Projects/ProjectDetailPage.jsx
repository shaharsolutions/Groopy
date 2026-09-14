import React, { useState } from 'react';
import {
  ArrowRight,
  Plus,
  Share2,
  Settings,
  Table as TableIcon,
  Kanban,
  Calendar as CalendarIcon,
  Clock,
  FolderDown,
  Activity,
  BarChart2,
  Users,
  CheckCircle2
} from 'lucide-react';
import { TaskTableView } from '../Tasks/TaskTableView';
import { KanbanBoard } from '../Dashboard/KanbanBoard';

export function ProjectDetailPage({
  project,
  tasks = [],
  suppliers = [],
  statuses = [],
  users = [],
  onBack,
  onTaskClick,
  onNewTaskClick,
  onTaskUpdate,
  onTaskDelete,
  onTaskGroupAdd,
  onBulkAction,
  showToast
}) {
  const [activeSubTab, setActiveSubTab] = useState('tasks_table');

  if (!project) return <div>פרויקט לא נמצא</div>;

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const completedCount = projectTasks.filter(t => t.status === 'הושלם' || t.status === 'אושר והושלם').length;
  const progressPct = projectTasks.length ? Math.round((completedCount / projectTasks.length) * 100) : project.progress || 0;

  return (
    <div className="project-detail-container">
      {/* Back Button & Header */}
      <div className="project-detail-top-nav">
        <button className="text-btn back-btn" onClick={onBack}>
          <ArrowRight size={18} />
          <span>חזרה לכל הפרויקטים</span>
        </button>

        <div className="project-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => showToast && showToast(`קישור שיתוף פרויקט ${project.name} הועתק ללוח`, 'info')}>
            <Share2 size={16} />
            <span>שיתוף פרויקט</span>
          </button>
          <button className="btn btn-secondary btn-sm">
            <Settings size={16} />
            <span>הגדרות פרויקט</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={onNewTaskClick}>
            <Plus size={16} />
            <span>משימה חדשה</span>
          </button>
        </div>
      </div>

      {/* Project Banner Header */}
      <div className="project-banner-card">
        <div className="project-banner-left">
          <div className="project-banner-icon">{project.icon || '❄️'}</div>
          <div>
            <div className="project-banner-title">
              <h2>{project.name}</h2>
              <span className="project-code-badge">{project.code}</span>
              <span className="badge status-badge">{project.status}</span>
            </div>
            <p className="project-banner-desc">{project.description}</p>
          </div>
        </div>

        <div className="project-banner-right">
          <div className="banner-stat-box">
            <div className="banner-stat-val">{progressPct}%</div>
            <div className="banner-stat-lbl">התקדמות כללית</div>
            <div className="progress-track" style={{ width: '120px', marginTop: '4px' }}>
              <div className="progress-fill" style={{ width: `${progressPct}%`, backgroundColor: '#10B981' }}></div>
            </div>
          </div>

          <div className="banner-stat-box">
            <div className="banner-stat-val">{projectTasks.length}</div>
            <div className="banner-stat-lbl">סה"כ משימות ({completedCount} הושלמו)</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="project-subtabs-bar">
        <button
          className={`subtab-btn ${activeSubTab === 'tasks_table' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('tasks_table')}
        >
          <TableIcon size={16} />
          <span>טבלת משימות</span>
        </button>
        <button
          className={`subtab-btn ${activeSubTab === 'kanban' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('kanban')}
        >
          <Kanban size={16} />
          <span>Kanban</span>
        </button>
        <button
          className={`subtab-btn ${activeSubTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('calendar')}
        >
          <CalendarIcon size={16} />
          <span>לוח שנה</span>
        </button>
        <button
          className={`subtab-btn ${activeSubTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('timeline')}
        >
          <Clock size={16} />
          <span>Timeline / Gantt</span>
        </button>
        <button
          className={`subtab-btn ${activeSubTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('files')}
        >
          <FolderDown size={16} />
          <span>מרכז קבצים</span>
        </button>
        <button
          className={`subtab-btn ${activeSubTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('activity')}
        >
          <Activity size={16} />
          <span>פעילות</span>
        </button>
      </div>

      {/* Subtab Content Rendering */}
      <div className="subtab-content-area">
        {activeSubTab === 'tasks_table' && (
          <TaskTableView
            tasks={projectTasks}
            suppliers={suppliers}
            users={users}
            statuses={statuses}
            onTaskClick={onTaskClick}
            onTaskUpdate={onTaskUpdate}
            onTaskDelete={onTaskDelete}
          />
        )}

        {activeSubTab === 'kanban' && (
          <KanbanBoard
            tasks={projectTasks}
            statuses={statuses}
            suppliers={suppliers}
            onTaskClick={onTaskClick}
          />
        )}

        {activeSubTab === 'calendar' && (
          <div className="dashboard-card" style={{ textAlign: 'center', padding: '40px' }}>
            <CalendarIcon size={48} color="var(--primary)" />
            <h3 style={{ marginTop: '12px' }}>תצוגת לוח שנה פרויקטלי</h3>
          </div>
        )}

        {activeSubTab === 'timeline' && (
          <div className="dashboard-card" style={{ textAlign: 'center', padding: '40px' }}>
            <Clock size={48} color="#8B5CF6" />
            <h3 style={{ marginTop: '12px' }}>תצוגת Timeline / ציר זמן משימות</h3>
          </div>
        )}

        {activeSubTab === 'files' && (
          <div className="dashboard-card">
            <h3>קבצים ומסמכים מקושרים לפרויקט</h3>
          </div>
        )}

        {activeSubTab === 'activity' && (
          <div className="dashboard-card">
            <h3>יומן פעילות ועדכונים לפרויקט</h3>
          </div>
        )}
      </div>
    </div>
  );
}
