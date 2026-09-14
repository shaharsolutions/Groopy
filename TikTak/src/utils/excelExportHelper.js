/**
 * Excel Export Helper for Groopy / TikTak
 * 
 * Exports all user projects, comments, subtasks, suppliers, contacts,
 * and system settings to a comprehensive multi-sheet Excel (.xlsx) file.
 */

import * as XLSX from 'xlsx';
import {
  getTasks,
  getTrashedTasks,
  getAllCommentsForUser,
  getAllPrivateNotesForUser
} from './storage';
import { getAllTaskFieldDefinitions } from '../data/taskFieldConfig';
import { getFeatureFlags } from './featureFlags';

/**
 * Formats an ISO date string to a user-friendly Hebrew date format (YYYY-MM-DD HH:mm)
 */
const formatDateTime = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return String(isoString);
  }
};

/**
 * Format a simple date (YYYY-MM-DD)
 */
const formatDateOnly = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Resolves the display name of a board by its ID
 */
const getBoardName = (boardId, settings, isLegacy) => {
  if (!boardId || boardId === 'active') {
    return settings?.boardTitle || (isLegacy ? 'עבודות פעילות' : 'פרויקטים פעילים');
  }
  const board = (settings?.boards || []).find((b) => b && b.id === boardId);
  return board ? `${board.icon ? board.icon + ' ' : ''}${board.name}` : 'לוח כללי';
};

/**
 * Format file attachments into readable string (Name + URL)
 */
const formatFilesList = (files) => {
  if (!files) return '';
  const fileArray = Array.isArray(files) ? files : [files];
  return fileArray
    .filter(Boolean)
    .map((f) => {
      if (typeof f === 'string') return f;
      if (f.name && f.url) return `${f.name}: ${f.url}`;
      return f.name || f.url || JSON.stringify(f);
    })
    .join('\n');
};

/**
 * Summarizes subtasks for the master sheet
 */
const formatSubtasksSummary = (subtasks) => {
  if (!subtasks || !Array.isArray(subtasks) || subtasks.length === 0) return '';
  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.completed).length;
  const list = subtasks
    .map((s) => `[${s.completed ? 'V' : 'X'}] ${s.title || 'תת-משימה'}`)
    .join(', ');
  return `${completed}/${total} הושלמו: ${list}`;
};

/**
 * Calculates and applies optimal column widths to a worksheet
 */
const autoFitColumns = (worksheet, dataRows, headerRow) => {
  const colWidths = [];
  const allRows = [headerRow, ...dataRows];

  headerRow.forEach((colName, colIdx) => {
    let maxLen = colName ? String(colName).length : 10;
    allRows.forEach((row) => {
      const cellVal = Array.isArray(row) ? row[colIdx] : row[colName];
      if (cellVal != null) {
        const lines = String(cellVal).split('\n');
        lines.forEach((line) => {
          if (line.length > maxLen) {
            maxLen = Math.min(line.length, 65); // Cap width at 65 characters
          }
        });
      }
    });
    // Add safety margin and set minimum width
    colWidths.push({ wch: Math.max(maxLen + 3, 14) });
  });

  worksheet['!cols'] = colWidths;
  worksheet['!views'] = [{ RTL: true }];
};

/**
 * Main export function: gathers all user content and initiates browser download
 */
export const exportAllUserDataToExcel = async ({
  userId,
  organizationId,
  organizationName = '',
  userEmail = '',
  settings = {},
  suppliers = [],
  contacts = [],
  includeTrash = true
}) => {
  if (!userId && !organizationId) {
    throw new Error('נדרש מזהה משתמש או מזהה ארגון לצורך ייצוא נתונים');
  }

  const flags = getFeatureFlags(settings);
  const targetOrgId = organizationId || settings?.organizationId || '';

  // 1. Fetch all data in parallel
  const [tasks, trashedTasks, allComments, privateNotesMap] = await Promise.all([
    getTasks(userId, targetOrgId),
    includeTrash ? getTrashedTasks(userId, targetOrgId) : Promise.resolve([]),
    getAllCommentsForUser(userId, targetOrgId),
    getAllPrivateNotesForUser(userId, targetOrgId)
  ]);

  // Combine tasks and mark status condition
  const combinedTasks = [
    ...tasks.map((t) => ({ ...t, _exportState: t.status === 'ארכיון' ? 'בארכיון' : 'פעיל' })),
    ...trashedTasks.map((t) => ({ ...t, _exportState: 'בסל מחזור (נמחק)' }))
  ];

  // Group comments by jobId for fast lookup
  const commentsByTaskId = new Map();
  allComments.forEach((c) => {
    if (!c.jobId) return;
    if (!commentsByTaskId.has(c.jobId)) {
      commentsByTaskId.set(c.jobId, []);
    }
    commentsByTaskId.get(c.jobId).push(c);
  });

  // Extract custom fields from settings
  const allFieldDefs = getAllTaskFieldDefinitions(settings?.newTaskFields, {
    taskFieldOrder: settings?.taskFieldOrder,
    isLegacy: flags.isLegacy
  });
  const customFieldDefs = allFieldDefs.filter((f) => f.isCustom);

  // ---------------------------------------------------------------------------
  // SHEET 1: פרויקטים (Master Projects Sheet)
  // ---------------------------------------------------------------------------
  const projectHeaders = [
    'מספר פרויקט',
    'שם הפרויקט',
    'לוח',
    'סטטוס',
    'עדיפות',
    'מצב פרויקט',
    'ספק',
    'איש קשר',
    'אימייל איש קשר',
    'טלפון איש קשר',
    'מנהל/ת יבוא',
    'תאריך יעד',
    'תיאור',
    'הערות פנימיות',
    'קישור לדרייב',
    'דרישות מכון תקנים',
    'דייקאטים',
    'תמונות',
    'הזמנת עבודה / מסמכים',
    'פלנוגרמה',
    'תתי-משימות (סיכום)',
    'שעות שהושקעו',
    'כמות תגובות',
    'תאריך יצירה',
    'תאריך עדכון אחרון',
    'מזהה ייחודי'
  ];

  // Add custom fields to headers
  customFieldDefs.forEach((f) => {
    projectHeaders.push(f.label || f.key);
  });

  const projectRows = combinedTasks.map((task) => {
    const internalNotes = task.internalNotes || privateNotesMap.get(task.id) || '';
    const taskComments = commentsByTaskId.get(task.id) || [];
    const boardTitle = getBoardName(task.boardId, settings, flags.isLegacy);

    // Format weekly hours
    let hoursStr = '';
    if (task.weeklyHours && typeof task.weeklyHours === 'object') {
      const totalHours = Object.values(task.weeklyHours).reduce((sum, h) => sum + (Number(h) || 0), 0);
      if (totalHours > 0) {
        hoursStr = `${totalHours} שעות`;
      }
    }

    // Work order files formatting
    const workOrderFilesData = task.workOrderFiles || task.workOrderFile || task.attachments || [];
    const workOrderFilesStr = formatFilesList(workOrderFilesData);

    // Planogram formatting
    const planogramData = task.planogramFile || task.planogram || null;
    const planogramStr = formatFilesList(planogramData);

    const row = [
      task.jobNumber || '',
      task.title || '',
      boardTitle,
      task.status || '',
      task.priority || 'רגילה',
      task._exportState || 'פעיל',
      task.supplierName || '',
      task.contactPerson || '',
      task.supplierContactEmail || '',
      task.contactPhone || task.phone || '',
      task.importManager || '',
      formatDateOnly(task.deadline),
      task.description || '',
      internalNotes,
      task.driveLink || '',
      task.standardsInstituteRequired || 'לא',
      task.diecutsStatus || 'אין',
      task.imagesStatus || 'אין',
      workOrderFilesStr,
      planogramStr,
      formatSubtasksSummary(task.subtasks),
      hoursStr,
      taskComments.length,
      formatDateTime(task.createdAt),
      formatDateTime(task.updatedAt),
      task.id || ''
    ];

    // Append custom fields values
    customFieldDefs.forEach((f) => {
      const val = task.customFields?.[f.key];
      if (val === true) {
        row.push('כן');
      } else if (val === false) {
        row.push('לא');
      } else if (val != null) {
        row.push(String(val));
      } else {
        row.push('');
      }
    });

    return row;
  });

  const wsProjects = XLSX.utils.aoa_to_sheet([projectHeaders, ...projectRows]);
  autoFitColumns(wsProjects, projectRows, projectHeaders);

  // ---------------------------------------------------------------------------
  // SHEET 2: תגובות והתכתבויות (Comments Sheet)
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

  // Map task ID to task details
  const taskDetailsMap = new Map();
  combinedTasks.forEach((t) => {
    taskDetailsMap.set(t.id, {
      jobNumber: t.jobNumber || '',
      title: t.title || ''
    });
  });

  const commentRows = allComments.map((c) => {
    const parentTask = taskDetailsMap.get(c.jobId) || {};
    return [
      parentTask.jobNumber || c.jobId || '',
      parentTask.title || '',
      c.authorName || c.authorEmail || 'משתמש',
      c.text || '',
      c.attachmentName || '',
      c.attachmentUrl || '',
      formatDateTime(c.createdAt),
      c.id || ''
    ];
  });

  const wsComments = XLSX.utils.aoa_to_sheet([commentHeaders, ...commentRows]);
  autoFitColumns(wsComments, commentRows, commentHeaders);

  // ---------------------------------------------------------------------------
  // SHEET 3: תתי משימות (Subtasks Sheet)
  // ---------------------------------------------------------------------------
  const subtaskHeaders = [
    'מספר פרויקט',
    'שם הפרויקט',
    'לוח',
    'כותרת תת-המשימה',
    'סטטוס ביצוע',
    'מזהה תת-משימה'
  ];

  const subtaskRows = [];
  combinedTasks.forEach((task) => {
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      const boardTitle = getBoardName(task.boardId, settings, flags.isLegacy);
      task.subtasks.forEach((sub, idx) => {
        subtaskRows.push([
          task.jobNumber || '',
          task.title || '',
          boardTitle,
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
  // SHEET 4: ספקים ואנשי קשר (Suppliers & Contacts Sheet)
  // ---------------------------------------------------------------------------
  const directoryHeaders = [
    'סוג רשומה',
    'שם / תיאור',
    'אימייל',
    'טלפון',
    'ספק משויך / חברה',
    'תפקיד',
    'הערות'
  ];

  const directoryRows = [];

  // Add Suppliers
  (suppliers || []).forEach((sup) => {
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

  // Add Contacts
  (contacts || []).forEach((con) => {
    const contactName = typeof con === 'string' ? con : con.name || '';
    const contactEmail = typeof con === 'object' ? con.email || '' : '';
    const contactPhone = typeof con === 'object' ? con.phone || '' : '';
    const contactSupplier = typeof con === 'object' ? con.supplierName || '' : '';
    const contactRole = typeof con === 'object' ? con.role || '' : '';
    const contactNotes = typeof con === 'object' ? con.notes || '' : '';

    directoryRows.push([
      'איש קשר',
      contactName,
      contactEmail,
      contactPhone,
      contactSupplier,
      contactRole,
      contactNotes
    ]);
  });

  const wsDirectory = XLSX.utils.aoa_to_sheet([directoryHeaders, ...directoryRows]);
  autoFitColumns(wsDirectory, directoryRows, directoryHeaders);

  // ---------------------------------------------------------------------------
  // SHEET 5: סיכום והגדרות מערכת (Summary Sheet)
  // ---------------------------------------------------------------------------
  const summaryHeaders = ['מאפיין מערכת', 'ערך / פירוט'];
  const summaryRows = [
    ['שם הארגון', organizationName || targetOrgId || 'Groopy'],
    ['מזהה ארגון', targetOrgId],
    ['משתמש מייצא', userEmail || userId || ''],
    ['תאריך הפקת הדו״ח', formatDateTime(new Date().toISOString())],
    ['סה״כ פרויקטים שיוצאו', combinedTasks.length],
    ['מתוכם פרויקטים פעילים', tasks.filter((t) => t.status !== 'ארכיון').length],
    ['מתוכם פרויקטים בארכיון', tasks.filter((t) => t.status === 'ארכיון').length],
    ['מתוכם פרויקטים בסל מחזור', trashedTasks.length],
    ['סה״כ תגובות', allComments.length],
    ['סה״כ תתי-משימות', subtaskRows.length],
    ['סה״כ ספקים', (suppliers || []).length],
    ['סה״כ אנשי קשר', (contacts || []).length],
    ['גרסת מערכת', flags.isV2 ? 'גרסה 2 (חדשה)' : 'גרסה קלאסית (Legacy)'],
    [
      'לוחות מוגדרים',
      (settings?.boards || [])
        .map((b) => b.name)
        .concat([settings?.boardTitle || 'פרויקטים פעילים'])
        .join(', ')
    ],
    ['סטטוסים גלובליים', (settings?.statuses || []).join(', ')]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  autoFitColumns(wsSummary, summaryRows, summaryHeaders);

  // ---------------------------------------------------------------------------
  // BUILD WORKBOOK & DOWNLOAD
  // ---------------------------------------------------------------------------
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, wsProjects, 'פרויקטים');
  XLSX.utils.book_append_sheet(workbook, wsComments, 'תגובות והתכתבויות');
  XLSX.utils.book_append_sheet(workbook, wsSubtasks, 'תתי משימות');
  if (directoryRows.length > 0) {
    XLSX.utils.book_append_sheet(workbook, wsDirectory, 'ספקים ואנשי קשר');
  }
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'סיכום והגדרות');

  // Generate safe filename with Hebrew date
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const safeOrgName = (organizationName || 'Groopy').replace(/[\\/:*?"<>|]/g, '_').trim();
  const filename = `ייצוא_פרויקטים_${safeOrgName}_${dateStr}.xlsx`;

  // Write and trigger download
  try {
    XLSX.writeFile(workbook, filename);
  } catch (writeErr) {
    console.warn('XLSX.writeFile encountered an issue, falling back to Blob download:', writeErr);
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  return {
    filename,
    totalProjects: combinedTasks.length,
    totalComments: allComments.length,
    totalSubtasks: subtaskRows.length
  };
};
