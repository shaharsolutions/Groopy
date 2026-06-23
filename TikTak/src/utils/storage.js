/**
 * Groopy Work Manager - Cloud Firestore Utility
 *
 * This module connects directly to the Cloud Firestore database.
 * Tasks, comments, private notes and settings are scoped to the authenticated user ID.
 */

import { db, storage, auth } from '../firebase';
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
import { INITIAL_TASKS, INITIAL_COMMENTS } from '../data/mockData';

const assertSystemManagerSession = () => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error('פעולה זו זמינה למנהלת המערכת בלבד');
  }
};

// Helper to upload files directly to Firebase Storage
export const uploadFileToStorage = (file, folderPath = 'uploads', onProgress = null) => {
  assertSystemManagerSession();
  return new Promise((resolve, reject) => {
    // Generate a unique file name to avoid collisions
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${fileExtension}`;
    const storageRef = ref(storage, `${folderPath}/${uniqueFileName}`);

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
const SYSTEM_ADMIN_EMAIL = 'shaharsolutions@gmail.com';

const getCurrentActor = () => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return null;
  return {
    actorUid: user.uid,
    actorEmail: user.email || '',
    actorName: user.displayName || user.email || 'משתמש מערכת',
    isSystemAdmin: user.email === SYSTEM_ADMIN_EMAIL
  };
};

const recordActivity = async ({
  action,
  actionLabel,
  targetType,
  targetId = '',
  targetLabel = '',
  targetUserId = '',
  details = '',
  metadata = {}
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
      details,
      metadata,
      createdAt: now
    });
  } catch (e) {
    console.warn('Activity log write failed', e);
  }
};

const getChangedFieldLabels = (before = {}, afterPatch = {}) => {
  const fieldLabels = {
    title: 'שם עבודה',
    description: 'תיאור',
    workType: 'סוג עבודה',
    storeName: 'חנות',
    supplierName: 'ספק',
    contactPerson: 'איש קשר',
    importManager: 'מנהל יבוא',
    status: 'סטטוס',
    priority: 'עדיפות',
    deadline: 'דדליין',
    driveLink: 'קישור דרייב',
    supplierContactEmail: 'אימייל ספק',
    diecutsStatus: 'סטטוס שטנצים',
    imagesStatus: 'סטטוס תמונות',
    standardsInstituteRequired: 'מכון תקנים',
    planogramFile: 'פלנוגרמה',
    workOrderFiles: 'קבצים',
    subtasks: 'תתי משימות',
    attachments: 'קבצים מצורפים',
    internalNotes: 'הערות פנימיות'
  };

  return Object.keys(afterPatch)
    .filter(key => key !== 'updatedAt')
    .filter(key => JSON.stringify(before[key] ?? null) !== JSON.stringify(afterPatch[key] ?? null))
    .map(key => fieldLabels[key] || key);
};

const formatChangedFields = (fieldNames) => {
  if (!fieldNames.length) return 'עודכן זמן הפעילות';
  if (fieldNames.length <= 4) return `עודכנו השדות: ${fieldNames.join(', ')}`;
  return `עודכנו ${fieldNames.length} שדות: ${fieldNames.slice(0, 4).join(', ')} ועוד`;
};

// Seed the database for a specific user if their tasks are empty
export const seedUserDatabaseIfEmpty = async (userId) => {
  if (!userId) return false;

  try {
    const q = query(collection(db, TASKS_COLLECTION), where("userId", "==", userId));
    const taskQuerySnapshot = await getDocs(q);

    if (taskQuerySnapshot.empty) {
      console.log(`User ${userId} database is empty. Seeding initial tasks...`);

      // Seed tasks with custom IDs but mapped to this user
      for (const task of INITIAL_TASKS) {
        const { id, internalNotes, ...taskWithoutPrivate } = task;
        const newTaskId = `${userId}-${id}`;
        const newTaskData = {
          ...taskWithoutPrivate,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, TASKS_COLLECTION, newTaskId), newTaskData);
        if (internalNotes) {
          await setDoc(doc(db, 'taskPrivateNotes', newTaskId), { notes: internalNotes, userId });
        }
      }

      console.log(`Seeding initial comments for user ${userId}...`);
      // Seed comments associated with the new tasks
      for (const comment of INITIAL_COMMENTS) {
        const { id, jobId, ...commentWithoutId } = comment;
        const newTaskId = `${userId}-${jobId}`;
        const newCommentId = `${userId}-${id}`;
        await setDoc(doc(db, COMMENTS_COLLECTION, newCommentId), {
          ...commentWithoutId,
          jobId: newTaskId,
          userId,
          createdAt: new Date().toISOString()
        });
      }

      console.log(`User ${userId} seeding completed successfully.`);
      return true;
    }
    return false;
  } catch (e) {
    console.error(`Error seeding database for user ${userId}:`, e);
    return false;
  }
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
  const mapping = {
    'חדש': 'חדש',
    'בטיפול': 'בטיפול',
    'נשלח לספק': 'נשלח לספק',
    'אושר לספק': 'אושר לספק',
    'ארכיון': 'ארכיון',
    'ממתין למידע': 'בטיפול',
    'ממתין לספק בסין': 'נשלח לספק',
    'ממתין לאישור': 'בטיפול',
    'נדרש תיקון': 'בטיפול',
    'מאושר': 'אושר לספק',
    'נשלח לייצור': 'אושר לספק',
    'הושלם': 'אושר לספק',
    'מוקפא': 'חדש'
  };
  return mapping[status] || 'חדש';
};

export const getTasks = async (userId) => {
  if (!userId) return [];
  try {
    let querySnapshot;
    const q = query(collection(db, TASKS_COLLECTION), where("userId", "==", userId));
    try {
      // A page refresh must reflect the persisted server value, not a stale cache.
      querySnapshot = await getDocsFromServer(q);
    } catch (serverError) {
      console.warn('Server task read failed, falling back to Firestore cache', serverError);
      querySnapshot = await getDocs(q);
    }
    const tasks = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.deletedAt) return;
      tasks.push({
        id: doc.id,
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

export const getTrashedTasks = async (userId) => {
  if (!userId) return [];
  try {
    let querySnapshot;
    const q = query(collection(db, TASKS_COLLECTION), where("userId", "==", userId));
    try {
      querySnapshot = await getDocsFromServer(q);
    } catch (serverError) {
      console.warn('Server trash read failed, falling back to Firestore cache', serverError);
      querySnapshot = await getDocs(q);
    }

    const tasks = [];
    querySnapshot.forEach((taskDoc) => {
      const data = taskDoc.data();
      if (!data.deletedAt) return;
      tasks.push({ id: taskDoc.id, ...data, status: normalizeTaskStatus(data.status) });
    });
    return tasks.sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt));
  } catch (e) {
    console.error('Error fetching trashed tasks from Cloud Firestore', e);
    return [];
  }
};

export const getCommentsForTask = async (taskId, userId) => {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where("jobId", "==", taskId),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const comments = [];
    querySnapshot.forEach((doc) => {
      comments.push({ id: doc.id, ...doc.data() });
    });
    // Sort comments chronologically by creation time
    return comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } catch (e) {
    console.error(`Error fetching comments for task ${taskId}`, e);
    return [];
  }
};

export const addComment = async (jobId, authorName, text, attachmentUrl = null, attachmentName = null, userId) => {
  if (!userId) throw new Error("User ID is required to add a comment");
  try {
    const now = new Date().toISOString();
    const commentData = {
      jobId,
      userId,
      authorName: authorName.trim(),
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
    await recordActivity({
      action: 'comment.created',
      actionLabel: 'הוספת תגובה',
      targetType: 'comment',
      targetId: docRef.id,
      targetLabel: authorName.trim(),
      targetUserId: userId,
      details: `תגובה נוספה לעבודה ${jobId}`,
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
    await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
    await recordActivity({
      action: 'comment.deleted',
      actionLabel: 'מחיקת תגובה',
      targetType: 'comment',
      targetId: commentId,
      targetLabel: commentData.authorName || '',
      targetUserId: commentData.userId || '',
      details: jobId ? `תגובה נמחקה מהעבודה ${jobId}` : 'תגובה נמחקה',
      metadata: { jobId: jobId || commentData.jobId || '' }
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
    if (docSnap.exists() && docSnap.data().userId === userId) {
      return docSnap.data().notes || '';
    }
    return '';
  } catch (e) {
    console.error(`Error fetching private notes for task ${taskId}`, e);
    return '';
  }
};

export const createTask = async (taskData, userId, options = {}) => {
  if (!userId) throw new Error("User ID is required to create a task");
  assertSystemManagerSession();
  try {
    const tasks = await getTasks(userId);
    const jobNumber = generateNextJobNumber(tasks);
    const now = new Date().toISOString();

    const { internalNotes, ...taskWithoutPrivate } = taskData;

    const newTask = {
      ...taskWithoutPrivate,
      userId,
      jobNumber,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTask);

    if (internalNotes) {
      await setDoc(doc(db, 'taskPrivateNotes', docRef.id), { notes: internalNotes, userId });
    }

    // Auto-add supplier & contact to settings if new
    await autoAddSupplierAndContactFromTask({ ...newTask, internalNotes });
    if (!options.skipActivityLog) {
      await recordActivity({
        action: 'task.created',
        actionLabel: 'יצירת עבודה',
        targetType: 'task',
        targetId: docRef.id,
        targetLabel: newTask.title || newTask.jobNumber || '',
        targetUserId: userId,
        details: `נוצרה עבודה חדשה ${newTask.jobNumber || ''}`.trim(),
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
    const userId = docSnap.exists() ? docSnap.data().userId : null;

    if (internalNotes !== undefined && userId) {
      await setDoc(doc(db, 'taskPrivateNotes', taskId), { notes: internalNotes, userId });
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

    const changedFields = getChangedFieldLabels(
      { ...beforeData, internalNotes: undefined },
      { ...taskWithoutPrivate, ...(internalNotes !== undefined ? { internalNotes } : {}) }
    );
    const shouldLogTaskUpdate = changedFields.length > 0;
    if (shouldLogTaskUpdate) {
      const isStatusOnly = changedFields.length === 1 && changedFields[0] === 'סטטוס';
      await recordActivity({
        action: isStatusOnly ? 'task.status_changed' : 'task.updated',
        actionLabel: isStatusOnly ? 'שינוי סטטוס' : 'עדכון עבודה',
        targetType: 'task',
        targetId: taskId,
        targetLabel: docSnap.exists() ? (docSnap.data().title || docSnap.data().jobNumber || '') : '',
        targetUserId: userId || beforeData.userId || '',
        details: isStatusOnly
          ? `סטטוס עודכן מ-${beforeData.status || 'לא ידוע'} ל-${taskWithoutPrivate.status}`
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
      details: 'העבודה הועברה לפח האשפה ל-30 יום',
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
      actionLabel: 'שחזור עבודה',
      targetType: 'task',
      targetId: taskId,
      targetLabel: taskData.title || taskData.jobNumber || '',
      targetUserId: taskData.userId || '',
      details: 'העבודה שוחזרה מפח האשפה',
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
      details: 'העבודה והמידע המשויך נמחקו לצמיתות',
      metadata: {}
    });
    return true;
  } catch (e) {
    console.error(`Error permanently deleting task ${taskId} and related data`, e);
    throw e;
  }
};

export const purgeExpiredTasks = async (userId) => {
  if (!userId) return 0;
  assertSystemManagerSession();
  const trashedTasks = await getTrashedTasks(userId);
  const now = Date.now();
  const expiredTasks = trashedTasks.filter(task => Date.parse(task.expiresAt) <= now);
  await Promise.all(expiredTasks.map(task => permanentlyDeleteTask(task.id)));
  return expiredTasks.length;
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
    await setDoc(docRef, settingsData);
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
      userId
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
      userId
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
    const userId = taskData.userId;
    if (!userId) return;

    const supplierName = taskData.supplierName ? taskData.supplierName.trim() : '';
    const contactPerson = taskData.contactPerson ? taskData.contactPerson.trim() : '';
    const supplierContactEmail = taskData.supplierContactEmail ? taskData.supplierContactEmail.trim() : '';

    if (!supplierName && !contactPerson) return;

    // Fetch current suppliers and contacts for this user to check
    const suppliersSnapshot = await getDocs(query(collection(db, 'suppliers'), where('userId', '==', userId)));
    const suppliers = suppliersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const contactsSnapshot = await getDocs(query(collection(db, 'contacts'), where('userId', '==', userId)));
    const contacts = contactsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

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
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      lastLogin: new Date().toISOString(),
      displayName: user.displayName || ''
    }, { merge: true });
    await recordActivity({
      action: 'user.login',
      actionLabel: 'כניסה למערכת',
      targetType: 'user',
      targetId: user.uid,
      targetLabel: user.email || '',
      targetUserId: user.uid,
      details: 'המשתמש התחבר למערכת',
      metadata: {}
    });
  } catch (e) {
    console.error("Error registering user login in Firestore:", e);
  }
};

export const getAllUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const users = [];
    snapshot.forEach(docSnap => {
      users.push(docSnap.data());
    });
    return users;
  } catch (e) {
    console.error("Error fetching all users:", e);
    throw e;
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

/**
 * Ensures that the default suppliers and contacts are present for a user.
 * This is used for both new users (seeding) and existing users who migrated.
 */
export const ensureDefaultSuppliersAndContacts = async (userId) => {
  if (!userId) return;
  try {
    // 1. Check if user has any suppliers in the new collection
    const suppliersSnapshot = await getDocs(query(collection(db, 'suppliers'), where('userId', '==', userId)));
    if (suppliersSnapshot.empty) {
      console.log(`User ${userId} has 0 suppliers. Seeding default suppliers...`);
      const defaultSuppliers = [
        { name: 'Shenzhen Printing Ltd', email: 'li@shenzhenprint.com', phone: '+86 138 0000 0000', address: 'Shenzhen, China', wechat: 'wxid_szprint', notes: 'ספק דפוס ראשי בסין', contactPerson: 'Mr. Li' },
        { name: 'אריזות ישראל', email: 'sales@israelpack.co.il', phone: '03-5551234', address: 'אזור התעשייה חולון', wechat: '', notes: 'ספק אריזות קרטון בארץ', contactPerson: 'משה כהן' },
        { name: 'מפעלי קרטון בע"מ', email: 'info@cartonfact.co.il', phone: '04-8884321', address: 'אזור התעשייה מפרץ חיפה', wechat: '', notes: 'ייצור קופסאות קרטון מותאמות אישית', contactPerson: '' }
      ];
      for (const sup of defaultSuppliers) {
        await addSupplier(sup, userId, { skipActivityLog: true });
      }
    }

    // 2. Check if user has the default contacts in the new collection
    const contactsSnapshot = await getDocs(query(collection(db, 'contacts'), where('userId', '==', userId)));
    const existingNames = new Set(contactsSnapshot.docs.map(doc => doc.data().name.trim().toLowerCase()));

    const defaultContacts = [
      { name: 'Mr. Li', role: 'איש קשר מכירות סין', phone: '+86 138 0000 0000', email: 'li@shenzhenprint.com', address: 'Shenzhen, China', wechat: 'wxid_szprint', notes: 'עובד מול Shenzhen Printing' },
      { name: 'משה כהן', role: 'מנהל ייצור ישראל', phone: '052-1234567', email: 'moshe@israelpack.co.il', address: 'חולון', wechat: '', notes: 'מנהל ייצור באריזות ישראל' }
    ];
    for (const cont of defaultContacts) {
      if (!existingNames.has(cont.name.trim().toLowerCase())) {
        await addContact(cont, userId, { skipActivityLog: true });
      }
    }
  } catch (e) {
    console.error("Error ensuring default suppliers and contacts:", e);
  }
};
