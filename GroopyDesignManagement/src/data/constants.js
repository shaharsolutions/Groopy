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
  'ממתין למידע',
  'ממתין לספק בסין',
  'ממתין לאישור',
  'נדרש תיקון',
  'מאושר',
  'נשלח לייצור',
  'הושלם',
  'מוקפא'
];

export const PRIORITIES = [
  'רגילה',
  'גבוהה',
  'דחופה'
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
  'ממתין למידע': 'badge-waiting-info',
  'ממתין לספק בסין': 'badge-waiting-china',
  'ממתין לאישור': 'badge-waiting-approval',
  'נדרש תיקון': 'badge-needs-revision',
  'מאושר': 'badge-approved',
  'נשלח לייצור': 'badge-sent-production',
  'הושלם': 'badge-completed',
  'מוקפא': 'badge-frozen'
};

// Badge styles based on priorities
export const PRIORITY_CLASSES = {
  'רגילה': 'priority-normal',
  'גבוהה': 'priority-high',
  'דחופה': 'priority-urgent'
};
