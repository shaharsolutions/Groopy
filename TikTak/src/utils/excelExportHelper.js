/**
 * Excel Export Helper for Groopy / TikTak
 * 
 * Exports all user projects, comments, subtasks, files & documents,
 * suppliers, contacts, and system settings to a comprehensive multi-sheet Excel (.xlsx) file.
 * All file and folder links (work order, planogram, Drive, comments) are fully clickable hyperlinks.
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
 * Creates a native clickable hyperlink cell for SheetJS supporting both formulas and relationships
 */
const createHyperlinkCell = (url, label) => {
  if (!url || typeof url !== 'string') {
    return label || '';
  }
  const match = url.match(/https?:\/\/[^\s"'<>\)]+/i);
  if (!match) {
    return label || url;
  }
  const cleanUrl = match[0].trim();
  const cleanLabel = label ? String(label).trim() : cleanUrl;
  const escapedUrl = cleanUrl.replace(/"/g, '""');
  const escapedLabel = cleanLabel.replace(/"/g, '""');
  return {
    t: 's',
    v: cleanLabel,
    f: `HYPERLINK("${escapedUrl}", "${escapedLabel}")`,
    l: {
      Target: cleanUrl,
      Tooltip: cleanLabel
    }
  };
};

/**
 * Robustly normalizes any file data (single string, multiline text, array, object, JSON)
 * into a clean array of { name, url } where url is guaranteed to be a valid URL starting with https:// or http://.
 */
const extractAllFiles = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.flatMap(extractAllFiles);
  }
  if (typeof input === 'object') {
    const rawUrl = input.url || input.downloadURL || input.link || '';
    const rawName = input.name || input.fileName || '';
    if (rawUrl) {
      const match = String(rawUrl).match(/https?:\/\/[^\s"'<>\)]+/i);
      const cleanUrl = match ? match[0].trim() : String(rawUrl).trim();
      let cleanName = String(rawName || '').trim();
      if (!cleanName) {
        try {
          const u = new URL(cleanUrl);
          cleanName = decodeURIComponent(u.pathname.split('/').pop()) || 'קובץ';
        } catch {
          cleanName = 'קובץ';
        }
      }
      return [{ name: cleanName, url: cleanUrl }];
    }
    return [];
  }
  if (typeof input === 'string') {
    const trimmedInput = input.trim();
    if (!trimmedInput) return [];

    // Try parsing as JSON first
    if (trimmedInput.startsWith('[') || trimmedInput.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmedInput);
        if (Array.isArray(parsed) || (parsed && typeof parsed === 'object')) {
          return extractAllFiles(parsed);
        }
      } catch {}
    }

    // Split by newlines
    const lines = trimmedInput.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    const files = [];

    lines.forEach((line) => {
      const match = line.match(/https?:\/\/[^\s"'<>\)]+/i);
      if (match) {
        const url = match[0].trim();
        let name = line.substring(0, match.index).replace(/[:\s\-_]+$/, '').trim();
        if (!name) {
          try {
            const u = new URL(url);
            name = decodeURIComponent(u.pathname.split('/').pop()) || 'קובץ';
          } catch {
            name = 'קובץ';
          }
        }
        files.push({ name, url });
      }
    });

    // Fallback: search for any URLs in the entire string if lines didn't catch it
    if (files.length === 0) {
      const urlRegex = /https?:\/\/[^\s"'<>\)]+/gi;
      let m;
      while ((m = urlRegex.exec(trimmedInput)) !== null) {
        const url = m[0].trim();
        let name = 'קובץ';
        try {
          const u = new URL(url);
          name = decodeURIComponent(u.pathname.split('/').pop()) || 'קובץ';
        } catch {}
        files.push({ name, url });
      }
    }

    return files;
  }
  return [];
};

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
        const textToMeasure = (typeof cellVal === 'object' && cellVal.v != null)
          ? String(cellVal.v)
          : String(cellVal);
        const lines = textToMeasure.split('\n');
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

    // Drive Link - Clickable hyperlink
    let driveLinkCell = '';
    if (task.driveLink && typeof task.driveLink === 'string' && task.driveLink.trim().startsWith('http')) {
      driveLinkCell = createHyperlinkCell(task.driveLink.trim(), '🔗 פתח Google Drive');
    } else {
      driveLinkCell = task.driveLink || '';
    }

    // Work order files - Extract and make clickable
    const rawWoFiles = [
      ...extractAllFiles(task.workOrderFiles),
      ...extractAllFiles(task.workOrderFile),
      ...extractAllFiles(task.attachments)
    ];
    const woFiles = [];
    const seenWo = new Set();
    rawWoFiles.forEach((f) => {
      const key = f.url || f.name;
      if (key && !seenWo.has(key)) {
        seenWo.add(key);
        woFiles.push(f);
      }
    });

    let workOrderFilesCell = '';
    if (woFiles.length === 1) {
      workOrderFilesCell = woFiles[0].url
        ? createHyperlinkCell(woFiles[0].url, `🔗 ${woFiles[0].name || 'פתח הזמנת עבודה'}`)
        : (woFiles[0].name || '');
    } else if (woFiles.length > 1) {
      const primaryUrl = woFiles[0].url;
      const label = `🔗 ${woFiles[0].name} (+${woFiles.length - 1} נוספים)`;
      workOrderFilesCell = primaryUrl
        ? createHyperlinkCell(primaryUrl, label)
        : label;
    }

    // Planogram files - Extract and make clickable
    const rawPlanoFiles = [
      ...extractAllFiles(task.planogramFile),
      ...extractAllFiles(task.planogram)
    ];
    const planoFiles = [];
    const seenPlano = new Set();
    rawPlanoFiles.forEach((f) => {
      const key = f.url || f.name;
      if (key && !seenPlano.has(key)) {
        seenPlano.add(key);
        planoFiles.push(f);
      }
    });

    let planogramCell = '';
    if (planoFiles.length === 1) {
      planogramCell = planoFiles[0].url
        ? createHyperlinkCell(planoFiles[0].url, `🔗 ${planoFiles[0].name || 'פתח פלנוגרמה'}`)
        : (planoFiles[0].name || '');
    } else if (planoFiles.length > 1) {
      const primaryUrl = planoFiles[0].url;
      const label = `🔗 ${planoFiles[0].name} (+${planoFiles.length - 1} נוספים)`;
      planogramCell = primaryUrl
        ? createHyperlinkCell(primaryUrl, label)
        : label;
    }

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
      driveLinkCell,
      task.standardsInstituteRequired || 'לא',
      task.diecutsStatus || 'אין',
      task.imagesStatus || 'אין',
      workOrderFilesCell,
      planogramCell,
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
  // SHEET 2: תגובות והתכתבויות (Comments Sheet with Clickable Attachment Links)
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
    const commentFiles = extractAllFiles(c.attachmentUrl || c.attachments);
    const attachmentUrl = commentFiles[0]?.url || (c.attachmentUrl ? String(c.attachmentUrl).trim() : '');
    const attachmentName = commentFiles[0]?.name || c.attachmentName || 'קובץ מצורף';

    const attachmentCell = attachmentUrl
      ? createHyperlinkCell(attachmentUrl, `🔗 ${attachmentName}`)
      : (c.attachmentName || '');
    const attachmentLinkCell = attachmentUrl
      ? createHyperlinkCell(attachmentUrl, attachmentUrl)
      : '';

    return [
      parentTask.jobNumber || c.jobId || '',
      parentTask.title || '',
      c.authorName || c.authorEmail || 'משתמש',
      c.text || '',
      attachmentCell,
      attachmentLinkCell,
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
  // SHEET 4: קבצים ומסמכים (Dedicated Files & Documents with Clickable Direct Links)
  // ---------------------------------------------------------------------------
  const fileHeaders = [
    'מספר פרויקט',
    'שם הפרויקט',
    'לוח',
    'סוג מסמך',
    'שם הקובץ',
    'קישור לחיץ לפתיחה / הורדה',
    'כתובת אינטרנט מלאה (URL)'
  ];

  const fileRows = [];

  combinedTasks.forEach((task) => {
    const boardTitle = getBoardName(task.boardId, settings, flags.isLegacy);

    // 1. Work order files
    const woFiles = [
      ...extractAllFiles(task.workOrderFiles),
      ...extractAllFiles(task.workOrderFile),
      ...extractAllFiles(task.attachments)
    ];
    const seenWoInSheet = new Set();
    woFiles.forEach((f, idx) => {
      const key = f.url || f.name;
      if (seenWoInSheet.has(key)) return;
      seenWoInSheet.add(key);

      fileRows.push([
        task.jobNumber || '',
        task.title || '',
        boardTitle,
        woFiles.length > 1 ? `הזמנת עבודה (${idx + 1}/${woFiles.length})` : 'הזמנת עבודה',
        f.name || 'הזמנת עבודה',
        f.url ? createHyperlinkCell(f.url, `🔗 לחץ לפתיחת ${f.name || 'הקובץ'}`) : 'אין קישור ישיר',
        f.url ? createHyperlinkCell(f.url, f.url) : ''
      ]);
    });

    // 2. Planogram files
    const planoFiles = [
      ...extractAllFiles(task.planogramFile),
      ...extractAllFiles(task.planogram)
    ];
    const seenPlanoInSheet = new Set();
    planoFiles.forEach((f, idx) => {
      const key = f.url || f.name;
      if (seenPlanoInSheet.has(key)) return;
      seenPlanoInSheet.add(key);

      fileRows.push([
        task.jobNumber || '',
        task.title || '',
        boardTitle,
        planoFiles.length > 1 ? `פלנוגרמה (${idx + 1}/${planoFiles.length})` : 'פלנוגרמה',
        f.name || 'פלנוגרמה',
        f.url ? createHyperlinkCell(f.url, `🔗 לחץ לפתיחת ${f.name || 'הפלנוגרמה'}`) : 'אין קישור ישיר',
        f.url ? createHyperlinkCell(f.url, f.url) : ''
      ]);
    });

    // 3. Drive links
    if (task.driveLink && typeof task.driveLink === 'string') {
      const driveMatch = task.driveLink.match(/https?:\/\/[^\s"'<>\)]+/i);
      if (driveMatch) {
        const driveUrl = driveMatch[0].trim();
        fileRows.push([
          task.jobNumber || '',
          task.title || '',
          boardTitle,
          'תיקיית Google Drive',
          'תיקיית דרייב',
          createHyperlinkCell(driveUrl, '🔗 לחץ לפתיחת תיקיית Drive'),
          createHyperlinkCell(driveUrl, driveUrl)
        ]);
      }
    }

    // 4. Comments attachments
    const taskComments = commentsByTaskId.get(task.id) || [];
    taskComments.forEach((c) => {
      const commentFiles = extractAllFiles(c.attachmentUrl || c.attachments);
      if (commentFiles.length > 0) {
        commentFiles.forEach((f) => {
          fileRows.push([
            task.jobNumber || '',
            task.title || '',
            boardTitle,
            'קובץ מצורף לתגובה',
            f.name || c.attachmentName || 'קובץ תגובה',
            f.url ? createHyperlinkCell(f.url, `🔗 לחץ לפתיחת ${f.name || c.attachmentName || 'הקובץ'}`) : 'אין קישור ישיר',
            f.url ? createHyperlinkCell(f.url, f.url) : ''
          ]);
        });
      } else if (c.attachmentUrl && typeof c.attachmentUrl === 'string') {
        const match = c.attachmentUrl.match(/https?:\/\/[^\s"'<>\)]+/i);
        if (match) {
          const url = match[0].trim();
          fileRows.push([
            task.jobNumber || '',
            task.title || '',
            boardTitle,
            'קובץ מצורף לתגובה',
            c.attachmentName || 'קובץ תגובה',
            createHyperlinkCell(url, `🔗 לחץ לפתיחת ${c.attachmentName || 'הקובץ'}`),
            createHyperlinkCell(url, url)
          ]);
        }
      }
    });
  });

  const wsFiles = XLSX.utils.aoa_to_sheet([fileHeaders, ...fileRows]);
  autoFitColumns(wsFiles, fileRows, fileHeaders);

  // ---------------------------------------------------------------------------
  // SHEET 5: ספקים ואנשי קשר (Suppliers & Contacts Sheet)
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
  // SHEET 6: סיכום והגדרות מערכת (Summary Sheet)
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
    ['סה״כ קבצים ומסמכים מקושרים', fileRows.length],
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
  XLSX.utils.book_append_sheet(workbook, wsFiles, 'קבצים ומסמכים');
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
    totalFiles: fileRows.length,
    totalComments: allComments.length,
    totalSubtasks: subtaskRows.length
  };
};
