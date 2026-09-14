import React from 'react';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Truck,
  ShieldAlert,
  UserCheck,
  ArrowUpRight,
  TrendingUp,
  Activity,
  CalendarDays
} from 'lucide-react';

export function MainDashboardView({
  projects = [],
  tasks = [],
  suppliers = [],
  users = [],
  auditLogs = [],
  onNavigateWithFilter,
  onTaskClick
}) {
  const activeProjectsCount = projects.filter(p => p.status !== 'הושלם' && !p.isArchived).length;
  const openTasks = tasks.filter(t => t.status !== 'הושלם' && t.status !== 'אושר והושלם');

  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = openTasks.filter(t => t.dueDate && t.dueDate < today);
  const completedThisWeek = tasks.filter(t => t.status === 'הושלם' || t.status === 'אושר והושלם');
  const highPriorityTasks = openTasks.filter(t => t.priority === 'גבוהה' || t.priority === 'דחופה');
  const waitingSupplierTasks = openTasks.filter(t => t.status.includes('ספק') || t.status === 'נשלח לספק' || t.status === 'ממתין לתשובת ספק');
  const waitingApprovalTasks = openTasks.filter(t => t.status.includes('אישור'));
  const projectsAtRisk = projects.filter(p => p.priority === 'דחופה' && p.progress < 50);

  // Status breakdown calculations
  const statusCounts = {};
  tasks.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  // Project breakdown calculations
  const projectTaskCounts = projects.map(p => {
    const pTasks = tasks.filter(t => t.projectId === p.id);
    const completed = pTasks.filter(t => t.status === 'הושלם' || t.status === 'אושר והושלם').length;
    return {
      id: p.id,
      name: p.name,
      total: pTasks.length,
      completed,
      progress: pTasks.length ? Math.round((completed / pTasks.length) * 100) : 0
    };
  });

  // User workload calculations
  const userWorkload = users.map(u => {
    const uTasks = openTasks.filter(t => t.assigneeId === u.id);
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      openCount: uTasks.length
    };
  });

  return (
    <div className="main-dashboard-container">
      {/* Dashboard Title Banner */}
      <div className="dashboard-welcome-header">
        <div>
          <h1 className="dashboard-title">תמונת מצב כללית (TikTak V2 Dashboard)</h1>
          <p className="dashboard-subtitle">
            מעקב בלייב אחר פרויקטים, משימות יבוא מסין, ספקים ועומסי עבודה
          </p>
        </div>
        <div className="date-badge">
          <CalendarDays size={16} />
          <span>{new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div
          className="kpi-card clickable"
          onClick={() => onNavigateWithFilter && onNavigateWithFilter('all_projects', {})}
        >
          <div className="kpi-icon-wrapper blue">
            <FolderKanban size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{activeProjectsCount}</div>
            <div className="kpi-label">פרויקטים פעילים</div>
          </div>
          <ArrowUpRight size={18} className="kpi-arrow" />
        </div>

        <div
          className="kpi-card clickable"
          onClick={() => onNavigateWithFilter && onNavigateWithFilter('tasks_list', { status: 'open' })}
        >
          <div className="kpi-icon-wrapper indigo">
            <Activity size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{openTasks.length}</div>
            <div className="kpi-label">משימות פתוחות</div>
          </div>
          <ArrowUpRight size={18} className="kpi-arrow" />
        </div>

        <div
          className="kpi-card clickable highlight-red"
          onClick={() => onNavigateWithFilter && onNavigateWithFilter('tasks_list', { overdue: true })}
        >
          <div className="kpi-icon-wrapper red">
            <AlertTriangle size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value red-text">{overdueTasks.length}</div>
            <div className="kpi-label">משימות באיחור</div>
          </div>
          <ArrowUpRight size={18} className="kpi-arrow" />
        </div>

        <div
          className="kpi-card clickable"
          onClick={() => onNavigateWithFilter && onNavigateWithFilter('tasks_list', { status: 'completed' })}
        >
          <div className="kpi-icon-wrapper green">
            <CheckCircle2 size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value green-text">{completedThisWeek.length}</div>
            <div className="kpi-label">משימות שהושלמו</div>
          </div>
          <ArrowUpRight size={18} className="kpi-arrow" />
        </div>

        <div
          className="kpi-card clickable"
          onClick={() => onNavigateWithFilter && onNavigateWithFilter('tasks_list', { priority: 'גבוהה' })}
        >
          <div className="kpi-icon-wrapper orange">
            <Zap size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{highPriorityTasks.length}</div>
            <div className="kpi-label">בעדיפות גבוהה / דחופה</div>
          </div>
          <ArrowUpRight size={18} className="kpi-arrow" />
        </div>

        <div
          className="kpi-card clickable"
          onClick={() => onNavigateWithFilter && onNavigateWithFilter('tasks_list', { supplier: 'all' })}
        >
          <div className="kpi-icon-wrapper purple">
            <Truck size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{waitingSupplierTasks.length}</div>
            <div className="kpi-label">ממתין לטיפול ספק</div>
          </div>
          <ArrowUpRight size={18} className="kpi-arrow" />
        </div>

        <div
          className="kpi-card clickable"
          onClick={() => onNavigateWithFilter && onNavigateWithFilter('tasks_list', { status: 'ממתין לאישור' })}
        >
          <div className="kpi-icon-wrapper yellow">
            <ShieldAlert size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{waitingApprovalTasks.length}</div>
            <div className="kpi-label">ממתין לאישור אדמין</div>
          </div>
          <ArrowUpRight size={18} className="kpi-arrow" />
        </div>

        <div
          className="kpi-card clickable"
          onClick={() => onNavigateWithFilter && onNavigateWithFilter('all_projects', { risk: true })}
        >
          <div className="kpi-icon-wrapper rose">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{projectsAtRisk.length}</div>
            <div className="kpi-label">פרויקטים בסיכון</div>
          </div>
          <ArrowUpRight size={18} className="kpi-arrow" />
        </div>
      </div>

      {/* Analytics & Charts Row */}
      <div className="dashboard-grid-2col">
        {/* Status Distribution */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>תפלגות משימות לפי סטטוס</h3>
            <span className="card-subtitle">לחץ על סטטוס לסינון</span>
          </div>
          <div className="status-bars-container">
            {Object.entries(statusCounts).map(([status, count]) => {
              const pct = Math.round((count / tasks.length) * 100);
              return (
                <div
                  key={status}
                  className="status-bar-item clickable"
                  onClick={() => onNavigateWithFilter && onNavigateWithFilter('tasks_list', { status })}
                >
                  <div className="status-bar-info">
                    <span className="status-name">{status}</span>
                    <span className="status-count">{count} משימות ({pct}%)</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: status.includes('הושלם') ? '#10B981' : status.includes('אישור') ? '#F59E0B' : '#3B82F6'
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Projects Progress */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>התקדמות פרויקטים פעילים</h3>
            <button className="text-btn" onClick={() => onNavigateWithFilter && onNavigateWithFilter('all_projects', {})}>
              לכל הפרויקטים ←
            </button>
          </div>
          <div className="project-progress-list">
            {projectTaskCounts.map(p => (
              <div
                key={p.id}
                className="project-progress-item clickable"
                onClick={() => onNavigateWithFilter && onNavigateWithFilter('project_detail', { projectId: p.id })}
              >
                <div className="project-progress-header">
                  <span className="project-title">{p.name}</span>
                  <span className="project-pct">{p.progress}% ({p.completed}/{p.total})</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${p.progress}%`,
                      backgroundColor: p.progress > 70 ? '#10B981' : p.progress > 40 ? '#3B82F6' : '#F59E0B'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Workload & Recent Activity */}
      <div className="dashboard-grid-2col" style={{ marginTop: '24px' }}>
        {/* User Workload */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>עומס משימות לפי משתמש</h3>
          </div>
          <div className="workload-list">
            {userWorkload.map(u => (
              <div key={u.id} className="workload-item">
                <div className="user-avatar-badge">
                  <UserCheck size={18} />
                </div>
                <div className="workload-user-info">
                  <div className="user-name">{u.name}</div>
                  <div className="user-role">{u.role}</div>
                </div>
                <div className="workload-count-badge">
                  <strong>{u.openCount}</strong> משימות פתוחות
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent System Activity */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>הפעילות האחרונה במערכת</h3>
          </div>
          <div className="activity-timeline">
            {auditLogs.slice(0, 5).map(log => (
              <div key={log.id} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-action">{log.action}</div>
                  <div className="timeline-details">{log.details}</div>
                  <div className="timeline-time">
                    {new Date(log.timestamp).toLocaleDateString('he-IL', { hour: '2-digit', minute: '2-digit' })} • {log.userName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
