import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  Calendar,
  User,
  Tag,
  Copy,
  Archive,
  Trash2,
  ExternalLink,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export function ProjectsListPage({
  projects = [],
  tasks = [],
  users = [],
  onSelectProject,
  onCreateProjectClick,
  onDuplicateProject,
  onArchiveProject,
  onDeleteProject
}) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const filteredProjects = projects.filter(p => {
    if (showArchived ? !p.isArchived : p.isArchived) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.network?.toLowerCase().includes(q)
    );
  });

  const getUserName = (id) => {
    const u = users.find(usr => usr.id === id);
    return u ? u.name : id;
  };

  return (
    <div className="projects-page-container">
      {/* Top Header & Actions */}
      <div className="page-header">
        <div>
          <h1 className="page-title">ניהול כל הפרויקטים</h1>
          <p className="page-subtitle">ניהול, מעקב ושכפול פרויקטי תצוגה ויבוא מסין</p>
        </div>
        <button className="btn btn-primary" onClick={onCreateProjectClick}>
          <Plus size={18} />
          <span>פרויקט חדש</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="חיפוש פרויקט לפי שם, קוד או רשת..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="בביצוע">בביצוע</option>
            <option value="תכנון">תכנון</option>
            <option value="הושלם">הושלם</option>
          </select>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <span>הצג ארכיון</span>
          </label>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="תצוגת כרטיסים"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="תצוגת טבלה"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Display */}
      {filteredProjects.length === 0 ? (
        <div className="empty-state">
          <FolderKanban size={48} className="text-muted" />
          <h3>לא נמצאו פרויקטים תואמים</h3>
          <p>נסה לשנות את חיפוש הסינון או צור פרויקט חדש</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="projects-grid">
          {filteredProjects.map(project => {
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            const openCount = projectTasks.filter(t => t.status !== 'הושלם').length;
            const overdueCount = projectTasks.filter(t => t.dueDate && t.dueDate < new Date().toISOString().split('T')[0] && t.status !== 'הושלם').length;

            return (
              <div key={project.id} className="project-card">
                <div className="project-card-header">
                  <div className="project-card-icon">{project.icon || '📁'}</div>
                  <div className="project-card-title-group">
                    <h3 className="project-card-title" onClick={() => onSelectProject(project.id)}>
                      {project.name}
                    </h3>
                    <span className="project-code-badge">{project.code}</span>
                  </div>
                  <div className="project-actions-dropdown">
                    <button
                      className="icon-btn-sm"
                      onClick={() => onDuplicateProject(project.id)}
                      title="שכפל פרויקט"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="icon-btn-sm"
                      onClick={() => onArchiveProject(project.id, !project.isArchived)}
                      title="ארכב פרויקט"
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                </div>

                <p className="project-card-desc">{project.description}</p>

                {/* Progress Bar */}
                <div className="project-card-progress">
                  <div className="progress-label">
                    <span>התקדמות</span>
                    <strong>{project.progress}%</strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${project.progress}%`,
                        backgroundColor: project.progress > 70 ? '#10B981' : '#3B82F6'
                      }}
                    ></div>
                  </div>
                </div>

                {/* Metrics Badges */}
                <div className="project-metrics-row">
                  <span className="metric-tag">
                    {projectTasks.length} משימות
                  </span>
                  {openCount > 0 && (
                    <span className="metric-tag blue">
                      {openCount} פתוחות
                    </span>
                  )}
                  {overdueCount > 0 && (
                    <span className="metric-tag red">
                      <AlertCircle size={12} />
                      {overdueCount} באיחור
                    </span>
                  )}
                </div>

                {/* Footer Info */}
                <div className="project-card-footer">
                  <div className="project-manager-info">
                    <User size={14} />
                    <span>{getUserName(project.managerId)}</span>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onSelectProject(project.id)}
                  >
                    <span>כניסה לפרויקט</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>שם הפרויקט</th>
                <th>קוד</th>
                <th>רשת</th>
                <th>סטטוס</th>
                <th>מנהל פרויקט</th>
                <th>תאריך יעד</th>
                <th>התקדמות</th>
                <th>משימות</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(project => {
                const projectTasks = tasks.filter(t => t.projectId === project.id);
                return (
                  <tr key={project.id}>
                    <td>
                      <div
                        className="project-table-name clickable"
                        onClick={() => onSelectProject(project.id)}
                      >
                        <span>{project.icon || '📁'}</span>
                        <strong>{project.name}</strong>
                      </div>
                    </td>
                    <td><code>{project.code}</code></td>
                    <td>{project.network || '-'}</td>
                    <td>
                      <span className={`badge status-${project.status}`}>
                        {project.status}
                      </span>
                    </td>
                    <td>{getUserName(project.managerId)}</td>
                    <td>{project.dueDate || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px' }}>
                        <div className="progress-track" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${project.progress}%`, backgroundColor: '#3B82F6' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{project.progress}%</span>
                      </div>
                    </td>
                    <td>{projectTasks.length}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="icon-btn-sm" onClick={() => onSelectProject(project.id)} title="פתח פרויקט">
                          <ExternalLink size={15} />
                        </button>
                        <button className="icon-btn-sm" onClick={() => onDuplicateProject(project.id)} title="שכפל">
                          <Copy size={15} />
                        </button>
                        <button className="icon-btn-sm" onClick={() => onDeleteProject(project.id)} title="מחק">
                          <Trash2 size={15} color="#EF4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
