/**
 * TikTak Next V2 - Isolated PAWZA Data Access Layer (DAL)
 * Guarantees zero connection/interference with Production Firebase.
 * Stores data in isolated LocalStorage key: `tiktak_next_v2_db_store`.
 */

import {
  PAWZA_USERS,
  PAWZA_TASKS,
  PAWZA_DOMAINS,
  PAWZA_STATUSES,
  PAWZA_PACKAGES
} from '../data/mockInitialData';

const STORAGE_KEY = 'tiktak_next_v2_db_store';

class MockDBService {
  constructor() {
    this.listeners = new Set();
    this.data = this.loadData();
    this.purgeExpiredRecycleBin();
  }

  loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tasks && parsed.users) {
          return {
            ...parsed,
            contacts: parsed.contacts || [],
            activities: parsed.activities || [],
            tasks: parsed.tasks || []
          };
        }
      }
    } catch (e) {
      console.warn("Failed to load LocalStorage, seeding fresh PAWZA mock data", e);
    }

    const defaultData = {
      users: PAWZA_USERS,
      tasks: PAWZA_TASKS,
      contacts: [],
      activities: [],
      domains: PAWZA_DOMAINS,
      statuses: PAWZA_STATUSES,
      packages: PAWZA_PACKAGES,
      notifications: [
        {
          id: "notif_1",
          title: "מערכת PAWZA מוכנה",
          message: "המערכת מוכנה לניהול משימות, פיתוח, עיצוב ו-CRM",
          read: false,
          createdAt: new Date().toISOString()
        }
      ],
      auditLogs: [
        {
          id: "log_1",
          timestamp: new Date().toISOString(),
          userId: "usr_shahar",
          userName: "שחר",
          action: "אתחול מערכת PAWZA",
          details: "המערכת הותאמה בהצלחה לניהול פיתוח, עיצוב ו-CRM"
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    this.saveData(defaultData);
    return defaultData;
  }

  saveData(newData) {
    this.data = {
      ...newData,
      lastUpdated: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error("LocalStorage write error:", e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.data));
  }

  resetToInitialMock() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = this.loadData();
    this.notify();
    return this.data;
  }

  clearAllContactsAndRecycleBin() {
    this.data = {
      ...this.data,
      contacts: [],
      activities: []
    };
    this.saveData(this.data);
    this.addAuditLog("usr_shahar", "ריקון לקוחות וסל מחזור", "כל הלקוחות, הלידים וסל המחזור רוקנו כליל");
    return [];
  }

  // --- Users Management API ---
  getUsers() { return this.data.users || []; }
  getUserById(id) { return this.getUsers().find(u => u.id === id); }

  addUser(userData) {
    const newUser = {
      id: `usr_${Date.now()}`,
      name: userData.name || "משתמש חדש",
      email: userData.email || "",
      phone: userData.phone || "",
      role: userData.role || "employee",
      status: userData.status || "פעיל",
      avatar: userData.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
      createdAt: new Date().toISOString()
    };

    const users = [newUser, ...this.getUsers()];
    this.saveData({ ...this.data, users });
    this.addAuditLog("usr_shahar", "יצירת משתמש", `נוסף משתמש חדש: ${newUser.name} (${newUser.role})`);
    return newUser;
  }

  updateUser(id, updates) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;

    const updatedUser = { ...users[index], ...updates };
    users[index] = updatedUser;
    this.saveData({ ...this.data, users });
    this.addAuditLog("usr_shahar", "עדכון משתמש", `עודכנו פרטי משתמש: ${updatedUser.name}`);
    return updatedUser;
  }

  deleteUser(id) {
    const user = this.getUserById(id);
    const users = this.getUsers().filter(u => u.id !== id);
    this.saveData({ ...this.data, users });
    if (user) {
      this.addAuditLog("usr_shahar", "מחיקת משתמש", `נמחק משתמש: ${user.name}`);
    }
  }

  // --- Tasks & Task Recycle Bin API ---
  getTasks() {
    return (this.data.tasks || []).filter(t => !t.deleted);
  }

  getRecycleBinTasks() {
    return (this.data.tasks || []).filter(t => t.deleted);
  }

  getTaskById(id) { return (this.data.tasks || []).find(t => t.id === id); }

  addTask(taskData) {
    const newTask = {
      id: `task_${Date.now()}`,
      title: taskData.title || "משימה חדשה",
      domain: taskData.domain || "פיתוח",
      status: taskData.status || "לביצוע",
      priority: taskData.priority || "רגילה",
      assigneeId: taskData.assigneeId || "usr_shahar",
      dueDate: taskData.dueDate || "",
      contactId: taskData.contactId || "",
      contactName: taskData.contactName || "",
      nextAction: taskData.nextAction || "",
      waitingFor: taskData.waitingFor || "",
      progress: taskData.progress || 0,
      devDetails: taskData.devDetails || {},
      designDetails: taskData.designDetails || {},
      marketingDetails: taskData.marketingDetails || {},
      subtasks: taskData.subtasks || [],
      deleted: false,
      createdAt: new Date().toISOString()
    };

    const tasks = [newTask, ...(this.data.tasks || [])];
    this.saveData({ ...this.data, tasks });
    this.addAuditLog("usr_shahar", "יצירת משימה", `נוצרה משימה: ${newTask.title} (${newTask.domain})`);
    return newTask;
  }

  updateTask(id, updates) {
    const tasks = [...(this.data.tasks || [])];
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    const oldTask = tasks[index];
    const updatedTask = { ...oldTask, ...updates, updatedAt: new Date().toISOString() };

    if (updates.subtasks) {
      const total = updates.subtasks.length;
      if (total > 0) {
        const done = updates.subtasks.filter(st => st.completed).length;
        updatedTask.progress = Math.round((done / total) * 100);
        if (done === total && updatedTask.status !== 'הושלם') {
          updatedTask.status = 'הושלם';
        }
      }
    }

    tasks[index] = updatedTask;
    this.saveData({ ...this.data, tasks });
    return updatedTask;
  }

  // Soft delete task to Recycle Bin for 30 days
  softDeleteTask(id) {
    const now = new Date();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    const updated = this.updateTask(id, {
      deleted: true,
      deletedAt: now.toISOString(),
      deletedExpiresAt: expires.toISOString()
    });

    if (updated) {
      this.addAuditLog("usr_shahar", "העברת משימה לסל מחזור", `${updated.title}`);
    }
    return updated;
  }

  // Restore task back from Recycle Bin
  restoreTask(id) {
    const updated = this.updateTask(id, {
      deleted: false,
      deletedAt: null,
      deletedExpiresAt: null
    });

    if (updated) {
      this.addAuditLog("usr_shahar", "שחזור משימה מסל מחזור", `${updated.title}`);
    }
    return updated;
  }

  // Permanently delete task
  permanentlyDeleteTask(id) {
    const task = this.getTaskById(id);
    const tasks = (this.data.tasks || []).filter(t => t.id !== id);
    this.saveData({ ...this.data, tasks });
    if (task) {
      this.addAuditLog("usr_shahar", "מחיקת משימה לצמיתות", `נמחקה לצמיתות: ${task.title}`);
    }
  }

  duplicateTask(id) {
    const task = this.getTaskById(id);
    if (!task) return null;
    return this.addTask({
      ...task,
      title: `עותק של ${task.title}`,
      status: 'לביצוע',
      createdAt: new Date().toISOString()
    });
  }

  // Bulk Operations
  bulkUpdateTasks(ids = [], updates = {}) {
    if (!ids || ids.length === 0) return [];
    const tasks = [...(this.data.tasks || [])];
    const now = new Date().toISOString();
    let updatedCount = 0;

    tasks.forEach((t, idx) => {
      if (ids.includes(t.id)) {
        tasks[idx] = { ...t, ...updates, updatedAt: now };
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      this.saveData({ ...this.data, tasks });
      this.addAuditLog("usr_shahar", "עדכון משימות גורף", `עודכנו ${updatedCount} משימות בבת אחת`);
    }
    return updatedCount;
  }

  bulkSoftDeleteTasks(ids = []) {
    if (!ids || ids.length === 0) return 0;
    const now = new Date();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    const tasks = [...(this.data.tasks || [])];
    let count = 0;

    tasks.forEach((t, idx) => {
      if (ids.includes(t.id)) {
        tasks[idx] = {
          ...t,
          deleted: true,
          deletedAt: now.toISOString(),
          deletedExpiresAt: expires.toISOString(),
          updatedAt: now.toISOString()
        };
        count++;
      }
    });

    if (count > 0) {
      this.saveData({ ...this.data, tasks });
      this.addAuditLog("usr_shahar", "העברה גורפת לסל מחזור", `${count} משימות הועברו לסל המחזור`);
    }
    return count;
  }

  bulkRestoreTasks(ids = []) {
    if (!ids || ids.length === 0) return 0;
    const tasks = [...(this.data.tasks || [])];
    let count = 0;

    tasks.forEach((t, idx) => {
      if (ids.includes(t.id)) {
        tasks[idx] = {
          ...t,
          deleted: false,
          deletedAt: null,
          deletedExpiresAt: null,
          updatedAt: new Date().toISOString()
        };
        count++;
      }
    });

    if (count > 0) {
      this.saveData({ ...this.data, tasks });
      this.addAuditLog("usr_shahar", "שחזור גורף מסל מחזור", `${count} משימות שוחזרו מסל המחזור`);
    }
    return count;
  }

  bulkPermanentlyDeleteTasks(ids = []) {
    if (!ids || ids.length === 0) return 0;
    const initialLen = (this.data.tasks || []).length;
    const tasks = (this.data.tasks || []).filter(t => !ids.includes(t.id));
    const deletedCount = initialLen - tasks.length;

    if (deletedCount > 0) {
      this.saveData({ ...this.data, tasks });
      this.addAuditLog("usr_shahar", "מחיקת משימות גורפת לצמיתות", `נמחקו לצמיתות ${deletedCount} משימות`);
    }
    return deletedCount;
  }

  // Alias for backward compatibility
  deleteTask(id) {
    return this.softDeleteTask(id);
  }

  toggleSubtask(taskId, subtaskId) {
    const task = this.getTaskById(taskId);
    if (!task) return;
    const subtasks = (task.subtasks || []).map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    this.updateTask(taskId, { subtasks });
  }

  addSubtask(taskId, title) {
    const task = this.getTaskById(taskId);
    if (!task) return;
    const newSt = { id: `stk_${Date.now()}`, title, completed: false, assigneeId: "usr_shahar" };
    const subtasks = [...(task.subtasks || []), newSt];
    this.updateTask(taskId, { subtasks });
  }

  // --- CRM Contacts & Recycle Bin API ---
  getContacts() {
    return (this.data.contacts || []).filter(c => !c.deleted);
  }

  getRecycleBinContacts() {
    return (this.data.contacts || []).filter(c => c.deleted);
  }

  getLeads() { return this.getContacts().filter(c => c.contactType === 'lead'); }
  getCustomers() { return this.getContacts().filter(c => c.contactType === 'customer'); }
  getContactById(id) { return (this.data.contacts || []).find(c => c.id === id); }

  addContact(contactData) {
    const isLead = contactData.contactType === 'lead';
    const newContact = {
      id: `cnt_${isLead ? 'lead' : 'cust'}_${Date.now()}`,
      contactType: contactData.contactType || 'lead',
      businessName: contactData.businessName || "עסק חדש",
      contactPerson: contactData.contactPerson || "",
      phone: contactData.phone || "",
      email: contactData.email || "",
      address: contactData.address || "",
      website: contactData.website || "",
      leadSource: contactData.leadSource || "פנייה מהאתר",
      leadStatus: contactData.leadStatus || "ליד חדש",
      customerStatus: contactData.customerStatus || "בתהליך הצטרפות",
      packageName: contactData.packageName || "Pro",
      monthlyPrice: contactData.monthlyPrice || 350,
      joiningDate: contactData.joiningDate || new Date().toISOString().split('T')[0],
      nextPaymentDate: contactData.nextPaymentDate || "",
      nextAction: contactData.nextAction || "ליצור קשר ראשוני",
      nextFollowUpDate: contactData.nextFollowUpDate || new Date().toISOString().split('T')[0],
      assigneeId: contactData.assigneeId || "usr_alina",
      notes: contactData.notes || "",
      deleted: false,
      createdAt: new Date().toISOString()
    };

    const contacts = [newContact, ...(this.data.contacts || [])];
    this.saveData({ ...this.data, contacts });

    this.addCrmActivity(newContact.id, isLead ? 'lead_created' : 'customer_created', `נוצר ${isLead ? 'ליד' : 'לקוח'} חדש: ${newContact.businessName}`);
    this.addAuditLog("usr_shahar", isLead ? "יצירת ליד" : "יצירת לקוח", `${newContact.businessName}`);
    return newContact;
  }

  updateContact(id, updates) {
    const contacts = [...(this.data.contacts || [])];
    const idx = contacts.findIndex(c => c.id === id);
    if (idx === -1) return null;

    const oldC = contacts[idx];
    const updatedC = { ...oldC, ...updates, updatedAt: new Date().toISOString() };
    contacts[idx] = updatedC;

    this.saveData({ ...this.data, contacts });
    return updatedC;
  }

  softDeleteContact(id) {
    const now = new Date();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    const updated = this.updateContact(id, {
      deleted: true,
      deletedAt: now.toISOString(),
      deletedExpiresAt: expires.toISOString()
    });

    if (updated) {
      this.addCrmActivity(id, 'deleted', `הרשומה הועברה לסל המחזור (תימחק לצמיתות ב-${expires.toLocaleDateString('he-IL')})`);
      this.addAuditLog("usr_shahar", "העברה לסל מחזור", `${updated.businessName}`);
    }
    return updated;
  }

  restoreContact(id) {
    const updated = this.updateContact(id, {
      deleted: false,
      deletedAt: null,
      deletedExpiresAt: null
    });

    if (updated) {
      this.addCrmActivity(id, 'restored', `הרשומה שוחזרה בהצלחה מסל המחזור`);
      this.addAuditLog("usr_shahar", "שחזור מסל מחזור", `${updated.businessName}`);
    }
    return updated;
  }

  permanentlyDeleteContact(id) {
    const contact = this.getContactById(id);
    const contacts = (this.data.contacts || []).filter(c => c.id !== id);
    this.saveData({ ...this.data, contacts });
    if (contact) {
      this.addAuditLog("usr_shahar", "מחיקה לצמיתות", `נמחק לצמיתות מסל המחזור: ${contact.businessName}`);
    }
  }

  // Auto purge items (tasks and contacts) older than 30 days
  purgeExpiredRecycleBin() {
    const now = new Date();

    const contacts = (this.data.contacts || []).filter(c => {
      if (!c.deleted) return true;
      if (!c.deletedExpiresAt) return true;
      return new Date(c.deletedExpiresAt) > now;
    });

    const tasks = (this.data.tasks || []).filter(t => {
      if (!t.deleted) return true;
      if (!t.deletedExpiresAt) return true;
      return new Date(t.deletedExpiresAt) > now;
    });

    if (contacts.length !== (this.data.contacts || []).length || tasks.length !== (this.data.tasks || []).length) {
      this.saveData({ ...this.data, contacts, tasks });
    }
  }

  convertLeadToCustomer(leadId, { packageName, monthlyPrice, joiningDate }) {
    const lead = this.getContactById(leadId);
    if (!lead) return null;

    const updated = this.updateContact(leadId, {
      contactType: 'customer',
      customerStatus: 'בתהליך הצטרפות',
      packageName: packageName || 'Pro',
      monthlyPrice: monthlyPrice || 350,
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      nextAction: 'פתיחת משתמש וקליטת לקוח במערכת'
    });

    this.addCrmActivity(leadId, 'status_change', `הומר מליד ללקוח - חבילת ${packageName || 'Pro'} (${monthlyPrice || 350} ₪)`);

    const onboardingTasks = [
      { title: `פתיחת משתמש במערכת PAWZA - ${lead.businessName}`, domain: "תפעול", contactId: leadId, contactName: lead.businessName, assigneeId: "usr_shahar", dueDate: new Date().toISOString().split('T')[0] },
      { title: `קבלת לוגו ופרטי עסק - ${lead.businessName}`, domain: "תוכן", contactId: leadId, contactName: lead.businessName, assigneeId: "usr_alina", dueDate: new Date().toISOString().split('T')[0] },
      { title: `הדרכת משתמש ב-Zoom - ${lead.businessName}`, domain: "תמיכה בלקוח", contactId: leadId, contactName: lead.businessName, assigneeId: "usr_alina", dueDate: new Date().toISOString().split('T')[0] }
    ];

    onboardingTasks.forEach(t => this.addTask(t));
    return updated;
  }

  // --- CRM Activities ---
  getActivities(contactId) {
    const activities = this.data.activities || [];
    return contactId ? activities.filter(a => a.contactId === contactId) : activities;
  }

  addCrmActivity(contactId, activityType, description) {
    const newAct = {
      id: `act_${Date.now()}`,
      contactId,
      activityType,
      description,
      userId: "usr_shahar",
      createdAt: new Date().toISOString()
    };
    const activities = [newAct, ...(this.data.activities || [])];
    this.saveData({ ...this.data, activities });
    return newAct;
  }

  // --- Notifications ---
  getNotifications() { return this.data.notifications || []; }
  markAllNotificationsRead() {
    const notifications = (this.data.notifications || []).map(n => ({ ...n, read: true }));
    this.saveData({ ...this.data, notifications });
  }

  // --- Audit Log ---
  getAuditLogs() { return this.data.auditLogs || []; }
  addAuditLog(userId, action, details) {
    const newLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId,
      userName: "שחר (PAWZA)",
      action,
      details
    };
    const auditLogs = [newLog, ...(this.data.auditLogs || [])];
    this.saveData({ ...this.data, auditLogs });
  }
}

export const db = new MockDBService();
