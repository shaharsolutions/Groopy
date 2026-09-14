/**
 * Utility helper functions for TikTak Next
 */

export function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

export function getPriorityStyle(priority) {
  switch (priority) {
    case 'דחופה':
      return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
    case 'גבוהה':
      return { bg: '#FFFBEB', text: '#D97706', border: '#FCD34D' };
    case 'בינונית':
      return { bg: '#EFF6FF', text: '#2563EB', border: '#93C5FD' };
    default:
      return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
  }
}
