/**
 * Helper utilities for work orders and attachments
 */

export const hasWorkOrder = (task) => {
  if (!task) return false;
  if (task.workOrderFile) return true;
  if (Array.isArray(task.workOrderFiles) && task.workOrderFiles.length > 0) return true;
  if (Array.isArray(task.attachments) && task.attachments.length > 0) return true;
  if (task.workOrderFiles && typeof task.workOrderFiles === 'object' && Object.keys(task.workOrderFiles).length > 0) return true;
  if (typeof task.workOrderFiles === 'string' && task.workOrderFiles.trim() !== '') return true;
  return false;
};
