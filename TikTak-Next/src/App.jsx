import React, { useState, useEffect } from 'react';
import { Header } from './components/Navigation/Header';
import { Sidebar } from './components/Navigation/Sidebar';
import { PawzaDashboardView } from './components/Dashboard/PawzaDashboardView';
import { PawzaTasksPage } from './components/Tasks/PawzaTasksPage';
import { CrmPage } from './components/CRM/CrmPage';
import { PawzaCalendarPage } from './components/Calendar/PawzaCalendarPage';
import { PawzaSettingsPage } from './components/Settings/PawzaSettingsPage';
import { TaskDetailDrawer } from './components/Tasks/TaskDetailDrawer';
import { ContactDetailDrawer } from './components/CRM/ContactDetailDrawer';
import { TaskCreateModal } from './components/Modals/TaskCreateModal';
import { ContactCreateModal } from './components/Modals/ContactCreateModal';
import { Toast } from './components/Common/Toast';
import { db } from './services/db';

export function App() {
  const [dbState, setDbState] = useState(db.loadData());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentRole, setCurrentRole] = useState('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // In-app Toast state (replaces browser alerts with HTML notifications)
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Selected drawers
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [initialContactType, setInitialContactType] = useState('lead');

  useEffect(() => {
    const unsubscribe = db.subscribe((data) => {
      setDbState({ ...data });
    });
    return unsubscribe;
  }, []);

  const tasks = dbState.tasks || [];
  const contacts = dbState.contacts || [];
  const users = dbState.users || [];
  const statuses = dbState.statuses || [];
  const notifications = dbState.notifications || [];
  const packages = dbState.packages || [];

  const handleResetMockData = () => {
    db.resetToInitialMock();
    setDbState(db.loadData());
    showToast('נתוני המערכת אופסו בהצלחה!', 'info');
  };

  const handleQuickCreate = (type) => {
    if (type === 'task') {
      setShowTaskModal(true);
    } else if (type === 'lead') {
      setInitialContactType('lead');
      setShowContactModal(true);
    } else if (type === 'customer') {
      setInitialContactType('customer');
      setShowContactModal(true);
    } else if (type === 'activity') {
      setActiveTab('crm');
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        onQuickCreate={handleQuickCreate}
        onResetMockClick={handleResetMockData}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        notifications={notifications}
        onMarkAllNotificationsRead={() => db.markAllNotificationsRead()}
      />

      <div className="app-main-layout">
        {/* Strictly 5-item Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          openTasksCount={tasks.filter(t => t.status !== 'הושלם').length}
          crmFollowupsCount={contacts.filter(c => c.nextFollowUpDate && c.nextFollowUpDate <= new Date().toISOString().split('T')[0]).length}
        />

        {/* Content View Routing */}
        <main className="content-area">
          {/* 1. Dashboard View */}
          {activeTab === 'dashboard' && (
            <PawzaDashboardView
              tasks={tasks}
              contacts={contacts}
              users={users}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onTaskUpdate={(tId, updates) => db.updateTask(tId, updates)}
              onContactUpdate={(cId, updates) => db.updateContact(cId, updates)}
              onTaskClick={(task) => setSelectedTask(task)}
              onContactClick={(contact) => setSelectedContact(contact)}
              showToast={showToast}
            />
          )}

          {/* 2. Tasks Page */}
          {activeTab === 'tasks' && (
            <PawzaTasksPage
              tasks={tasks}
              contacts={contacts}
              users={users}
              statuses={statuses}
              onTaskClick={(task) => setSelectedTask(task)}
              onTaskUpdate={(tId, updates) => db.updateTask(tId, updates)}
              onTaskDelete={(tId) => db.deleteTask(tId)}
              onNewTaskClick={() => setShowTaskModal(true)}
              showToast={showToast}
            />
          )}

          {/* 3. Customers & Leads CRM Page */}
          {activeTab === 'crm' && (
            <CrmPage
              contacts={contacts}
              tasks={tasks}
              users={users}
              onSelectContact={(contact) => setSelectedContact(contact)}
              onNewContactClick={(type) => {
                setInitialContactType(type);
                setShowContactModal(true);
              }}
              onContactUpdate={(cId, updates) => db.updateContact(cId, updates)}
              showToast={showToast}
            />
          )}

          {/* 4. Calendar Page */}
          {activeTab === 'calendar' && (
            <PawzaCalendarPage
              tasks={tasks}
              contacts={contacts}
              onTaskClick={(task) => setSelectedTask(task)}
              onContactClick={(contact) => setSelectedContact(contact)}
            />
          )}

          {/* 5. Settings Page */}
          {activeTab === 'settings' && (
            <PawzaSettingsPage
              users={users}
              packages={packages}
              currentRole={currentRole}
              onResetMock={handleResetMockData}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Drawers */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          contacts={contacts}
          statuses={statuses}
          users={users}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={(updated) => {
            setSelectedTask(updated);
            setDbState(db.loadData());
          }}
        />
      )}

      {selectedContact && (
        <ContactDetailDrawer
          contact={selectedContact}
          tasks={tasks}
          users={users}
          onClose={() => setSelectedContact(null)}
          onContactUpdated={(updated) => {
            setSelectedContact(updated);
            setDbState(db.loadData());
          }}
          onTaskClick={(task) => setSelectedTask(task)}
          showToast={showToast}
        />
      )}

      {/* Modals */}
      {showTaskModal && (
        <TaskCreateModal
          contacts={contacts}
          users={users}
          onClose={() => setShowTaskModal(false)}
          onTaskCreated={(newTask) => {
            setShowTaskModal(false);
            setDbState(db.loadData());
            showToast(`המשימה "${newTask.title}" נוצרה בהצלחה!`, 'success');
          }}
        />
      )}

      {showContactModal && (
        <ContactCreateModal
          initialType={initialContactType}
          users={users}
          onClose={() => setShowContactModal(false)}
          onContactCreated={(newContact) => {
            setShowContactModal(false);
            setDbState(db.loadData());
            showToast(`${newContact.contactType === 'lead' ? 'הליד' : 'הלקוח'} "${newContact.businessName}" נוצר בהצלחה!`, 'success');
          }}
        />
      )}

      {/* HTML Toast Banner (Replaces all browser alerts) */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
