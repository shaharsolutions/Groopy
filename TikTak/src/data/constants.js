/**
 * Groopy Work Manager - App Constants
 * 
 * Developer Note: This MVP application uses hardcoded credentials and local storage.
 * In a production environment, this configuration, as well as data access control,
 * should be integrated with a secure backend (e.g. Firebase Auth/Firestore or Supabase).
 */

export const STATUSES = [
  'חדש',
  'בטיפול',
  'נשלח לספק',
  'אושר לספק'
];

export const WORK_TYPES = [
  'אריזה',
  'מדבקה',
  'קטלוג',
  'לוגו',
  'תיקון קובץ',
  'קובץ להדפסה',
  'אחר'
];

// Badge styles based on statuses
export const STATUS_CLASSES = {
  'חדש': 'badge-new',
  'בטיפול': 'badge-in-progress',
  'נשלח לספק': 'badge-waiting-approval', // sky blue
  'אושר לספק': 'badge-approved' // lime green
};
