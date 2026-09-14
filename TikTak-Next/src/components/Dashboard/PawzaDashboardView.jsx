import React from 'react';
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  UserPlus,
  Building2,
  PhoneCall,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  MessageCircle,
  Check
} from 'lucide-react';

export function PawzaDashboardView({
  tasks = [],
  contacts = [],
  users = [],
  onNavigateTab,
  onTaskUpdate,
  onContactUpdate,
  onTaskClick,
  onContactClick,
  showToast
}) {
  const openTasks = tasks.filter(t => t.status !== 'הושלם' && t.status !== 'בוטל');
  const overdueTasks = openTasks.filter(t => t.dueDate && t.dueDate < new Date().toISOString().split('T')[0]);
  const urgentTasks = openTasks.filter(t => t.priority === 'דחופה');
  const waitingTasks = openTasks.filter(t => t.status === 'ממתין');
  const completedThisWeek = tasks.filter(t => t.status === 'הושלם');

  const leads = contacts.filter(c => c.contactType === 'lead');
  const customers = contacts.filter(c => c.contactType === 'customer');

  const todayStr = new Date().toISOString().split('T')[0];
  const followupsToday = contacts.filter(c => c.nextFollowUpDate && c.nextFollowUpDate <= todayStr);
  const onboardingCustomers = customers.filter(c => c.customerStatus === 'בתהליך הצטרפות' || c.customerStatus === 'בתקופת ניסיון');
  const activeCustomers = customers.filter(c => c.customerStatus === 'פעיל');
  const attentionCustomers = customers.filter(c => c.customerStatus === 'ממתין לתשלום' || c.customerStatus === 'דורש טיפול');

  // Status counts for mini status chart
  const statusCounts = {
    "לביצוע": tasks.filter(t => t.status === 'לביצוע').length,
    "בתהליך": tasks.filter(t => t.status === 'בתהליך').length,
    "ממתין": tasks.filter(t => t.status === 'ממתין').length,
    "לבדיקה": tasks.filter(t => t.status === 'לבדיקה').length,
    "הושלם": tasks.filter(t => t.status === 'הושלם').length,
  };

  return (
    <div className="pawza-dashboard-container">
      {/* Top Greeting Banner */}
      <div className="dashboard-welcome-header">
        <div>
          <h1 className="dashboard-title">לוח בקרה תפעולי - PAWZA</h1>
          <p className="dashboard-subtitle">תמונת מצב מרוכזת של משימות הפיתוח, העיצוב, הלידים ופנסיונים פעילים</p>
        </div>
        <div className="date-badge">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Cards: Tasks Overview */}
      <div className="kpi-section-title">תמונת מצב משימות פיתוח, עיצוב ושיווק</div>
      <div className="kpi-grid">
        <div className="kpi-card clickable" onClick={() => onNavigateTab('tasks')}>
          <div className="kpi-icon-wrapper blue">
            <CheckSquare size={22} />
          </div>
          <div>
            <div className="kpi-value">{openTasks.length}</div>
            <div className="kpi-label">משימות פתוחות לביצוע</div>
          </div>
          <ArrowUpRight size={16} className="kpi-arrow" />
        </div>

        <div className={`kpi-card clickable ${overdueTasks.length > 0 ? 'highlight-red' : ''}`} onClick={() => onNavigateTab('tasks')}>
          <div className="kpi-icon-wrapper red">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="kpi-value red-text">{overdueTasks.length}</div>
            <div className="kpi-label">משימות באיחור יעד</div>
          </div>
          <ArrowUpRight size={16} className="kpi-arrow" />
        </div>

        <div className="kpi-card clickable" onClick={() => onNavigateTab('tasks')}>
          <div className="kpi-icon-wrapper orange">
            <Clock size={22} />
          </div>
          <div>
            <div className="kpi-value">{urgentTasks.length}</div>
            <div className="kpi-label">משימות בעדיפות דחופה</div>
          </div>
          <ArrowUpRight size={16} className="kpi-arrow" />
        </div>

        <div className="kpi-card clickable" onClick={() => onNavigateTab('tasks')}>
          <div className="kpi-icon-wrapper yellow">
            <Clock size={22} />
          </div>
          <div>
            <div className="kpi-value">{waitingTasks.length}</div>
            <div className="kpi-label">ממתינות (אישור/מידע)</div>
          </div>
          <ArrowUpRight size={16} className="kpi-arrow" />
        </div>

        <div className="kpi-card clickable" onClick={() => onNavigateTab('tasks')}>
          <div className="kpi-icon-wrapper green">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="kpi-value green-text">{completedThisWeek.length}</div>
            <div className="kpi-label">משימות שהושלמו בהצלחה</div>
          </div>
          <ArrowUpRight size={16} className="kpi-arrow" />
        </div>
      </div>

      {/* KPI Cards: CRM Overview */}
      <div className="kpi-section-title" style={{ marginTop: '24px' }}>תמונת מצב לקוחות ולידים (CRM)</div>
      <div className="kpi-grid">
        <div className="kpi-card clickable" onClick={() => onNavigateTab('crm')}>
          <div className="kpi-icon-wrapper green">
            <UserPlus size={22} />
          </div>
          <div>
            <div className="kpi-value">{leads.length}</div>
            <div className="kpi-label">לידים פתוחים במעקב</div>
          </div>
          <ArrowUpRight size={16} className="kpi-arrow" />
        </div>

        <div className="kpi-card clickable" onClick={() => onNavigateTab('crm')}>
          <div className="kpi-icon-wrapper red">
            <PhoneCall size={22} />
          </div>
          <div>
            <div className="kpi-value red-text">{followupsToday.length}</div>
            <div className="kpi-label">מעקבים לטיפול היום</div>
          </div>
          <ArrowUpRight size={16} className="kpi-arrow" />
        </div>

        <div className="kpi-card clickable" onClick={() => onNavigateTab('crm')}>
          <div className="kpi-icon-wrapper blue">
            <Building2 size={22} />
          </div>
          <div>
            <div className="kpi-value">{onboardingCustomers.length}</div>
            <div className="kpi-label">פנסיונים בהצטרפות/ניסיון</div>
          </div>
          <ArrowUpRight size={16} className="kpi-arrow" />
        </div>

        <div className="kpi-card clickable" onClick={() => onNavigateTab('crm')}>
          <div className="kpi-icon-wrapper purple">
            <Building2 size={22} />
          </div>
          <div>
            <div className="kpi-value">{activeCustomers.length}</div>
            <div className="kpi-label">פנסיונים פעילים במערכת</div>
          </div>
          <ArrowUpRight size={16} className="kpi-arrow" />
        </div>

        <div className="kpi-card clickable" onClick={() => onNavigateTab('crm')}>
          <div className="kpi-icon-wrapper orange">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="kpi-value red-text">{attentionCustomers.length}</div>
            <div className="kpi-label">דורשים טיפול/תשלום</div>
          </div>
          <ArrowUpRight size={16} className="kpi-arrow" />
        </div>
      </div>

      {/* Main 2-Column Dashboard Layout */}
      <div className="dashboard-grid-2col" style={{ marginTop: '24px' }}>
        {/* Left Column: My Tasks List */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>המשימות הקרובות לביצוע שלי</h3>
            <button className="text-btn" onClick={() => onNavigateTab('tasks')}>הצג הכל ({openTasks.length})</button>
          </div>

          <div className="dashboard-list">
            {openTasks.slice(0, 5).map(task => (
              <div key={task.id} className="dashboard-list-item">
                <button
                  className="task-complete-check-btn"
                  onClick={() => onTaskUpdate(task.id, { status: 'הושלם' })}
                  title="סימון כהושלם"
                >
                  <Check size={14} />
                </button>

                <div className="dashboard-item-info clickable" onClick={() => onTaskClick(task)}>
                  <div className="item-title">{task.title}</div>
                  <div className="item-meta">
                    <span className={`domain-pill domain-${task.domain}`}>{task.domain}</span>
                    <span>•</span>
                    <span>יעד: {task.dueDate || 'ללא תאריך'}</span>
                    {task.contactName && (
                      <>
                        <span>•</span>
                        <strong>{task.contactName}</strong>
                      </>
                    )}
                  </div>
                </div>

                <span className={`badge status-${task.status}`}>{task.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: CRM Follow-ups + Mini Chart */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>מעקבים קרובים (CRM)</h3>
            <button className="text-btn" onClick={() => onNavigateTab('crm')}>עבור ל-CRM</button>
          </div>

          <div className="dashboard-list">
            {contacts.slice(0, 4).map(contact => (
              <div key={contact.id} className="dashboard-list-item">
                <div className="dashboard-item-info clickable" onClick={() => onContactClick(contact)}>
                  <div className="item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{contact.businessName}</span>
                    <span className={`crm-type-badge ${contact.contactType}`}>
                      {contact.contactType === 'lead' ? 'ליד' : 'לקוח'}
                    </span>
                  </div>
                  <div className="item-meta">
                    <span>פעולה הבאה: <strong>{contact.nextAction}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {contact.phone && (
                    <a
                      href={`https://wa.me/972${contact.phone.replace(/^0/, '').replace(/-/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="whatsapp-btn-sm"
                      title="שלח WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </a>
                  )}

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const nextDate = new Date();
                      nextDate.setDate(nextDate.getDate() + 3);
                      onContactUpdate(contact.id, { nextFollowUpDate: nextDate.toISOString().split('T')[0] });
                      if (showToast) showToast(`בוצע מעקב מול ${contact.businessName}. תאריך מעקב הבא עודכן.`, 'success');
                    }}
                    title="סימון שבוצע מעקב ועדכון תאריך"
                  >
                    <Check size={14} />
                    <span>בוצע</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mini Status Breakdown */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', fontWeight: 700 }}>תפרוסת משימות לפי סטטוס</h4>
            <div className="status-bars-container">
              {Object.entries(statusCounts).map(([statusName, count]) => {
                const total = tasks.length || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={statusName} className="status-bar-item">
                    <div className="status-bar-info">
                      <span>{statusName}</span>
                      <strong>{count} ({pct}%)</strong>
                    </div>
                    <div className="progress-track">
                      <div className={`progress-fill status-${statusName}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
