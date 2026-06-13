/**
 * Groopy Work Manager - Cloud Firestore Utility
 * 
 * This module connects directly to the Cloud Firestore database.
 * If the "tasks" collection is empty, it automatically seeds the initial
 * Hebrew sample tasks and comments so the app is immediately populated.
 */

import { db, storage } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { INITIAL_TASKS, INITIAL_COMMENTS } from '../data/mockData';

// Helper to upload files directly to Firebase Storage
export const uploadFileToStorage = (file, folderPath = 'uploads', onProgress = null) => {
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

// Helper to seed the database if empty
const seedDatabaseIfEmpty = async () => {
  const taskQuerySnapshot = await getDocs(collection(db, TASKS_COLLECTION));
  
  if (taskQuerySnapshot.empty) {
    console.log("Firestore database is empty. Seeding initial tasks...");
    
    // Seed tasks with custom IDs (task-1, task-2, task-3)
    for (const task of INITIAL_TASKS) {
      const { id, internalNotes, ...taskWithoutPrivate } = task;
      await setDoc(doc(db, TASKS_COLLECTION, id), taskWithoutPrivate);
      if (internalNotes) {
        await setDoc(doc(db, 'taskPrivateNotes', id), { notes: internalNotes });
      }
    }
    
    console.log("Seeding initial comments...");
    // Seed comments
    for (const comment of INITIAL_COMMENTS) {
      const { id, ...commentWithoutId } = comment;
      await setDoc(doc(db, COMMENTS_COLLECTION, id), commentWithoutId);
    }
    
    console.log("Database seeding completed successfully.");
    return true;
  }
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
  const mapping = {
    'חדש': 'חדש',
    'בטיפול': 'בטיפול',
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

export const getTasks = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, TASKS_COLLECTION));
    const tasks = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
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

export const getCommentsForTask = async (taskId) => {
  try {
    const q = query(collection(db, COMMENTS_COLLECTION), where("jobId", "==", taskId));
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

export const addComment = async (jobId, authorName, text, attachmentUrl = null, attachmentName = null) => {
  try {
    const now = new Date().toISOString();
    const commentData = {
      jobId,
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
    
    // Trigger task updatedAt refresh to update sorting and notify viewers
    await updateTask(jobId, {}); 
    
    return { id: docRef.id, ...commentData };
  } catch (e) {
    console.error("Error adding comment to Cloud Firestore", e);
    throw e;
  }
};

export const deleteComment = async (commentId, jobId = null) => {
  try {
    await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
    if (jobId) {
      await updateTask(jobId, {});
    }
  } catch (e) {
    console.error("Error deleting comment in Cloud Firestore", e);
    throw e;
  }
};


export const getPrivateNotes = async (taskId) => {
  try {
    const docRef = doc(db, 'taskPrivateNotes', taskId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().notes || '';
    }
    return '';
  } catch (e) {
    console.error(`Error fetching private notes for task ${taskId}`, e);
    return '';
  }
};

export const createTask = async (taskData) => {
  try {
    const tasks = await getTasks();
    const jobNumber = generateNextJobNumber(tasks);
    const now = new Date().toISOString();
    
    const { internalNotes, ...taskWithoutPrivate } = taskData;
    
    const newTask = {
      ...taskWithoutPrivate,
      jobNumber,
      createdAt: now,
      updatedAt: now
    };
    
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTask);
    
    if (internalNotes) {
      await setDoc(doc(db, 'taskPrivateNotes', docRef.id), { notes: internalNotes });
    }

    // Auto-add supplier & contact to settings if new
    await autoAddSupplierAndContactFromTask(taskData);
    
    return { id: docRef.id, ...newTask, internalNotes };
  } catch (e) {
    console.error("Error creating task in Cloud Firestore", e);
    throw e;
  }
};

export const updateTask = async (taskId, updatedData) => {
  try {
    const now = new Date().toISOString();
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    
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
    
    if (internalNotes !== undefined) {
      await setDoc(doc(db, 'taskPrivateNotes', taskId), { notes: internalNotes });
    }

    // Auto-add supplier & contact to settings if new
    // Fetch updated document snapshot to get all merged fields.
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await autoAddSupplierAndContactFromTask(docSnap.data());
    }
    
    return true;
  } catch (e) {
    console.error(`Error updating task ${taskId} in Cloud Firestore`, e);
    throw e;
  }
};

export const deleteTask = async (taskId) => {
  try {
    // Delete the task document
    await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
    
    // Delete private notes if any
    await deleteDoc(doc(db, 'taskPrivateNotes', taskId));
    
    // Also delete associated comments to maintain database cleanliness
    const q = query(collection(db, COMMENTS_COLLECTION), where("jobId", "==", taskId));
    const querySnapshot = await getDocs(q);
    
    for (const commentDoc of querySnapshot.docs) {
      await deleteDoc(doc(db, COMMENTS_COLLECTION, commentDoc.id));
    }
    
    return true;
  } catch (e) {
    console.error(`Error deleting task ${taskId} and comments in Cloud Firestore`, e);
    throw e;
  }
};

const SETTINGS_COLLECTION = 'settings';
const GLOBAL_SETTINGS_DOC = 'global';

export const getGlobalSettings = async () => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC);
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

export const saveGlobalSettings = async (settingsData) => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC);
    await setDoc(docRef, settingsData);
    return true;
  } catch (e) {
    console.error("Error saving settings to Cloud Firestore", e);
    throw e;
  }
};

/**
 * Automatically checks the supplierName and contactPerson in task data.
 * If they are not present in global settings, adds them automatically.
 */
export const autoAddSupplierAndContactFromTask = async (taskData) => {
  try {
    const supplierName = taskData.supplierName ? taskData.supplierName.trim() : '';
    const contactPerson = taskData.contactPerson ? taskData.contactPerson.trim() : '';
    const supplierContactEmail = taskData.supplierContactEmail ? taskData.supplierContactEmail.trim() : '';

    if (!supplierName && !contactPerson) return;

    // Fetch current settings
    const settings = await getGlobalSettings() || {};
    let settingsChanged = false;

    // Ensure suppliers array exists and contains objects
    let suppliers = settings.suppliers || [];
    suppliers = suppliers.map(s => {
      if (typeof s === 'string') {
        return { name: s, email: '', phone: '', address: '', wechat: '', notes: '', contactPerson: '' };
      }
      return {
        name: s.name || '',
        email: s.email || '',
        phone: s.phone || '',
        address: s.address || '',
        wechat: s.wechat || '',
        notes: s.notes || '',
        contactPerson: s.contactPerson || ''
      };
    });

    // Ensure contacts array exists and contains objects
    let contacts = settings.contacts || [];
    contacts = contacts.map(c => {
      if (typeof c === 'string') {
        return { name: c, role: '', phone: '', email: '', address: '', wechat: '', notes: '' };
      }
      return {
        name: c.name || '',
        role: c.role || '',
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        wechat: c.wechat || '',
        notes: c.notes || ''
      };
    });

    // 1. Check Supplier
    if (supplierName) {
      const exists = suppliers.some(s => s.name.trim().toLowerCase() === supplierName.toLowerCase());

      if (!exists) {
        const newSupplierObj = {
          name: supplierName,
          email: supplierContactEmail,
          phone: '',
          address: '',
          wechat: '',
          notes: '',
          contactPerson: contactPerson
        };
        suppliers.push(newSupplierObj);
        settings.suppliers = suppliers;
        settingsChanged = true;
      } else {
        // If supplier exists, but contactPerson or email is empty, we update it
        const index = suppliers.findIndex(s => s.name.trim().toLowerCase() === supplierName.toLowerCase());
        if (index !== -1) {
          const s = suppliers[index];
          let updated = false;
          const updatedSup = { ...s };
          if (!updatedSup.email && supplierContactEmail) {
            updatedSup.email = supplierContactEmail;
            updated = true;
          }
          if (!updatedSup.contactPerson && contactPerson) {
            updatedSup.contactPerson = contactPerson;
            updated = true;
          }
          if (updated) {
            suppliers[index] = updatedSup;
            settings.suppliers = suppliers;
            settingsChanged = true;
          }
        }
      }
    }

    // 2. Check Contact Person
    if (contactPerson) {
      const exists = contacts.some(c => c.name.trim().toLowerCase() === contactPerson.toLowerCase());

      if (!exists) {
        const newContactObj = {
          name: contactPerson,
          role: '',
          phone: '',
          email: supplierContactEmail,
          address: '',
          wechat: '',
          notes: ''
        };
        contacts.push(newContactObj);
        settings.contacts = contacts;
        settingsChanged = true;
      } else {
        // If contact exists, but email is empty and task has email, update it
        const index = contacts.findIndex(c => c.name.trim().toLowerCase() === contactPerson.toLowerCase());
        if (index !== -1) {
          const c = contacts[index];
          if (!c.email && supplierContactEmail) {
            contacts[index] = { ...c, email: supplierContactEmail };
            settings.contacts = contacts;
            settingsChanged = true;
          }
        }
      }
    }

    if (settingsChanged) {
      await saveGlobalSettings(settings);
    }
  } catch (e) {
    console.error("Error auto-adding supplier and contact from task data", e);
  }
};

