/**
 * Groopy Work Manager - Cloud Firestore Utility
 *
 * This module connects directly to the Cloud Firestore database.
 * Tasks, comments, private notes and settings are scoped to the authenticated user ID.
 */

import { auth } from '../firebase';
import { db } from '../firebaseDb';
import { storage } from '../firebaseStorage';
import {
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  getDoc,
  getDocFromServer,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where
} from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { INITIAL_TASKS } from '../data/mockData';
import { APP_VERSIONS, DEFAULT_APP_VERSION } from './featureFlags';

const assertSystemManagerSession = () => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error('פעולה זו זמינה למנהלת המערכת בלבד');
  }
};

// Helper to upload files directly to Firebase Storage
export const uploadFileToStorage = (file, folderPath = 'uploads', onProgress = null) => {
  assertSystemManagerSession();
  if (!activeOrganizationId) throw new Error('Organization context is required to upload files');
  return new Promise((resolve, reject) => {
    // Generate a unique file name to avoid collisions
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${fileExtension}`;
    const storageRef = ref(storage, `organizations/${activeOrganizationId}/${folderPath}/${uniqueFileName}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        console.error("Firebase Storage Upload Error:", error);
        reject(error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          resolve({
            url: downloadURL,
            name: file.name,
            size: file.size,
            uploadedAt: new Date().toISOString()
          });
        }).catch(reject);
      }
    );
  });
};

const TASKS_COLLECTION = 'tasks';
const COMMENTS_COLLECTION = 'comments';
const ACTIVITY_LOGS_COLLECTION = 'activityLogs';
const TRASH_RETENTION_DAYS = 30;
const DEFAULT_AUTO_ARCHIVE_INACTIVE_DAYS = 45;
const ARCHIVE_STATUS = 'ארכיון';
export const SYSTEM_ADMIN_EMAILS = ['shaharsolutions@gmail.com'];
export const isSystemAdminEmail = (email) => SYSTEM_ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());
export const SYSTEM_ADMIN_EMAIL = 'shaharsolutions@gmail.com';
export const DEFAULT_ORGANIZATION_ID = '';
export const DEFAULT_ORGANIZATION_NAME = '';
export const SUSPENDED_CONTACT_METHODS = {
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  NONE: 'none'
};
export const DEFAULT_SUSPENDED_CONTACT_METHOD = SUSPENDED_CONTACT_METHODS.WHATSAPP;
export const SUSPENDED_CONTACT_WHATSAPP_PHONE = '052-8366744';
export const SUSPENDED_CONTACT_WHATSAPP_PHONE_RAW = '972528366744';
export const SUSPENDED_CONTACT_EMAIL = 'shaharsolutions@gmail.com';
let activeOrganizationId = '';

export const setActiveOrganizationContext = (organizationId) => {
  activeOrganizationId = organizationId || '';
};

const createShareToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const getOrCreateOrganizationShareToken = async (organizationId) => {
  if (!organizationId) throw new Error('Organization ID is required');
  assertSystemManagerSession();
  const organizationRef = doc(db, 'organizations', organizationId);
  const organizationSnap = await getDoc(organizationRef);
  const existingToken = organizationSnap.exists() ? organizationSnap.data().viewerToken : '';
  if (existingToken) return existingToken;
  const viewerToken = createShareToken();
  await setDoc(organizationRef, { viewerToken }, { merge: true });
  return viewerToken;
};

export const authorizeViewerSession = async (organizationId, viewerToken, ownerId) => {
  const user = auth.currentUser;
  if (!user || !organizationId || !viewerToken || !ownerId) {
    throw new Error('קישור השיתוף אינו תקין או שפג תוקפו');
  }
  await setDoc(doc(db, 'viewerSessions', user.uid), {
    organizationId,
    ownerId,
    viewerToken,
    createdAt: new Date().toISOString()
  });
  return true;
};

export const createShortShareLink = async (userId, organizationId) => {
  if (!userId || !organizationId) throw new Error('User ID and Organization ID are required');
  assertSystemManagerSession();
  const viewerToken = await getOrCreateOrganizationShareToken(organizationId);
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const shortId = Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').substring(0, 8);
  const docRef = doc(db, 'shareLinks', shortId);
  await setDoc(docRef, {
    userId,
    organizationId,
    shareToken: viewerToken,
    createdAt: new Date().toISOString()
  });
  return shortId;
};

export const resolveShortShareLink = async (shortId) => {
  if (!shortId) return null;
  const docSnap = await getDoc(doc(db, 'shareLinks', shortId));
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
};

const currentOrganizationId = () => activeOrganizationId || '';

const getCurrentActor = () => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return null;
  return {
    actorUid: user.uid,
    actorEmail: user.email || '',
    actorName: user.displayName || user.email || 'משתמש מערכת',
    isSystemAdmin: isSystemAdminEmail(user.email)
  };
};

const getCommentAuthorName = (fallbackName = '') => {
  const user = auth.currentUser;
  if (user && !user.isAnonymous && user.email) {
    return user.email.trim();
  }
  return fallbackName.trim();
};

let lastUserTouchTime = 0;
export const touchUserActivity = async (user = auth.currentUser) => {
  if (!user || user.isAnonymous) return;
  const now = Date.now();
  // Throttle updates to at most once every 2 minutes
  if (now - lastUserTouchTime < 2 * 60 * 1000) return;
  lastUserTouchTime = now;
  try {
    const userRef = doc(db, 'users', user.uid);
    const nowIso = new Date(now).toISOString();
    await setDoc(userRef, {
      lastLogin: nowIso,
      lastActiveAt: nowIso
    }, { merge: true });
  } catch (e) {
    // Non-critical background update
  }
};

export const recordActivity = async ({
  action,
  actionLabel,
  targetType,
  targetId = '',
  targetLabel = '',
  targetUserId = '',
  details = '',
  metadata = {},
  organizationId = ''
}) => {
  const actor = getCurrentActor();
  if (!actor) return;

  try {
    const now = new Date().toISOString();
    await addDoc(collection(db, ACTIVITY_LOGS_COLLECTION), {
      ...actor,
      action,
      actionLabel,
      targetType,
      targetId,
      targetLabel,
      targetUserId,
      organizationId: organizationId || activeOrganizationId || targetUserId,
      details,
      metadata,
      createdAt: now
    });
    touchUserActivity(auth.currentUser);
  } catch (e) {
    console.warn('Activity log write failed', e);
  }
};

const FIELD_LABELS = {
  title: 'שם פרויקט',
  description: 'תיאור',
  workType: 'סוג פרויקט',
  storeName: 'חנות',
  supplierName: 'ספק',
  contactPerson: 'איש קשר',
  importManager: 'מנהל יבוא',
  status: 'סטטוס',
  priority: 'עדיפות',
  deadline: 'דדליין',
  driveLink: 'קישור דרייב',
  supplierContactEmail: 'אימייל איש קשר',
  diecutsStatus: 'דייקאטים',
  imagesStatus: 'תמונות',
  standardsInstituteRequired: 'דרישות מכון תקנים',
  planogramFile: 'פלנוגרמה',
  workOrderFiles: 'הזמנת עבודה',
  subtasks: 'תתי משימות',
  attachments: 'הזמנת עבודה (קבצים מצורפים)',
  boardId: 'לוח',
  internalNotes: 'הערות פנימיות',
  weeklyHours: 'שעות עבודה'
};

const getChangedFields = (before = {}, afterPatch = {}) => {
  return Object.keys(afterPatch)
    .filter(key => key !== 'updatedAt')
    .filter(key => JSON.stringify(before[key] ?? null) !== JSON.stringify(afterPatch[key] ?? null))
    .map(key => ({
      key,
      label: FIELD_LABELS[key] || key,
      previousValue: before[key],
      newValue: afterPatch[key]
    }));
};

const formatChangedFields = (fieldNames) => {
  if (!fieldNames.length) return 'עודכן זמן הפעילות';
  if (fieldNames.length <= 4) return `עודכנו השדות: ${fieldNames.join(', ')}`;
  return `עודכנו ${fieldNames.length} שדות: ${fieldNames.slice(0, 4).join(', ')} ועוד`;
};

const getSubtaskCompletionChangeDetails = (previousSubtasks = [], nextSubtasks = []) => {
  if (!Array.isArray(previousSubtasks) || !Array.isArray(nextSubtasks)) return '';
  if (previousSubtasks.length !== nextSubtasks.length) return '';

  const previousById = new Map(previousSubtasks.map((item, index) => [
    item?.id || `legacy-${index}-${item?.text || item}`,
    item
  ]));
  const changedItems = [];

  for (const [index, nextItem] of nextSubtasks.entries()) {
    const itemId = nextItem?.id || `legacy-${index}-${nextItem?.text || nextItem}`;
    const previousItem = previousById.get(itemId);
    if (!previousItem) return '';

    const previousText = typeof previousItem === 'string' ? previousItem : (previousItem.text || '');
    const nextText = typeof nextItem === 'string' ? nextItem : (nextItem.text || '');
    if (previousText !== nextText) return '';

    const previousCompleted = Boolean(previousItem?.completed);
    const nextCompleted = Boolean(nextItem?.completed);
    if (previousCompleted !== nextCompleted) {
      changedItems.push({
        text: nextText.trim() || 'משימה ללא שם',
        completed: nextCompleted
      });
    }
  }

  if (changedItems.length !== 1) return '';

  const changedItem = changedItems[0];
  return changedItem.completed
    ? `המשימה "${changedItem.text}" סומנה כהושלמה`
    : `הסימון הוסר מהמשימה "${changedItem.text}"`;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const workUpdateFieldLabelsPattern = Object.values(FIELD_LABELS)
  .map(escapeRegExp)
  .join('|');
const singleFieldWorkUpdatePattern = new RegExp(`^(${workUpdateFieldLabelsPattern}) עודכן מ-[\\s\\S]+ ל-[\\s\\S]+$`);

const isSystemWorkUpdateComment = (comment = {}) => {
  const text = String(comment.text || '').trim();
  return (
    text.startsWith('עודכנו פרטי פרויקט:') ||
    text.startsWith('עודכנו פרטי עבודה:') ||
    /^סטטוס (הפרויקט|העבודה) השתנה מ-[\s\S]+ ל-[\s\S]+$/.test(text) ||
    singleFieldWorkUpdatePattern.test(text)
  );
};

// Seed the database for a specific user if their tasks are empty (disabled to prevent reviving deleted demo tasks)
export const seedUserDatabaseIfEmpty = async () => {
  return false;
};

// Generate the next Job Number (e.g. GP-1004) based on existing tasks in Firestore
const generateNextJobNumber = (tasks) => {
  let maxNum = 1000;
  tasks.forEach(t => {
    const match = t.jobNumber && t.jobNumber.match(/GP-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  return `GP-${maxNum + 1}`;
};

export const normalizeTaskStatus = (status) => {
  if (typeof status !== 'string' || !status.trim()) {
    return 'חדש';
  }
  const trimmed = status.trim();
  const legacyMapping = {
    'ממתין למידע': 'בטיפול',
    'ממתין לספק בסין': 'נשלח לספק',
    'ממתין לאישור': 'בטיפול',
    'נדרש תיקון': 'בטיפול'
  };
  return legacyMapping[trimmed] || trimmed;
};

const getLegacyOwnerId = (scopeId) => {
  const currentUser = auth.currentUser;
  return currentUser && !currentUser.isAnonymous ? currentUser.uid : scopeId;
};

export const getTasks = async (userId, organizationId = null) => {
  const targetOrgId = organizationId || activeOrganizationId || '';
  if (!userId && !targetOrgId) return [];
  try {
    const tasksMap = new Map();

    // 1. Primary: Fetch tasks for the organization
    if (targetOrgId) {
      try {
        const qOrg = query(collection(db, TASKS_COLLECTION), where('organizationId', '==', targetOrgId));
        let querySnapshot;
        try {
          querySnapshot = await getDocsFromServer(qOrg);
        } catch {
          querySnapshot = await getDocs(qOrg);
        }
        querySnapshot?.forEach((doc) => {
          tasksMap.set(doc.id, {
            id: doc.id,
            ...doc.data()
          });
        });
      } catch (orgQueryErr) {
        console.warn('Organization task query failed, will rely on user query', orgQueryErr);
      }
    }

    // 2. Legacy fallback/merge: Fetch any tasks by userId (catches legacy unmigrated tasks)
    if (userId) {
      try {
        const qUser = query(collection(db, TASKS_COLLECTION), where('userId', '==', userId));
        let querySnapshot;
        try {
          querySnapshot = await getDocsFromServer(qUser);
        } catch {
          querySnapshot = await getDocs(qUser);
        }
        querySnapshot?.forEach((doc) => {
          const data = doc.data();
          if (!tasksMap.has(doc.id)) {
            tasksMap.set(doc.id, {
              id: doc.id,
              ...data
            });
            // Auto-heal: If document is missing organizationId, associate it
            if (!data.organizationId && targetOrgId) {
              updateDoc(doc.ref, { organizationId: targetOrgId }).catch(() => {});
            }
          }
        });
      } catch (userQueryErr) {
        console.warn('User task query failed', userQueryErr);
      }
    }

    const tasks = [];
    tasksMap.forEach((data, id) => {
      if (data.deletedAt) return;
      tasks.push({
        id,
        ...data,
        status: normalizeTaskStatus(data.status)
      });
    });
    return tasks;
  } catch (e) {
    console.error("Error fetching tasks from Cloud Firestore", e);
    return [];
  }
};

export const getTrashedTasks = async (userId, organizationId = null) => {
  const targetOrgId = organizationId || activeOrganizationId || '';
  if (!userId && !targetOrgId) return [];
  try {
    const tasksMap = new Map();

    if (targetOrgId) {
      try {
        const qOrg = query(collection(db, TASKS_COLLECTION), where('organizationId', '==', targetOrgId));
        let querySnapshot;
        try {
          querySnapshot = await getDocsFromServer(qOrg);
        } catch {
          querySnapshot = await getDocs(qOrg);
        }
        querySnapshot?.forEach((taskDoc) => {
          tasksMap.set(taskDoc.id, { id: taskDoc.id, ...taskDoc.data() });
        });
      } catch (orgErr) {
        console.warn('Organization trash query failed', orgErr);
      }
    }

    if (userId) {
      try {
        const qUser = query(collection(db, TASKS_COLLECTION), where('userId', '==', userId));
        let querySnapshot;
        try {
          querySnapshot = await getDocsFromServer(qUser);
        } catch {
          querySnapshot = await getDocs(qUser);
        }
        querySnapshot?.forEach((taskDoc) => {
          if (!tasksMap.has(taskDoc.id)) {
            tasksMap.set(taskDoc.id, { id: taskDoc.id, ...taskDoc.data() });
          }
        });
      } catch (userErr) {
        console.warn('User trash query failed', userErr);
      }
    }

    const tasks = [];
    tasksMap.forEach((data, id) => {
      if (!data.deletedAt) return;
      tasks.push({ id, ...data, status: normalizeTaskStatus(data.status) });
    });
    return tasks.sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt));
  } catch (e) {
    console.error('Error fetching trashed tasks from Cloud Firestore', e);
    return [];
  }
};

export const getCommentsForTask = async (taskId, userId, organizationId = null) => {
  if (!taskId) return [];
  const targetOrgId = organizationId || activeOrganizationId || '';
  try {
    const commentsMap = new Map();

    if (targetOrgId) {
      try {
        const qOrg = query(
          collection(db, COMMENTS_COLLECTION),
          where("jobId", "==", taskId),
          where("organizationId", "==", targetOrgId)
        );
        const querySnapshot = await getDocs(qOrg);
        querySnapshot.forEach((doc) => {
          commentsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
      } catch (err) {
        console.warn('Organization comments query failed', err);
      }
    }

    if (userId) {
      try {
        const qUser = query(
          collection(db, COMMENTS_COLLECTION),
          where("jobId", "==", taskId),
          where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(qUser);
        querySnapshot.forEach((doc) => {
          if (!commentsMap.has(doc.id)) {
            commentsMap.set(doc.id, { id: doc.id, ...doc.data() });
          }
        });
      } catch (err) {
        console.warn('User comments query failed', err);
      }
    }

    const comments = [];
    commentsMap.forEach((comment) => {
      comments.push(comment);
    });
    return comments
      .filter(comment => !isSystemWorkUpdateComment(comment))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    console.error(`Error fetching comments for task ${taskId}`, e);
    return [];
  }
};

export const getAllCommentsForUser = async (userId, organizationId = null) => {
  const targetOrgId = organizationId || activeOrganizationId || '';
  if (!userId && !targetOrgId) return [];
  try {
    const commentsMap = new Map();

    if (targetOrgId) {
      try {
        const qOrg = query(
          collection(db, COMMENTS_COLLECTION),
          where("organizationId", "==", targetOrgId)
        );
        const snap = await getDocs(qOrg);
        snap.forEach((doc) => {
          commentsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
      } catch (err) {
        console.warn('Organization all comments query failed', err);
      }
    }

    if (userId) {
      try {
        const qUser = query(
          collection(db, COMMENTS_COLLECTION),
          where("userId", "==", userId)
        );
        const snap = await getDocs(qUser);
        snap.forEach((doc) => {
          if (!commentsMap.has(doc.id)) {
            commentsMap.set(doc.id, { id: doc.id, ...doc.data() });
          }
        });
      } catch (err) {
        console.warn('User all comments query failed', err);
      }
    }

    const comments = [];
    commentsMap.forEach((comment) => {
      comments.push(comment);
    });
    return comments.filter(comment => !isSystemWorkUpdateComment(comment));
  } catch (e) {
    console.error(`Error fetching all comments`, e);
    return [];
  }
};

export const addComment = async (jobId, authorName, text, attachmentUrl = null, attachmentName = null, userId, organizationId = null) => {
  if (!userId) throw new Error("User ID is required to add a comment");
  try {
    const now = new Date().toISOString();
    const resolvedAuthorName = getCommentAuthorName(authorName);
    const targetOrgId = organizationId || activeOrganizationId || '';
    const commentData = {
      jobId,
      userId,
      organizationId: targetOrgId,
      authorName: resolvedAuthorName,
      text: text.trim(),
      createdAt: now
    };

    if (attachmentUrl) {
      commentData.attachmentUrl = attachmentUrl;
    }
    if (attachmentName) {
      commentData.attachmentName = attachmentName;
    }

    const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), commentData);

    let taskName = jobId;
    try {
      const taskDoc = await getDoc(doc(db, TASKS_COLLECTION, jobId));
      if (taskDoc.exists()) {
        taskName = taskDoc.data().title || taskDoc.data().jobNumber || jobId;
      }
    } catch (e) {
      console.warn("Failed to fetch task name for logging comment creation:", e);
    }

    await recordActivity({
      action: 'comment.created',
      actionLabel: 'הוספת תגובה',
      targetType: 'comment',
      targetId: docRef.id,
      targetLabel: resolvedAuthorName,
      targetUserId: userId,
      details: `תגובה נוספה לפרויקט "${taskName}"`,
      metadata: { jobId, hasAttachment: Boolean(attachmentUrl) }
    });

    // Managers can also refresh the task timestamp. External viewers may add
    // comments, but must not receive permission to edit the task itself.
    const user = auth.currentUser;
    if (user && !user.isAnonymous) {
      try {
        await updateTask(jobId, {});
      } catch (touchError) {
        console.warn(`Comment ${docRef.id} was added, but task ${jobId} updatedAt refresh failed`, touchError);
      }
    }

    return { id: docRef.id, ...commentData };
  } catch (e) {
    console.error("Error adding comment to Cloud Firestore", e);
    throw e;
  }
};

export const deleteComment = async (commentId, jobId = null) => {
  assertSystemManagerSession();
  try {
    const commentSnap = await getDoc(doc(db, COMMENTS_COLLECTION, commentId));
    const commentData = commentSnap.exists() ? commentSnap.data() : {};
    const finalJobId = jobId || commentData.jobId || '';

    let taskName = finalJobId;
    if (finalJobId) {
      try {
        const taskDoc = await getDoc(doc(db, TASKS_COLLECTION, finalJobId));
        if (taskDoc.exists()) {
          taskName = taskDoc.data().title || taskDoc.data().jobNumber || finalJobId;
        }
      } catch (e) {
        console.warn("Failed to fetch task name for logging comment deletion:", e);
      }
    }

    await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
    await recordActivity({
      action: 'comment.deleted',
      actionLabel: 'מחיקת תגובה',
      targetType: 'comment',
      targetId: commentId,
      targetLabel: commentData.authorName || '',
      targetUserId: commentData.userId || '',
      details: finalJobId ? `תגובה נמחקה מהפרויקט "${taskName}"` : 'תגובה נמחקה',
      metadata: { jobId: finalJobId || commentData.jobId || '' }
    });
    if (jobId) {
      await updateTask(jobId, {});
    }
  } catch (e) {
    console.error("Error deleting comment in Cloud Firestore", e);
    throw e;
  }
};

export const getPrivateNotes = async (taskId, userId) => {
  if (!userId) return '';
  try {
    const docRef = doc(db, 'taskPrivateNotes', taskId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && (
      docSnap.data().organizationId === userId ||
      docSnap.data().userId === getLegacyOwnerId(userId) ||
      docSnap.data().userId === userId ||
      docSnap.data().organizationId === currentOrganizationId() ||
      docSnap.data().userId === auth.currentUser?.uid
    )) {
      return docSnap.data().notes || '';
    }
    return '';
  } catch (e) {
    console.error(`Error fetching private notes for task ${taskId}`, e);
    return '';
  }
};

export const getAllPrivateNotesForUser = async (userId, organizationId = null) => {
  const targetOrgId = organizationId || activeOrganizationId || '';
  if (!userId && !targetOrgId) return new Map();
  try {
    const notesMap = new Map();

    if (targetOrgId) {
      try {
        const qOrg = query(
          collection(db, 'taskPrivateNotes'),
          where('organizationId', '==', targetOrgId)
        );
        const snap = await getDocs(qOrg);
        snap.forEach((docSnap) => {
          notesMap.set(docSnap.id, docSnap.data()?.notes || '');
        });
      } catch (err) {
        console.warn('Organization private notes query failed', err);
      }
    }

    if (userId) {
      try {
        const qUser = query(
          collection(db, 'taskPrivateNotes'),
          where('userId', '==', userId)
        );
        const snap = await getDocs(qUser);
        snap.forEach((docSnap) => {
          if (!notesMap.has(docSnap.id)) {
            notesMap.set(docSnap.id, docSnap.data()?.notes || '');
          }
        });
      } catch (err) {
        console.warn('User private notes query failed', err);
      }
    }

    return notesMap;
  } catch (e) {
    console.error('Error fetching all private notes', e);
    return new Map();
  }
};

export const createTask = async (taskData, userId, options = {}) => {
  if (!userId) throw new Error("User ID is required to create a task");
  assertSystemManagerSession();
  try {
    const targetOrgId = options.organizationId || activeOrganizationId || '';
    const tasks = await getTasks(userId, targetOrgId);
    const jobNumber = generateNextJobNumber(tasks);
    const now = new Date().toISOString();

    const { internalNotes, ...taskWithoutPrivate } = taskData;

    const newTask = {
      ...taskWithoutPrivate,
      userId,
      organizationId: targetOrgId,
      jobNumber,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTask);

    if (internalNotes) {
      await setDoc(doc(db, 'taskPrivateNotes', docRef.id), { notes: internalNotes, userId, organizationId: targetOrgId });
    }

    // Auto-add supplier & contact to settings if new
    await autoAddSupplierAndContactFromTask({ ...newTask, internalNotes });
    if (!options.skipActivityLog) {
      await recordActivity({
        action: 'task.created',
        actionLabel: 'יצירת פרויקט',
        targetType: 'task',
        targetId: docRef.id,
        targetLabel: newTask.title || newTask.jobNumber || '',
        targetUserId: userId,
        details: `נוצר פרויקט חדש ${newTask.jobNumber || ''}`.trim(),
        metadata: { jobNumber, status: newTask.status || '' }
      });
    }

    return { id: docRef.id, ...newTask, internalNotes };
  } catch (e) {
    console.error("Error creating task in Cloud Firestore", e);
    throw e;
  }
};

export const updateTask = async (taskId, updatedData) => {
  assertSystemManagerSession();
  try {
    const now = new Date().toISOString();
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    const beforeSnap = await getDoc(docRef);
    const beforeData = beforeSnap.exists() ? beforeSnap.data() : {};

    const { internalNotes, ...taskWithoutPrivate } = updatedData;

    const mergeData = {
      ...taskWithoutPrivate,
      updatedAt: now
    };

    // Only update tasks collection if there are fields other than internalNotes to update
    if (Object.keys(mergeData).length > 1) { // includes updatedAt
      await updateDoc(docRef, mergeData);
    } else {
      await updateDoc(docRef, { updatedAt: now });
    }

    const docSnap = await getDoc(docRef);
    const targetUserId = auth.currentUser?.uid || (docSnap.exists() ? (docSnap.data().userId || docSnap.data().organizationId) : null);

    if (internalNotes !== undefined && targetUserId) {
      await setDoc(doc(db, 'taskPrivateNotes', taskId), {
        notes: internalNotes,
        userId: targetUserId,
        organizationId: currentOrganizationId()
      });
    }

    const shouldSyncDirectory =
      Object.prototype.hasOwnProperty.call(taskWithoutPrivate, 'supplierName') ||
      Object.prototype.hasOwnProperty.call(taskWithoutPrivate, 'contactPerson') ||
      Object.prototype.hasOwnProperty.call(taskWithoutPrivate, 'supplierContactEmail');

    if (shouldSyncDirectory && docSnap.exists()) {
      try {
        await autoAddSupplierAndContactFromTask(docSnap.data());
      } catch (syncError) {
        console.warn(`Task ${taskId} was updated, but supplier/contact sync failed`, syncError);
      }
    }

    if (Object.prototype.hasOwnProperty.call(taskWithoutPrivate, 'status')) {
      const verifiedTask = await getDocFromServer(docRef);
      if (!verifiedTask.exists() || verifiedTask.data().status !== taskWithoutPrivate.status) {
        throw new Error(`Task ${taskId} status was not persisted on the server`);
      }
    }

    const changedFieldDetails = getChangedFields(
      { ...beforeData, internalNotes: undefined },
      { ...taskWithoutPrivate, ...(internalNotes !== undefined ? { internalNotes } : {}) }
    );
    const changedFields = changedFieldDetails.map(field => field.label);

    const shouldLogTaskUpdate = changedFields.length > 0;
    if (shouldLogTaskUpdate) {
      const isStatusOnly = changedFields.length === 1 && changedFields[0] === 'סטטוס';
      const subtaskCompletionDetails = changedFields.length === 1 && changedFieldDetails[0]?.key === 'subtasks'
        ? getSubtaskCompletionChangeDetails(beforeData.subtasks, taskWithoutPrivate.subtasks)
        : '';
      await recordActivity({
        action: isStatusOnly ? 'task.status_changed' : 'task.updated',
        actionLabel: isStatusOnly ? 'שינוי סטטוס' : 'עדכון פרויקט',
        targetType: 'task',
        targetId: taskId,
        targetLabel: docSnap.exists() ? (docSnap.data().title || docSnap.data().jobNumber || '') : '',
        targetUserId: targetUserId || beforeData.userId || '',
        details: isStatusOnly
          ? `סטטוס עודכן מ-${beforeData.status || 'לא ידוע'} ל-${taskWithoutPrivate.status}`
          : subtaskCompletionDetails
            ? subtaskCompletionDetails
          : formatChangedFields(changedFields),
        metadata: {
          changedFields,
          previousStatus: beforeData.status || '',
          newStatus: taskWithoutPrivate.status || ''
        }
      });
    }

    return true;
  } catch (e) {
    console.error(`Error updating task ${taskId} in Cloud Firestore`, e);
    throw e;
  }
};

export const deleteTask = async (taskId) => {
  assertSystemManagerSession();
  try {
    const taskSnap = await getDoc(doc(db, TASKS_COLLECTION, taskId));
    const taskData = taskSnap.exists() ? taskSnap.data() : {};
    const deletedAt = new Date();
    const expiresAt = new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
      deletedAt: deletedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      updatedAt: deletedAt.toISOString()
    });
    await recordActivity({
      action: 'task.deleted',
      actionLabel: 'העברה לפח אשפה',
      targetType: 'task',
      targetId: taskId,
      targetLabel: taskData.title || taskData.jobNumber || '',
      targetUserId: taskData.userId || '',
      details: 'הפרויקט הועבר לפח האשפה ל-30 יום',
      metadata: { expiresAt: expiresAt.toISOString() }
    });
    return true;
  } catch (e) {
    console.error(`Error moving task ${taskId} to trash in Cloud Firestore`, e);
    throw e;
  }
};

export const restoreTask = async (taskId) => {
  assertSystemManagerSession();
  try {
    const taskSnap = await getDoc(doc(db, TASKS_COLLECTION, taskId));
    const taskData = taskSnap.exists() ? taskSnap.data() : {};
    await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
      deletedAt: deleteField(),
      expiresAt: deleteField(),
      updatedAt: new Date().toISOString()
    });
    await recordActivity({
      action: 'task.restored',
      actionLabel: 'שחזור פרויקט',
      targetType: 'task',
      targetId: taskId,
      targetLabel: taskData.title || taskData.jobNumber || '',
      targetUserId: taskData.userId || '',
      details: 'הפרויקט שוחזר מפח האשפה',
      metadata: {}
    });
    return true;
  } catch (e) {
    console.error(`Error restoring task ${taskId} from trash`, e);
    throw e;
  }
};

export const permanentlyDeleteTask = async (taskId) => {
  assertSystemManagerSession();
  try {
    const taskSnap = await getDoc(doc(db, TASKS_COLLECTION, taskId));
    const taskData = taskSnap.exists() ? taskSnap.data() : {};
    await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
    await deleteDoc(doc(db, 'taskPrivateNotes', taskId));

    const q = query(collection(db, COMMENTS_COLLECTION), where("jobId", "==", taskId));
    const querySnapshot = await getDocs(q);
    for (const commentDoc of querySnapshot.docs) {
      await deleteDoc(doc(db, COMMENTS_COLLECTION, commentDoc.id));
    }
    await recordActivity({
      action: 'task.permanently_deleted',
      actionLabel: 'מחיקה לצמיתות',
      targetType: 'task',
      targetId: taskId,
      targetLabel: taskData.title || taskData.jobNumber || '',
      targetUserId: taskData.userId || '',
      details: 'הפרויקט והמידע המשויך נמחקו לצמיתות',
      metadata: {}
    });
    return true;
  } catch (e) {
    console.error(`Error permanently deleting task ${taskId} and related data`, e);
    throw e;
  }
};

export const purgeExpiredTasks = async (userId, organizationId = null) => {
  if (!userId && !organizationId) return 0;
  assertSystemManagerSession();
  const trashedTasks = await getTrashedTasks(userId, organizationId);
  const now = Date.now();
  const expiredTasks = trashedTasks.filter(task => Date.parse(task.expiresAt) <= now);
  await Promise.all(expiredTasks.map(task => permanentlyDeleteTask(task.id)));
  return expiredTasks.length;
};

export const emptyTrash = async (userId, organizationId = null) => {
  if (!userId && !organizationId) return 0;
  assertSystemManagerSession();
  const trashedTasks = await getTrashedTasks(userId, organizationId);
  if (trashedTasks.length === 0) return 0;
  await Promise.all(trashedTasks.map(task => permanentlyDeleteTask(task.id)));
  return trashedTasks.length;
};

export const autoArchiveInactiveTasks = async (userId, organizationId = null, inactiveDays = DEFAULT_AUTO_ARCHIVE_INACTIVE_DAYS) => {
  let resolvedOrgId = organizationId;
  let resolvedDays = inactiveDays;
  if (typeof organizationId === 'number') {
    resolvedDays = organizationId;
    resolvedOrgId = null;
  }
  const targetOrgId = resolvedOrgId || activeOrganizationId || '';
  if (!userId && !targetOrgId) return 0;
  assertSystemManagerSession();

  const parsedDays = Number(resolvedDays);
  const days = Number.isFinite(parsedDays) && parsedDays > 0
    ? Math.floor(parsedDays)
    : DEFAULT_AUTO_ARCHIVE_INACTIVE_DAYS;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const allTasks = await getTasks(userId, targetOrgId);
  const now = new Date().toISOString();
  const tasksToArchive = allTasks.filter((task) => {
    if (task.deletedAt || task.status === ARCHIVE_STATUS) return false;
    const lastActivity = Date.parse(task.updatedAt || task.createdAt || '');
    return Number.isFinite(lastActivity) && lastActivity <= cutoff;
  });

  for (const task of tasksToArchive) {
    await updateDoc(doc(db, TASKS_COLLECTION, task.id), {
      status: ARCHIVE_STATUS,
      updatedAt: now
    });
    await recordActivity({
      action: 'task.auto_archived',
      actionLabel: 'ארכוב אוטומטי',
      targetType: 'task',
      targetId: task.id,
      targetLabel: task.title || task.jobNumber || '',
      targetUserId: task.userId || userId,
      details: `הפרויקט הועבר לארכיון לאחר ${days} ימים ללא עדכון`,
      metadata: {
        previousStatus: task.status || '',
        archivedAfterDays: days,
        lastActivityAt: task.updatedAt || task.createdAt || ''
      }
    });
  }

  return tasksToArchive.length;
};

const SETTINGS_COLLECTION = 'settings';

export const getGlobalSettings = async (userId) => {
  if (!userId) return null;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (e) {
    console.error("Error fetching settings from Cloud Firestore", e);
    return null;
  }
};

export const saveGlobalSettings = async (settingsData, userId, options = {}) => {
  if (!userId) throw new Error("User ID is required to save settings");
  assertSystemManagerSession();
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    await setDoc(docRef, { ...settingsData, organizationId: userId });
    if (settingsData.appVersion) {
      try {
        await updateDoc(doc(db, 'organizations', userId), {
          appVersion: settingsData.appVersion,
          updatedAt: new Date().toISOString()
        });
      } catch {
        // Compatibility registry or fallback
      }
    }
    if (!options.skipActivityLog) {
      await recordActivity({
        action: 'settings.updated',
        actionLabel: 'עדכון הגדרות',
        targetType: 'settings',
        targetId: userId,
        targetLabel: 'הגדרות מערכת',
        targetUserId: userId,
        details: 'הגדרות המערכת עודכנו',
        metadata: {}
      });
    }
    return true;
  } catch (e) {
    console.error("Error saving settings to Cloud Firestore", e);
    throw e;
  }
};

/* Suppliers Firestore CRUD Helpers */

export const addSupplier = async (supplierData, userId, options = {}) => {
  if (!userId) throw new Error("User ID is required to add supplier");
  assertSystemManagerSession();
  try {
    const dataToSave = { ...supplierData };
    delete dataToSave.id;
    const docRef = await addDoc(collection(db, 'suppliers'), {
      ...dataToSave,
      userId,
      organizationId: currentOrganizationId()
    });
    if (!options.skipActivityLog) {
      await recordActivity({
        action: 'supplier.created',
        actionLabel: 'הוספת ספק',
        targetType: 'supplier',
        targetId: docRef.id,
        targetLabel: dataToSave.name || '',
        targetUserId: userId,
        details: `הספק "${dataToSave.name || ''}" נוסף למערכת`,
        metadata: {}
      });
    }
    return docRef.id;
  } catch (e) {
    console.error("Error adding supplier to Cloud Firestore", e);
    throw e;
  }
};

export const updateSupplier = async (supplierId, supplierData, options = {}) => {
  if (!supplierId) throw new Error("Supplier ID is required to update supplier");
  assertSystemManagerSession();
  try {
    const { userId, ...dataToUpdate } = supplierData;
    delete dataToUpdate.id;
    const docRef = doc(db, 'suppliers', supplierId);
    const beforeSnap = await getDoc(docRef);
    const beforeData = beforeSnap.exists() ? beforeSnap.data() : {};
    await updateDoc(docRef, dataToUpdate);
    if (!options.skipActivityLog) {
      await recordActivity({
        action: 'supplier.updated',
        actionLabel: 'עדכון ספק',
        targetType: 'supplier',
        targetId: supplierId,
        targetLabel: dataToUpdate.name || beforeData.name || '',
        targetUserId: beforeData.userId || userId || '',
        details: `כרטיס הספק "${dataToUpdate.name || beforeData.name || ''}" עודכן`,
        metadata: {}
      });
    }
    return true;
  } catch (e) {
    console.error("Error updating supplier in Cloud Firestore", e);
    throw e;
  }
};

export const deleteSupplier = async (supplierId) => {
  if (!supplierId) throw new Error("Supplier ID is required to delete supplier");
  assertSystemManagerSession();
  try {
    const docRef = doc(db, 'suppliers', supplierId);
    const beforeSnap = await getDoc(docRef);
    const beforeData = beforeSnap.exists() ? beforeSnap.data() : {};
    await deleteDoc(docRef);
    await recordActivity({
      action: 'supplier.deleted',
      actionLabel: 'מחיקת ספק',
      targetType: 'supplier',
      targetId: supplierId,
      targetLabel: beforeData.name || '',
      targetUserId: beforeData.userId || '',
      details: `הספק "${beforeData.name || ''}" נמחק`,
      metadata: {}
    });
    return true;
  } catch (e) {
    console.error("Error deleting supplier from Cloud Firestore", e);
    throw e;
  }
};

/* Contacts Firestore CRUD Helpers */

export const addContact = async (contactData, userId, options = {}) => {
  if (!userId) throw new Error("User ID is required to add contact");
  assertSystemManagerSession();
  try {
    const dataToSave = { ...contactData };
    delete dataToSave.id;
    const docRef = await addDoc(collection(db, 'contacts'), {
      ...dataToSave,
      userId,
      organizationId: currentOrganizationId()
    });
    if (!options.skipActivityLog) {
      await recordActivity({
        action: 'contact.created',
        actionLabel: 'הוספת איש קשר',
        targetType: 'contact',
        targetId: docRef.id,
        targetLabel: dataToSave.name || '',
        targetUserId: userId,
        details: `איש הקשר "${dataToSave.name || ''}" נוסף למערכת`,
        metadata: {}
      });
    }
    return docRef.id;
  } catch (e) {
    console.error("Error adding contact to Cloud Firestore", e);
    throw e;
  }
};

export const updateContact = async (contactId, contactData, options = {}) => {
  if (!contactId) throw new Error("Contact ID is required to update contact");
  assertSystemManagerSession();
  try {
    const { userId, ...dataToUpdate } = contactData;
    delete dataToUpdate.id;
    const docRef = doc(db, 'contacts', contactId);
    const beforeSnap = await getDoc(docRef);
    const beforeData = beforeSnap.exists() ? beforeSnap.data() : {};
    await updateDoc(docRef, dataToUpdate);
    if (!options.skipActivityLog) {
      await recordActivity({
        action: 'contact.updated',
        actionLabel: 'עדכון איש קשר',
        targetType: 'contact',
        targetId: contactId,
        targetLabel: dataToUpdate.name || beforeData.name || '',
        targetUserId: beforeData.userId || userId || '',
        details: `כרטיס איש הקשר "${dataToUpdate.name || beforeData.name || ''}" עודכן`,
        metadata: {}
      });
    }
    return true;
  } catch (e) {
    console.error("Error updating contact in Cloud Firestore", e);
    throw e;
  }
};

export const deleteContact = async (contactId) => {
  if (!contactId) throw new Error("Contact ID is required to delete contact");
  assertSystemManagerSession();
  try {
    const docRef = doc(db, 'contacts', contactId);
    const beforeSnap = await getDoc(docRef);
    const beforeData = beforeSnap.exists() ? beforeSnap.data() : {};
    await deleteDoc(docRef);
    await recordActivity({
      action: 'contact.deleted',
      actionLabel: 'מחיקת איש קשר',
      targetType: 'contact',
      targetId: contactId,
      targetLabel: beforeData.name || '',
      targetUserId: beforeData.userId || '',
      details: `איש הקשר "${beforeData.name || ''}" נמחק`,
      metadata: {}
    });
    return true;
  } catch (e) {
    console.error("Error deleting contact from Cloud Firestore", e);
    throw e;
  }
};

/* Migration function for suppliers and contacts */
export const migrateSuppliersAndContacts = async (userId) => {
  if (!userId) return;
  try {
    const settingsRef = doc(db, 'settings', userId);
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) return;

    const settingsData = settingsSnap.data();
    const legacySuppliers = settingsData.suppliers;
    const legacyContacts = settingsData.contacts;

    let updated = false;

    // 1. Migrate suppliers
    if (legacySuppliers && Array.isArray(legacySuppliers)) {
      console.log(`Migrating ${legacySuppliers.length} legacy suppliers for user ${userId}...`);

      // Fetch current suppliers to prevent duplicates
      const suppliersSnapshot = await getDocs(query(collection(db, 'suppliers'), where('userId', '==', userId)));
      const existingNames = new Set(suppliersSnapshot.docs.map(doc => doc.data().name.trim().toLowerCase()));

      for (const sup of legacySuppliers) {
        const supObj = typeof sup === 'string' ? { name: sup } : sup;
        const nameTrimmed = (supObj.name || '').trim();
        if (nameTrimmed && !existingNames.has(nameTrimmed.toLowerCase())) {
          await addDoc(collection(db, 'suppliers'), {
            userId,
            organizationId: currentOrganizationId(),
            name: nameTrimmed,
            email: (supObj.email || '').trim(),
            phone: (supObj.phone || '').trim(),
            address: (supObj.address || '').trim(),
            wechat: (supObj.wechat || '').trim(),
            notes: (supObj.notes || '').trim(),
            contactPerson: (supObj.contactPerson || '').trim()
          });
        }
      }
      delete settingsData.suppliers;
      updated = true;
    }

    // 2. Migrate contacts
    if (legacyContacts && Array.isArray(legacyContacts)) {
      console.log(`Migrating ${legacyContacts.length} legacy contacts for user ${userId}...`);

      // Fetch current contacts to prevent duplicates
      const contactsSnapshot = await getDocs(query(collection(db, 'contacts'), where('userId', '==', userId)));
      const existingNames = new Set(contactsSnapshot.docs.map(doc => doc.data().name.trim().toLowerCase()));

      for (const cont of legacyContacts) {
        const contObj = typeof cont === 'string' ? { name: cont } : cont;
        const nameTrimmed = (contObj.name || '').trim();
        if (nameTrimmed && !existingNames.has(nameTrimmed.toLowerCase())) {
          await addDoc(collection(db, 'contacts'), {
            userId,
            organizationId: currentOrganizationId(),
            name: nameTrimmed,
            role: (contObj.role || '').trim(),
            phone: (contObj.phone || '').trim(),
            email: (contObj.email || '').trim(),
            address: (contObj.address || '').trim(),
            wechat: (contObj.wechat || '').trim(),
            notes: (contObj.notes || '').trim()
          });
        }
      }
      delete settingsData.contacts;
      updated = true;
    }

    if (updated) {
      await setDoc(settingsRef, settingsData);
      console.log(`Migration of suppliers and contacts complete for user ${userId}.`);
    }
  } catch (e) {
    console.error("Migration of suppliers and contacts failed", e);
  }
};

/**
 * Automatically checks the supplierName and contactPerson in task data.
 * If they are not present in settings, adds them automatically.
 */
export const autoAddSupplierAndContactFromTask = async (taskData) => {
  try {
    const userId = taskData.userId || auth.currentUser?.uid || '';
    const organizationId = taskData.organizationId || activeOrganizationId || '';
    if (!userId && !organizationId) return;

    const supplierName = taskData.supplierName ? taskData.supplierName.trim() : '';
    const contactPerson = taskData.contactPerson ? taskData.contactPerson.trim() : '';
    const supplierContactEmail = taskData.supplierContactEmail ? taskData.supplierContactEmail.trim() : '';

    if (!supplierName && !contactPerson) return;

    // Fetch current suppliers and contacts to check
    const suppliers = await getSuppliers(userId, organizationId);
    const contacts = await getContacts(userId, organizationId);

    // 1. Check Supplier
    if (supplierName) {
      const existingSup = suppliers.find(s => s.name.trim().toLowerCase() === supplierName.toLowerCase());

      if (!existingSup) {
        await addSupplier({
          name: supplierName,
          email: supplierContactEmail,
          phone: '',
          address: '',
          wechat: '',
          notes: '',
          contactPerson: contactPerson
        }, userId, { skipActivityLog: true });
      } else {
        let updated = false;
        const updatedFields = {};
        if (!existingSup.email && supplierContactEmail) {
          updatedFields.email = supplierContactEmail;
          updated = true;
        }
        if (!existingSup.contactPerson && contactPerson) {
          updatedFields.contactPerson = contactPerson;
          updated = true;
        }
        if (updated) {
          await updateSupplier(existingSup.id, { ...existingSup, ...updatedFields }, { skipActivityLog: true });
        }
      }
    }

    // 2. Check Contact Person
    if (contactPerson) {
      const existingContact = contacts.find(c => c.name.trim().toLowerCase() === contactPerson.toLowerCase());

      if (!existingContact) {
        await addContact({
          name: contactPerson,
          role: '',
          phone: '',
          email: supplierContactEmail,
          address: '',
          wechat: '',
          notes: ''
        }, userId, { skipActivityLog: true });
      } else {
        if (!existingContact.email && supplierContactEmail) {
          await updateContact(existingContact.id, { ...existingContact, email: supplierContactEmail }, { skipActivityLog: true });
        }
      }
    }
  } catch (e) {
    console.error("Error auto-adding supplier and contact from task data", e);
  }
};

export const migrateLegacyTasksToUser = async (userId, email) => {
  if (!userId || email !== 'studiokefy@gmail.com') return;

  try {
    // 1. Migrate global settings if they exist and user settings don't
    const globalSettingsRef = doc(db, 'settings', 'global');
    const globalSettingsSnap = await getDoc(globalSettingsRef);
    const userSettingsRef = doc(db, 'settings', userId);
    const userSettingsSnap = await getDoc(userSettingsRef);

    if (globalSettingsSnap.exists() && !userSettingsSnap.exists()) {
      console.log(`Migrating global settings to user settings for ${userId}...`);
      await setDoc(userSettingsRef, globalSettingsSnap.data());
    }

    // 2. Migrate legacy tasks
    const querySnapshot = await getDocs(collection(db, TASKS_COLLECTION));
    const tasksToMigrate = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.userId) {
        tasksToMigrate.push({ id: docSnap.id, ...data });
      }
    });

    if (tasksToMigrate.length > 0) {
      console.log(`Migrating ${tasksToMigrate.length} legacy tasks to user ${userId} (${email})...`);

      for (const task of tasksToMigrate) {
        // Update task
        await updateDoc(doc(db, TASKS_COLLECTION, task.id), { userId });

        // Update private notes
        const noteDocRef = doc(db, 'taskPrivateNotes', task.id);
        const noteDocSnap = await getDoc(noteDocRef);
        if (noteDocSnap.exists() && !noteDocSnap.data().userId) {
          await updateDoc(noteDocRef, { userId });
        }

        // Update comments
        const commentsQuery = query(collection(db, COMMENTS_COLLECTION), where("jobId", "==", task.id));
        const commentsSnap = await getDocs(commentsQuery);
        for (const commentDoc of commentsSnap.docs) {
          if (!commentDoc.data().userId) {
            await updateDoc(doc(db, COMMENTS_COLLECTION, commentDoc.id), { userId });
          }
        }
      }
      console.log("Migration completed successfully.");
    }
  } catch (e) {
    console.error("Failed to migrate legacy tasks:", e);
  }
};

export const registerUserLogin = async (user) => {
  if (!user || user.isAnonymous) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const existingUser = await getDoc(userRef);
    const existingData = existingUser.exists() ? existingUser.data() : null;
    const organizationId = existingData?.organizationId || '';

    // Determine creation time from auth metadata or existing data
    const authCreationTime = user.metadata?.creationTime
      ? new Date(user.metadata.creationTime).toISOString()
      : (user.metadata?.createdAt ? new Date(Number(user.metadata.createdAt)).toISOString() : null);

    // Prefer auth creation time if available, or existing createdAt, or current time
    const createdAt = existingData?.createdAt || authCreationTime || new Date().toISOString();

    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      lastLogin: new Date().toISOString(),
      displayName: user.displayName || '',
      organizationId,
      createdAt
    }, { merge: true });

    await recordActivity({
      action: 'user.login',
      actionLabel: 'כניסה למערכת',
      targetType: 'user',
      targetId: user.uid,
      targetLabel: user.email || '',
      targetUserId: user.uid,
      organizationId,
      details: 'המשתמש התחבר למערכת',
      metadata: {}
    });
    return { uid: user.uid, organizationId };
  } catch (e) {
    console.error("Error registering user login in Firestore:", e);
    return { uid: user.uid, organizationId: '' };
  }
};

export const getUserOrganization = async (userId) => {
  if (!userId) return null;
  const userSnap = await getDoc(doc(db, 'users', userId));
  if (!userSnap.exists()) return null;
  const profile = userSnap.data();
  const organizationId = profile.organizationId || '';
  if (!organizationId) return null;
  let organizationName = organizationId;
  let active = true;
  let suspendedContactMethod = null;
  try {
    const organizationSnap = await getDoc(doc(db, 'organizations', organizationId));
    if (organizationSnap.exists()) {
      const data = organizationSnap.data();
      organizationName = data.name || organizationName;
      if (data.active !== undefined) {
        active = data.active !== false;
      }
      if (data.suspendedContactMethod) {
        suspendedContactMethod = data.suspendedContactMethod;
      }
    }
  } catch {
    try {
      const registrySnap = await getDoc(doc(db, SETTINGS_COLLECTION, 'system-organizations'));
      const registryOrganization = registrySnap.data()?.organizations?.find(item => item.id === organizationId);
      if (registryOrganization?.name) organizationName = registryOrganization.name;
      if (registryOrganization && registryOrganization.active !== undefined) {
        active = registryOrganization.active !== false;
      }
      if (registryOrganization?.suspendedContactMethod) {
        suspendedContactMethod = registryOrganization.suspendedContactMethod;
      }
    } catch {
      // Keep a stable fallback name when organization metadata is not readable.
    }
  }
  return {
    id: organizationId,
    name: organizationName,
    active,
    suspendedContactMethod
  };
};

export const migrateUserDataToOrganization = async (userId, organizationId) => {
  if (!userId || !organizationId) return 0;
  assertSystemManagerSession();
  let migratedCount = 0;
  const collectionsToMigrate = [TASKS_COLLECTION, COMMENTS_COLLECTION, 'taskPrivateNotes', 'suppliers', 'contacts'];

  for (const collectionName of collectionsToMigrate) {
    try {
      const legacySnapshot = await getDocs(query(collection(db, collectionName), where('userId', '==', userId)));
      for (const legacyDoc of legacySnapshot.docs) {
        if (legacyDoc.data().organizationId === organizationId) continue;
        try {
          await updateDoc(doc(db, collectionName, legacyDoc.id), { organizationId });
          migratedCount += 1;
        } catch (docErr) {
          console.warn(`Failed to migrate ${collectionName} doc ${legacyDoc.id}:`, docErr);
        }
      }
    } catch (colErr) {
      console.warn(`Failed to query collection ${collectionName} for user ${userId}:`, colErr);
    }
  }

  try {
    const legacyActivitySnapshot = await getDocs(query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      where('actorUid', '==', userId)
    ));
    for (const activityDoc of legacyActivitySnapshot.docs) {
      if (activityDoc.data().organizationId === organizationId) continue;
      try {
        await updateDoc(doc(db, ACTIVITY_LOGS_COLLECTION, activityDoc.id), { organizationId });
        migratedCount += 1;
      } catch (actErr) {
        console.warn(`Failed to migrate activity log ${activityDoc.id}:`, actErr);
      }
    }
  } catch (actQueryErr) {
    console.warn(`Failed to query activity logs for user ${userId}:`, actQueryErr);
  }

  try {
    const legacySettingsRef = doc(db, SETTINGS_COLLECTION, userId);
    const legacySettingsSnap = await getDoc(legacySettingsRef);
    const organizationSettingsRef = doc(db, SETTINGS_COLLECTION, organizationId);
    const organizationSettingsSnap = await getDoc(organizationSettingsRef);
    if (!organizationSettingsSnap.exists() && legacySettingsSnap.exists() && getCurrentActor()?.isSystemAdmin) {
      await setDoc(organizationSettingsRef, {
        ...legacySettingsSnap.data(),
        organizationId
      });
      migratedCount += 1;
    }
    if (legacySettingsSnap.exists() && !legacySettingsSnap.data().organizationId) {
      await setDoc(legacySettingsRef, { organizationId }, { merge: true });
      migratedCount += 1;
    }
  } catch (settingsErr) {
    console.warn('Failed to migrate user settings:', settingsErr);
  }

  return migratedCount;
};

export const assignExistingUsersToDefaultOrganization = async () => {
  // Obsolete: No longer assigning users to a default organization
  return 0;
};

const ORGANIZATIONS_REGISTRY_REF = () => doc(db, SETTINGS_COLLECTION, 'system-organizations');

const readOrganizationRegistry = async () => {
  try {
    const registrySnap = await getDoc(ORGANIZATIONS_REGISTRY_REF());
    return registrySnap.exists() && Array.isArray(registrySnap.data().organizations)
      ? registrySnap.data().organizations
      : [];
  } catch {
    return [];
  }
};

const saveOrganizationRegistry = async (organizations) => {
  await setDoc(ORGANIZATIONS_REGISTRY_REF(), {
    organizations,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

export const getOrganizations = async () => {
  assertSystemManagerSession();
  let collectionOrganizations = [];
  try {
    const snapshot = await getDocs(collection(db, 'organizations'));
    collectionOrganizations = snapshot.docs
      .filter(item => item.id !== 'system_config')
      .map(item => ({ id: item.id, ...item.data() }));
  } catch (error) {
    console.warn('Organizations collection is not available yet; using the compatibility registry', error);
  }

  const registryOrganizations = (await readOrganizationRegistry())
    .filter(org => org && org.id !== 'system_config');
  const organizationsById = new Map();
  registryOrganizations.forEach(organization => {
    organizationsById.set(organization.id, {
      appVersion: DEFAULT_APP_VERSION,
      suspendedContactMethod: 'default',
      ...organization
    });
  });
  collectionOrganizations.forEach(organization => {
    organizationsById.set(organization.id, {
      appVersion: DEFAULT_APP_VERSION,
      suspendedContactMethod: 'default',
      ...organization
    });
  });

  const organizations = [...organizationsById.values()];
  for (const organization of organizations) {
    if (collectionOrganizations.some(item => item.id === organization.id)) continue;
    try {
      await setDoc(doc(db, 'organizations', organization.id), organization, { merge: true });
    } catch {
      // The compatibility registry remains authoritative until the new rules are deployed.
    }
  }

  return organizations.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
};

export const createOrganization = async (name, options = {}) => {
  assertSystemManagerSession();
  const normalizedName = String(name || '').trim();
  if (!normalizedName) throw new Error('יש להזין שם ארגון');
  const organizationRef = doc(collection(db, 'organizations'));
  const organization = {
    id: organizationRef.id,
    name: normalizedName,
    active: true,
    appVersion: options.appVersion || DEFAULT_APP_VERSION,
    suspendedContactMethod: options.suspendedContactMethod || 'default',
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(organizationRef, organization);
    await setDoc(doc(db, 'settings', organization.id), {
      appVersion: organization.appVersion,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.warn('Saving organization in compatibility registry', error);
    const organizations = await getOrganizations();
    await saveOrganizationRegistry([...organizations, organization]);
  }
  return organization;
};

export const updateOrganization = async (organizationId, updates = {}) => {
  assertSystemManagerSession();
  if (!organizationId) throw new Error('חסר מזהה ארגון');
  const allowedUpdates = {};
  if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
    const normalizedName = String(updates.name || '').trim();
    if (!normalizedName) throw new Error('יש להזין שם ארגון');
    allowedUpdates.name = normalizedName;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'active')) {
    allowedUpdates.active = Boolean(updates.active);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'appVersion')) {
    const validVersions = Object.values(APP_VERSIONS);
    if (validVersions.includes(updates.appVersion)) {
      allowedUpdates.appVersion = updates.appVersion;
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'suspendedContactMethod')) {
    const validMethods = [...Object.values(SUSPENDED_CONTACT_METHODS), 'default'];
    if (validMethods.includes(updates.suspendedContactMethod)) {
      allowedUpdates.suspendedContactMethod = updates.suspendedContactMethod;
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'reopenPrice')) {
    allowedUpdates.reopenPrice = (updates.reopenPrice === null || updates.reopenPrice === '' || updates.reopenPrice === undefined)
      ? null
      : (Number(updates.reopenPrice) > 0 ? Number(updates.reopenPrice) : null);
  }
  if (Object.keys(allowedUpdates).length === 0) return true;
  try {
    await updateDoc(doc(db, 'organizations', organizationId), {
      ...allowedUpdates,
      updatedAt: new Date().toISOString()
    });
    if (allowedUpdates.appVersion) {
      await setDoc(doc(db, 'settings', organizationId), {
        appVersion: allowedUpdates.appVersion,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (error) {
    console.warn('Updating organization in compatibility registry', error);
    const organizations = await getOrganizations();
    await saveOrganizationRegistry(organizations.map(organization => (
      organization.id === organizationId
        ? { ...organization, ...allowedUpdates, updatedAt: new Date().toISOString() }
        : organization
    )));
  }
  return true;
};

export const getSystemSuspendedContactMethod = async () => {
  try {
    const configSnap = await getDoc(doc(db, 'organizations', 'system_config'));
    if (configSnap.exists()) {
      const data = configSnap.data();
      if (data.suspendedContactMethod && Object.values(SUSPENDED_CONTACT_METHODS).includes(data.suspendedContactMethod)) {
        return data.suspendedContactMethod;
      }
    }
  } catch (err) {
    console.warn('Could not read system_config from organizations collection', err);
  }
  return DEFAULT_SUSPENDED_CONTACT_METHOD;
};

export const setSystemSuspendedContactMethod = async (method) => {
  assertSystemManagerSession();
  const validMethods = Object.values(SUSPENDED_CONTACT_METHODS);
  if (!validMethods.includes(method)) {
    throw new Error('ערוץ פנייה לא תקין');
  }
  try {
    await setDoc(doc(db, 'organizations', 'system_config'), {
      suspendedContactMethod: method,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Could not write system_config to organizations collection', err);
  }
  return method;
};

export const assignUserToOrganization = async (userId, organizationId) => {
  assertSystemManagerSession();
  if (!userId) throw new Error('חסר מזהה משתמש');
  await updateDoc(doc(db, 'users', userId), { organizationId: organizationId || '' });
  return true;
};

export const deleteOrganization = async (organizationId) => {
  assertSystemManagerSession();
  const actor = getCurrentActor();
  if (!actor?.isSystemAdmin) {
    throw new Error('רק מנהל המערכת מורשה למחוק ארגונים');
  }
  if (!organizationId) {
    throw new Error('חסר מזהה ארגון');
  }

  let orgName = organizationId;
  try {
    const orgSnap = await getDoc(doc(db, 'organizations', organizationId));
    if (orgSnap.exists()) {
      orgName = orgSnap.data().name || organizationId;
    }
  } catch {
    // Non-critical
  }

  // 1. Delete organization doc from Firestore
  try {
    await deleteDoc(doc(db, 'organizations', organizationId));
  } catch (err) {
    console.warn(`Failed to delete organization ${organizationId} from Firestore:`, err);
  }

  // 2. Remove from compatibility registry if present
  try {
    const registryOrganizations = await readOrganizationRegistry();
    const updated = registryOrganizations.filter(item => item && item.id !== organizationId);
    if (updated.length !== registryOrganizations.length) {
      await saveOrganizationRegistry(updated);
    }
  } catch (err) {
    console.warn('Failed to remove organization from registry:', err);
  }

  // 3. Delete organization settings doc if exists
  try {
    await deleteDoc(doc(db, SETTINGS_COLLECTION, organizationId));
  } catch (err) {
    console.warn(`Failed to delete settings for organization ${organizationId}:`, err);
  }

  // 4. Unassign users that were in this organization
  try {
    const usersSnap = await getDocs(query(collection(db, 'users'), where('organizationId', '==', organizationId)));
    for (const userDoc of usersSnap.docs) {
      await updateDoc(doc(db, 'users', userDoc.id), { organizationId: '' });
    }
  } catch (err) {
    console.warn('Failed to unassign users of deleted organization:', err);
  }

  // 5. Record activity
  await recordActivity({
    action: 'organization.deleted',
    actionLabel: 'מחיקת ארגון',
    targetType: 'organization',
    targetId: organizationId,
    targetLabel: orgName,
    organizationId: '',
    details: `ארגון "${orgName}" נמחק מהמערכת`,
    metadata: { organizationId, orgName }
  });

  return true;
};

export const deleteUser = async (userId) => {
  assertSystemManagerSession();
  const actor = getCurrentActor();
  if (!actor?.isSystemAdmin) {
    throw new Error('רק מנהל המערכת מורשה למחוק משתמשים');
  }
  if (!userId) {
    throw new Error('חסר מזהה משתמש');
  }

  // Safety check: Never delete the main system administrator
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const userEmail = userData.email || '';

  if (isSystemAdminEmail(userEmail) || userId === auth.currentUser?.uid) {
    throw new Error('לא ניתן למחוק את חשבון מנהל המערכת הראשי');
  }

  // 1. Delete all tasks owned by the user, their comments, and private notes
  const tasksQuery = query(collection(db, TASKS_COLLECTION), where('userId', '==', userId));
  const tasksSnap = await getDocs(tasksQuery);
  for (const taskDoc of tasksSnap.docs) {
    const taskId = taskDoc.id;
    await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
    try {
      await deleteDoc(doc(db, 'taskPrivateNotes', taskId));
    } catch (e) {
      console.warn(`Failed to delete private notes for task ${taskId}:`, e);
    }
    const commentsQuery = query(collection(db, COMMENTS_COLLECTION), where('jobId', '==', taskId));
    const commentsSnap = await getDocs(commentsQuery);
    for (const commentDoc of commentsSnap.docs) {
      await deleteDoc(doc(db, COMMENTS_COLLECTION, commentDoc.id));
    }
  }

  // 2. Delete any comments created by this user on other tasks
  const userCommentsQuery = query(collection(db, COMMENTS_COLLECTION), where('userId', '==', userId));
  const userCommentsSnap = await getDocs(userCommentsQuery);
  for (const commentDoc of userCommentsSnap.docs) {
    await deleteDoc(doc(db, COMMENTS_COLLECTION, commentDoc.id));
  }

  // 3. Delete suppliers and contacts created by this user
  const suppliersQuery = query(collection(db, 'suppliers'), where('userId', '==', userId));
  const suppliersSnap = await getDocs(suppliersQuery);
  for (const supplierDoc of suppliersSnap.docs) {
    await deleteDoc(doc(db, 'suppliers', supplierDoc.id));
  }

  const contactsQuery = query(collection(db, 'contacts'), where('userId', '==', userId));
  const contactsSnap = await getDocs(contactsQuery);
  for (const contactDoc of contactsSnap.docs) {
    await deleteDoc(doc(db, 'contacts', contactDoc.id));
  }

  // 4. Delete user-specific settings and viewerSessions if any
  try {
    await deleteDoc(doc(db, SETTINGS_COLLECTION, userId));
  } catch (e) {
    console.warn(`Failed to delete settings for user ${userId}:`, e);
  }

  try {
    await deleteDoc(doc(db, 'viewerSessions', userId));
  } catch (e) {
    console.warn(`Failed to delete viewer session for user ${userId}:`, e);
  }

  // 5. Delete the user record from 'users'
  await deleteDoc(userRef);

  // 6. Record in activity log
  await recordActivity({
    action: 'user.deleted',
    actionLabel: 'מחיקת משתמש',
    targetType: 'user',
    targetId: userId,
    targetLabel: userEmail || userId,
    targetUserId: userId,
    organizationId: userData.organizationId || '',
    details: `משתמש "${userEmail || userId}" וכל הנתונים המשויכים נמחקו לצמיתות מהמערכת`,
    metadata: { userEmail }
  });

  return true;
};

export const getAllUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const users = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      users.push({
        id: docSnap.id,
        uid: docSnap.id,
        ...data
      });
    });
    return users;
  } catch (e) {
    console.error("Error fetching all users:", e);
    throw e;
  }
};

const readCollectionWithServerFallback = async (collectionName) => {
  const ref = collection(db, collectionName);
  try {
    return await getDocsFromServer(ref);
  } catch (serverError) {
    console.warn(`Server ${collectionName} read failed, falling back to Firestore cache`, serverError);
    return getDocs(ref);
  }
};

const parseDateValue = (value) => {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getUserManagementStats = async () => {
  try {
    const [tasksSnapshot, activitySnapshot] = await Promise.all([
      readCollectionWithServerFallback(TASKS_COLLECTION),
      readCollectionWithServerFallback(ACTIVITY_LOGS_COLLECTION)
    ]);

    const statsByUser = {};
    const ensureStats = (userId) => {
      if (!userId) return null;
      if (!statsByUser[userId]) {
        statsByUser[userId] = {
          projectCount: 0,
          activeProjectCount: 0,
          archivedProjectCount: 0,
          weeklyHoursTotal: 0,
          lastProjectUpdatedAt: '',
          activityCount: 0,
          lastActivityAt: '',
          earliestTaskAt: '',
          firstActivityAt: ''
        };
      }
      return statsByUser[userId];
    };

    tasksSnapshot.forEach((docSnap) => {
      const task = docSnap.data();
      if (task.deletedAt) return;
      const stats = ensureStats(task.userId);
      if (!stats) return;

      const normalizedStatus = normalizeTaskStatus(task.status);
      const updatedAt = task.updatedAt || task.createdAt || '';
      const createdAt = task.createdAt || task.updatedAt || '';

      stats.projectCount += 1;
      if (normalizedStatus === ARCHIVE_STATUS) {
        stats.archivedProjectCount += 1;
      } else {
        stats.activeProjectCount += 1;
      }
      stats.weeklyHoursTotal += Number(task.weeklyHours) || 0;
      if (parseDateValue(updatedAt) > parseDateValue(stats.lastProjectUpdatedAt)) {
        stats.lastProjectUpdatedAt = updatedAt;
      }
      if (parseDateValue(updatedAt) > parseDateValue(stats.lastActivityAt)) {
        stats.lastActivityAt = updatedAt;
      }
      if (createdAt) {
        const createdTs = parseDateValue(createdAt);
        const earliestTs = parseDateValue(stats.earliestTaskAt);
        if (createdTs > 0 && (!earliestTs || createdTs < earliestTs)) {
          stats.earliestTaskAt = createdAt;
        }
      }
    });

    activitySnapshot.forEach((docSnap) => {
      const activity = docSnap.data();
      const stats = ensureStats(activity.actorUid);
      if (stats) {
        stats.activityCount += 1;
        if (parseDateValue(activity.createdAt) > parseDateValue(stats.lastActivityAt)) {
          stats.lastActivityAt = activity.createdAt;
        }
        if (activity.createdAt) {
          const actTs = parseDateValue(activity.createdAt);
          const earliestActTs = parseDateValue(stats.firstActivityAt);
          if (actTs > 0 && (!earliestActTs || actTs < earliestActTs)) {
            stats.firstActivityAt = activity.createdAt;
          }
        }
      }

      if (activity.targetUserId && activity.targetUserId !== activity.actorUid) {
        const targetStats = ensureStats(activity.targetUserId);
        if (targetStats) {
          if (parseDateValue(activity.createdAt) > parseDateValue(targetStats.lastActivityAt)) {
            targetStats.lastActivityAt = activity.createdAt;
          }
          if (activity.createdAt) {
            const actTs = parseDateValue(activity.createdAt);
            const earliestActTs = parseDateValue(targetStats.firstActivityAt);
            if (actTs > 0 && (!earliestActTs || actTs < earliestActTs)) {
              targetStats.firstActivityAt = activity.createdAt;
            }
          }
        }
      }
    });

    return statsByUser;
  } catch (e) {
    console.error("Error fetching user management stats:", e);
    throw e;
  }
};

export const getUserJoinDateIso = (user, stats = {}) => {
  // 1. Explicit user document fields
  const userDirectDates = [
    user?.createdAt,
    user?.creationTime,
    user?.registeredAt,
    user?.joinedAt
  ].map(dateStr => {
    const ts = parseDateValue(dateStr);
    return { ts, dateStr };
  }).filter(item => item.ts > 0);

  if (userDirectDates.length > 0) {
    userDirectDates.sort((a, b) => a.ts - b.ts);
    return userDirectDates[0].dateStr;
  }

  // 2. Earliest timestamp from system activity / tasks / logins
  const fallbackDates = [
    stats?.earliestTaskAt,
    stats?.firstActivityAt,
    user?.firstLogin,
    user?.lastLogin,
    user?.lastActiveAt,
    stats?.lastProjectUpdatedAt,
    stats?.lastActivityAt
  ].map(dateStr => {
    const ts = parseDateValue(dateStr);
    return { ts, dateStr };
  }).filter(item => item.ts > 0);

  if (fallbackDates.length > 0) {
    fallbackDates.sort((a, b) => a.ts - b.ts);
    return fallbackDates[0].dateStr;
  }

  return '';
};

export const backfillUserCreatedAtIfMissing = async (userId, createdAtIso) => {
  if (!userId || !createdAtIso) return;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { createdAt: createdAtIso }, { merge: true });
  } catch (err) {
    // Non-critical background update
  }
};

export const getActivityLogs = async ({ isSystemAdmin = false, actorUid = '', limitCount = 500 } = {}) => {
  try {
    const constraints = [];
    if (!isSystemAdmin) {
      if (!actorUid) return [];
      constraints.push(where('actorUid', '==', actorUid));
    }

    const activityQuery = constraints.length
      ? query(collection(db, ACTIVITY_LOGS_COLLECTION), ...constraints)
      : query(collection(db, ACTIVITY_LOGS_COLLECTION));

    const snapshot = await getDocs(activityQuery);
    const logs = [];
    snapshot.forEach(docSnap => {
      logs.push({ id: docSnap.id, ...docSnap.data() });
    });

    return logs
      .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
      .slice(0, limitCount);
  } catch (e) {
    console.error('Error fetching activity logs from Cloud Firestore', e);
    throw e;
  }
};

const DEFAULT_SUPPLIERS = [
  { name: 'shenzhen printing ltd', email: 'li@shenzhenprint.com', phone: '+86 138 0000 0000', contactPerson: 'mr. li' },
  { name: 'אריזות ישראל', email: 'sales@israelpack.co.il', phone: '03-5551234', contactPerson: 'משה כהן' },
  { name: 'מפעלי קרטון בע"מ', email: 'info@cartonfact.co.il', phone: '04-8884321', contactPerson: '' }
];

const DEFAULT_CONTACTS = [
  { name: 'mr. li', role: 'איש קשר מכירות סין', phone: '+86 138 0000 0000', email: 'li@shenzhenprint.com' },
  { name: 'משה כהן', role: 'מנהל ייצור ישראל', phone: '052-1234567', email: 'moshe@israelpack.co.il' }
];

const seededTaskSuppliers = INITIAL_TASKS
  .map(task => task.supplierName)
  .filter(Boolean);

const seededTaskContacts = INITIAL_TASKS
  .map(task => task.contactPerson)
  .filter(Boolean);

const normalizeDirectoryValue = (value = '') => String(value ?? '').trim().toLowerCase();

const DEFAULT_SUPPLIER_NAMES = new Set([
  ...DEFAULT_SUPPLIERS.map(item => item.name),
  ...seededTaskSuppliers
].map(normalizeDirectoryValue));

const DEFAULT_CONTACT_NAMES = new Set([
  ...DEFAULT_CONTACTS.map(item => item.name),
  ...seededTaskContacts
].map(normalizeDirectoryValue));

const matchesDefaultDirectoryItem = (item, defaults) => {
  return defaults.some((defaultItem) => {
    return Object.entries(defaultItem).every(([key, value]) => {
      return normalizeDirectoryValue(item[key] || '') === normalizeDirectoryValue(value || '');
    });
  });
};

const matchesDefaultSupplier = (item) => {
  const name = normalizeDirectoryValue(item.name);
  return DEFAULT_SUPPLIER_NAMES.has(name) || matchesDefaultDirectoryItem(item, DEFAULT_SUPPLIERS);
};

const matchesDefaultContact = (item) => {
  const name = normalizeDirectoryValue(item.name);
  return DEFAULT_CONTACT_NAMES.has(name) || matchesDefaultDirectoryItem(item, DEFAULT_CONTACTS);
};

export const removeDefaultSuppliersAndContacts = async (userId) => {
  if (!userId) return;
  try {
    const suppliersSnapshot = await getDocs(query(collection(db, 'suppliers'), where('userId', '==', userId)));
    for (const supplierDoc of suppliersSnapshot.docs) {
      if (matchesDefaultSupplier(supplierDoc.data())) {
        await deleteDoc(doc(db, 'suppliers', supplierDoc.id));
      }
    }

    const contactsSnapshot = await getDocs(query(collection(db, 'contacts'), where('userId', '==', userId)));
    for (const contactDoc of contactsSnapshot.docs) {
      if (matchesDefaultContact(contactDoc.data())) {
        await deleteDoc(doc(db, 'contacts', contactDoc.id));
      }
    }
  } catch (e) {
    console.error("Error removing default suppliers and contacts:", e);
  }
};

export const getNameMap = async (userId, isSystemAdmin = false, organizationId = null) => {
  const map = {};
  const targetOrgId = organizationId || activeOrganizationId || '';
  if (!userId && !targetOrgId) return map;
  try {
    // 1. Fetch tasks
    let tasksQuery;
    if (isSystemAdmin) {
      tasksQuery = collection(db, TASKS_COLLECTION);
    } else if (targetOrgId) {
      tasksQuery = query(collection(db, TASKS_COLLECTION), where('organizationId', '==', targetOrgId));
    } else {
      tasksQuery = query(collection(db, TASKS_COLLECTION), where('userId', '==', userId));
    }
    const tasksSnap = await getDocs(tasksQuery);
    tasksSnap.forEach(docSnap => {
      const data = docSnap.data();
      map[docSnap.id] = data.title || data.jobNumber || docSnap.id;
    });

    // 2. Fetch suppliers
    let suppliersQuery;
    if (isSystemAdmin) {
      suppliersQuery = collection(db, 'suppliers');
    } else if (targetOrgId) {
      suppliersQuery = query(collection(db, 'suppliers'), where('organizationId', '==', targetOrgId));
    } else {
      suppliersQuery = query(collection(db, 'suppliers'), where('userId', '==', userId));
    }
    const suppliersSnap = await getDocs(suppliersQuery);
    suppliersSnap.forEach(docSnap => {
      const data = docSnap.data();
      map[docSnap.id] = data.name || docSnap.id;
    });

    // 3. Fetch contacts
    let contactsQuery;
    if (isSystemAdmin) {
      contactsQuery = collection(db, 'contacts');
    } else if (targetOrgId) {
      contactsQuery = query(collection(db, 'contacts'), where('organizationId', '==', targetOrgId));
    } else {
      contactsQuery = query(collection(db, 'contacts'), where('userId', '==', userId));
    }
    const contactsSnap = await getDocs(contactsQuery);
    contactsSnap.forEach(docSnap => {
      const data = docSnap.data();
      map[docSnap.id] = data.name || docSnap.id;
    });

    // 4. Fetch users safely according to rules
    if (isSystemAdmin) {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(docSnap => {
        const data = docSnap.data();
        map[docSnap.id] = data.displayName || data.email || docSnap.id;
      });
    } else {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists()) {
        const data = userSnap.data();
        map[userSnap.id] = data.displayName || data.email || userSnap.id;
      }
    }

    return map;
  } catch (e) {
    console.error("Error building name map:", e);
    return map;
  }
};

export const getContacts = async (userId, organizationId = null) => {
  const targetOrgId = organizationId || activeOrganizationId || '';
  if (!userId && !targetOrgId) return [];
  try {
    const contactsMap = new Map();
    if (targetOrgId) {
      try {
        const orgQuery = query(collection(db, 'contacts'), where('organizationId', '==', targetOrgId));
        const orgSnapshot = await getDocs(orgQuery);
        orgSnapshot.forEach(docSnap => {
          contactsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
      } catch (err) {
        console.warn('Failed to query contacts by organizationId', err);
      }
    }
    if (userId) {
      try {
        const userQuery = query(collection(db, 'contacts'), where('userId', '==', userId));
        const userSnapshot = await getDocs(userQuery);
        userSnapshot.forEach(docSnap => {
          if (!contactsMap.has(docSnap.id)) {
            contactsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
          }
        });
      } catch (err) {
        console.warn('Failed to query contacts by userId', err);
      }
    }
    const conts = [];
    contactsMap.forEach((data) => {
      conts.push(data);
    });
    conts.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
    return conts;
  } catch (e) {
    console.error("Error fetching contacts from Cloud Firestore:", e);
    return [];
  }
};

export const getSuppliers = async (userId, organizationId = null) => {
  const targetOrgId = organizationId || activeOrganizationId || '';
  if (!userId && !targetOrgId) return [];
  try {
    const suppliersMap = new Map();
    if (targetOrgId) {
      try {
        const orgQuery = query(collection(db, 'suppliers'), where('organizationId', '==', targetOrgId));
        const orgSnapshot = await getDocs(orgQuery);
        orgSnapshot.forEach(docSnap => {
          suppliersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
      } catch (err) {
        console.warn('Failed to query suppliers by organizationId', err);
      }
    }
    if (userId) {
      try {
        const userQuery = query(collection(db, 'suppliers'), where('userId', '==', userId));
        const userSnapshot = await getDocs(userQuery);
        userSnapshot.forEach(docSnap => {
          if (!suppliersMap.has(docSnap.id)) {
            suppliersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
          }
        });
      } catch (err) {
        console.warn('Failed to query suppliers by userId', err);
      }
    }
    const sups = [];
    suppliersMap.forEach((data) => {
      sups.push(data);
    });
    sups.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
    return sups;
  } catch (e) {
    console.error("Error fetching suppliers from Cloud Firestore:", e);
    return [];
  }
};
