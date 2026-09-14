/**
 * Personal Backup Helper for TikTak / Groopy
 * 
 * Securely extracts and exports ONLY the authenticated user's own data:
 * - Tasks / Projects owned by the user (active and in trash)
 * - Private notes attached to user's tasks
 * - Comments authored by the user or on the user's tasks
 * - Subtasks of user's tasks
 * - Suppliers and contacts created by the user
 * 
 * Supports two export formats:
 * 1. Rich multi-sheet Excel (.xlsx) workbook with formatted columns and clickable links
 * 2. Full structured JSON (.json) data dump
 */

import * as XLSX from 'xlsx';
import { db } from '../firebaseDb';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where
} from 'firebase/firestore';

const formatDateTime = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return String(isoString);
  }
};

const extractCleanUrl = (input) => {
  if (!input) return '';
  const str = typeof input === 'string' ? input : (input.url || input.downloadURL || input.link || '');
  if (!str || typeof str !== 'string') return '';
  const match = str.match(/https?:\/\/[^\s"'<>)]+/i);
  return match ? match[0].trim() : '';
};

const createHyperlinkCell = (url, label = null) => {
  const cleanUrl = extractCleanUrl(url);
  if (!cleanUrl) {
    return label ? String(label).trim() : (typeof url === 'string' ? url.trim() : '');
  }
  const displayVal = label ? String(label).trim() : cleanUrl;
  const escapedUrl = cleanUrl.replace(/"/g, '""');
  return {
    t: 's',
    v: displayVal,
    f: `HYPERLINK("${escapedUrl}")`,
    l: {
      Target: cleanUrl,
      Tooltip: cleanUrl
    }
  };
};

const formatSubtasksSummary = (subtasks) => {
  if (!subtasks || !Array.isArray(subtasks) || subtasks.length === 0) return '';
  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.completed).length;
  const list = subtasks
    .map((s) => `[${s.completed ? '✓' : '✗'}] ${s.title || 'תת-משימה'}`)
    .join(', ');
  return `${completed}/${total} הושלמו: ${list}`;
};

const autoFitColumns = (worksheet, dataRows, headerRow) => {
  const colWidths = [];
  const allRows = [headerRow, ...dataRows];

  headerRow.forEach((colName, colIdx) => {
    let maxLen = String(colName || '').length;
    allRows.forEach((row) => {
      const cellVal = row[colIdx];
      let cellStr = '';
      if (cellVal && typeof cellVal === 'object') {
        cellStr = String(cellVal.v || cellVal.w || '');
      } else if (cellVal != null) {
        cellStr = String(cellVal);
      }
      const firstLine = cellStr.split(/[\r\n]+/)[0] || '';
      if (firstLine.length > maxLen) {
        maxLen = firstLine.length;
      }
    });
    colWidths.push({ wch: Math.min(Math.max(maxLen + 3, 10), 65) });
  });

  worksheet['!cols'] = colWidths;
};

const triggerDownload = (blob, filename) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

/**
 * Queries and returns ONLY data that belongs to the specified userId.
 */
export const fetchPersonalUserData = async (userId) => {
  if (!userId) throw new Error('נדרש מזהה משתמש');

  // 1. Fetch user's tasks
  const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
  const tasksSnap = await getDocs(tasksQuery);
  const allUserTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const activeTasks = allUserTasks.filter(t => !t.deletedAt);
  const trashedTasks = allUserTasks.filter(t => Boolean(t.deletedAt));
  const userTaskIds = new Set(allUserTasks.map(t => t.id));

  // 2. Fetch private notes for user's tasks
  const privateNotesMap = new Map();
  await Promise.all(
    allUserTasks.map(async (task) => {
      try {
        const noteSnap = await getDoc(doc(db, 'taskPrivateNotes', task.id));
        if (noteSnap.exists()) {
          privateNotesMap.set(task.id, noteSnap.data().notes || '');
        }
      } catch {
        // private note read fallback
      }
    })
  );

  // 3. Fetch comments authored by user or belonging to user's tasks
  const commentsMap = new Map();

  try {
    const userCommentsQuery = query(collection(db, 'comments'), where('userId', '==', userId));
    const userCommentsSnap = await getDocs(userCommentsQuery);
    userCommentsSnap.docs.forEach(d => {
      commentsMap.set(d.id, { id: d.id, ...d.data() });
    });
  } catch (err) {
    console.warn('Comments query by userId warning:', err);
  }

  // Also query comments on user's tasks in batches of 30
  const taskIdsList = Array.from(userTaskIds);
  for (let i = 0; i < taskIdsList.length; i += 30) {
    const batch = taskIdsList.slice(i, i + 30);
    try {
      const batchQuery = query(collection(db, 'comments'), where('jobId', 'in', batch));
      const batchSnap = await getDocs(batchQuery);
      batchSnap.docs.forEach(d => {
        commentsMap.set(d.id, { id: d.id, ...d.data() });
      });
    } catch {
      // batch query error handled gracefully
    }
  }

  const comments = Array.from(commentsMap.values()).sort(
    (a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0)
  );

  // 4. Fetch suppliers created by user
  let suppliers = [];
  try {
    const supQuery = query(collection(db, 'suppliers'), where('userId', '==', userId));
    const supSnap = await getDocs(supQuery);
    suppliers = supSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Suppliers query warning:', err);
  }

  // 5. Fetch contacts created by user
  let contacts = [];
  try {
    const conQuery = query(collection(db, 'contacts'), where('userId', '==', userId));
    const conSnap = await getDocs(conQuery);
    contacts = conSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Contacts query warning:', err);
  }

  return {
    activeTasks,
    trashedTasks,
    combinedTasks: [...activeTasks, ...trashedTasks],
    privateNotesMap,
    comments,
    suppliers,
    contacts
  };
};

/**
 * Exports user's personal data to a multi-sheet Excel file.
 */
export const exportPersonalBackupExcel = async ({ user, organizationName = '' }) => {
  if (!user?.uid) throw new Error('משתמש לא מחובר');

  const {
    activeTasks,
    trashedTasks,
    combinedTasks,
    privateNotesMap,
    comments,
    suppliers,
    contacts
  } = await fetchPersonalUserData(user.uid);

  // ---------------------------------------------------------------------------
  // SHEET 1: פרויקטים אישיים
  // ---------------------------------------------------------------------------
  const projectHeaders = [
    'מספר פרויקט',
    'שם הפרויקט',
    'סטטוס',
    'מצב רשומה',
    'עדיפות',
    'סוג עבודה',
    'יעד לביצוע',
    'שם חנות / סניף',
    'ספק',
    'איש קשר',
    'מנהל יבוא',
    'הערות פרטיות',
    'תיאור המשימה',
    'קישור תיקיית Drive',
    'תתי-משימות (סיכום)',
    'מספר תגובות',
    'תאריך יצירה',
    'תאריך עדכון אחרון',
    'מזהה פרויקט'
  ];

  const commentsCountByTaskId = new Map();
  comments.forEach((c) => {
    if (c.jobId) {
      commentsCountByTaskId.set(c.jobId, (commentsCountByTaskId.get(c.jobId) || 0) + 1);
    }
  });

  const projectRows = combinedTasks.map((task) => {
    const driveLinkCell = task.driveLink ? createHyperlinkCell(task.driveLink, 'פתח תיקייה ב-Drive') : '';
    const stateLabel = task.deletedAt ? 'בסל מחזור (נמחק)' : (task.status === 'ארכיון' ? 'בארכיון' : 'פעיל');
    const privateNote = privateNotesMap.get(task.id) || task.privateNotes || '';

    return [
      task.jobNumber || '',
      task.title || '',
      task.status || '',
      stateLabel,
      task.priority || 'רגיל',
      task.workType || '',
      task.deadline || '',
      task.storeName || '',
      task.supplierName || '',
      task.contactPerson || '',
      task.importManager || '',
      privateNote,
      task.description || '',
      driveLinkCell,
      formatSubtasksSummary(task.subtasks),
      commentsCountByTaskId.get(task.id) || 0,
      formatDateTime(task.createdAt),
      formatDateTime(task.updatedAt),
      task.id || ''
    ];
  });

  const wsProjects = XLSX.utils.aoa_to_sheet([projectHeaders, ...projectRows]);
  autoFitColumns(wsProjects, projectRows, projectHeaders);

  // ---------------------------------------------------------------------------
  // SHEET 2: תגובות והתכתבויות
  // ---------------------------------------------------------------------------
  const commentHeaders = [
    'מספר פרויקט',
    'שם הפרויקט',
    'כותב התגובה',
    'תוכן התגובה',
    'קובץ מצורף',
    'קישור לקובץ',
    'תאריך ושעה',
    'מזהה תגובה'
  ];

  const taskDetailsMap = new Map();
  combinedTasks.forEach((t) => {
    taskDetailsMap.set(t.id, {
      jobNumber: t.jobNumber || '',
      title: t.title || ''
    });
  });

  const commentRows = comments.map((c) => {
    const parentTask = taskDetailsMap.get(c.jobId) || {};
    const attachmentCell = c.attachmentUrl
      ? createHyperlinkCell(c.attachmentUrl, c.attachmentName || 'קובץ מצורף')
      : (c.attachmentName || '');

    return [
      parentTask.jobNumber || c.jobId || '',
      parentTask.title || '',
      c.authorName || c.authorEmail || 'משתמש',
      c.text || '',
      c.attachmentName || '',
      attachmentCell,
      formatDateTime(c.createdAt),
      c.id || ''
    ];
  });

  const wsComments = XLSX.utils.aoa_to_sheet([commentHeaders, ...commentRows]);
  autoFitColumns(wsComments, commentRows, commentHeaders);

  // ---------------------------------------------------------------------------
  // SHEET 3: תתי משימות
  // ---------------------------------------------------------------------------
  const subtaskHeaders = [
    'מספר פרויקט',
    'שם הפרויקט',
    'כותרת תת-המשימה',
    'סטטוס ביצוע',
    'מזהה תת-משימה'
  ];

  const subtaskRows = [];
  combinedTasks.forEach((task) => {
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      task.subtasks.forEach((sub, idx) => {
        subtaskRows.push([
          task.jobNumber || '',
          task.title || '',
          sub.title || `תת-משימה #${idx + 1}`,
          sub.completed ? 'הושלם (✓)' : 'טרם הושלם (✗)',
          sub.id || String(idx + 1)
        ]);
      });
    }
  });

  const wsSubtasks = XLSX.utils.aoa_to_sheet([subtaskHeaders, ...subtaskRows]);
  autoFitColumns(wsSubtasks, subtaskRows, subtaskHeaders);

  // ---------------------------------------------------------------------------
  // SHEET 4: ספקים ואנשי קשר
  // ---------------------------------------------------------------------------
  const directoryHeaders = [
    'סוג רשומה',
    'שם / תיאור',
    'אימייל',
    'טלפון',
    'שיוך לחברה',
    'תפקיד',
    'הערות'
  ];

  const directoryRows = [];

  suppliers.forEach((sup) => {
    directoryRows.push([
      'ספק',
      sup.name || '',
      sup.email || '',
      sup.phone || '',
      sup.company || sup.name || '',
      'ספק',
      sup.notes || sup.description || ''
    ]);
  });

  contacts.forEach((con) => {
    directoryRows.push([
      'איש קשר',
      con.name || '',
      con.email || '',
      con.phone || '',
      con.supplierName || '',
      con.role || '',
      con.notes || ''
    ]);
  });

  const wsDirectory = XLSX.utils.aoa_to_sheet([directoryHeaders, ...directoryRows]);
  autoFitColumns(wsDirectory, directoryRows, directoryHeaders);

  // ---------------------------------------------------------------------------
  // SHEET 5: סיכום גיבוי אישי
  // ---------------------------------------------------------------------------
  const summaryHeaders = ['מאפיין גיבוי', 'פירוט'];
  const summaryRows = [
    ['סוג גיבוי', 'גיבוי אישי מלא (תוכן המשתמש בלבד)'],
    ['אימייל המשתמש', user.email || ''],
    ['מזהה משתמש (UID)', user.uid],
    ['שם הארגון המושבת', organizationName || 'לא צוין'],
    ['תאריך ושעת הפקת הגיבוי', formatDateTime(new Date().toISOString())],
    ['סה״כ פרויקטים בגיבוי', combinedTasks.length],
    ['מתוכם פרויקטים פעילים', activeTasks.length],
    ['מתוכם פרויקטים בסל מחזור', trashedTasks.length],
    ['סה״כ תגובות והתכתבויות', comments.length],
    ['סה״כ תתי-משימות', subtaskRows.length],
    ['סה״כ ספקים אישיים', suppliers.length],
    ['סה״כ אנשי קשר אישיים', contacts.length]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  autoFitColumns(wsSummary, summaryRows, summaryHeaders);

  // ---------------------------------------------------------------------------
  // BUILD WORKBOOK & DOWNLOAD
  // ---------------------------------------------------------------------------
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsProjects, 'פרויקטים אישיים');
  XLSX.utils.book_append_sheet(workbook, wsComments, 'תגובות והתכתבויות');
  XLSX.utils.book_append_sheet(workbook, wsSubtasks, 'תתי משימות');
  if (directoryRows.length > 0) {
    XLSX.utils.book_append_sheet(workbook, wsDirectory, 'ספקים ואנשי קשר');
  }
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'סיכום גיבוי אישי');

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const userIdentifier = (user.email ? user.email.split('@')[0] : user.uid).replace(/[\\/:*?"<>|]/g, '_');
  const filename = `גיבוי_אישי_${userIdentifier}_${dateStr}.xlsx`;

  try {
    XLSX.writeFile(workbook, filename);
  } catch {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerDownload(blob, filename);
  }

  return {
    filename,
    totalProjects: combinedTasks.length,
    totalComments: comments.length,
    totalSubtasks: subtaskRows.length,
    totalSuppliers: suppliers.length,
    totalContacts: contacts.length
  };
};

/**
 * Exports user's personal data to a JSON file.
 */
export const exportPersonalBackupJson = async ({ user, organizationName = '' }) => {
  if (!user?.uid) throw new Error('משתמש לא מחובר');

  const {
    activeTasks,
    trashedTasks,
    combinedTasks,
    privateNotesMap,
    comments,
    suppliers,
    contacts
  } = await fetchPersonalUserData(user.uid);

  // Attach private notes into task objects for easy restore
  const enrichedTasks = combinedTasks.map(t => ({
    ...t,
    privateNotes: privateNotesMap.get(t.id) || t.privateNotes || ''
  }));

  const payload = {
    backupType: 'personal_user_data_backup',
    exportedAt: new Date().toISOString(),
    user: {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || ''
    },
    organization: {
      name: organizationName || ''
    },
    summary: {
      totalTasks: enrichedTasks.length,
      activeTasksCount: activeTasks.length,
      trashedTasksCount: trashedTasks.length,
      commentsCount: comments.length,
      suppliersCount: suppliers.length,
      contactsCount: contacts.length
    },
    tasks: enrichedTasks,
    comments,
    suppliers,
    contacts
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const userIdentifier = (user.email ? user.email.split('@')[0] : user.uid).replace(/[\\/:*?"<>|]/g, '_');
  const filename = `גיבוי_אישי_${userIdentifier}_${dateStr}.json`;

  triggerDownload(blob, filename);

  return {
    filename,
    totalProjects: enrichedTasks.length,
    totalComments: comments.length,
    totalSuppliers: suppliers.length,
    totalContacts: contacts.length
  };
};
