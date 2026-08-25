/**
 * Helper to retrieve status configurations (statuses list, statusColors map, defaultStatus)
 * for a specific board or falling back to the default/global settings.
 */

export const DEFAULT_BOARD_STATUSES = [
  'חדש',
  'בטיפול',
  'נשלח לספק',
  'אושר לספק',
  'ארכיון'
];

export const DEFAULT_STATUS_COLORS = {
  'חדש': 'badge-new',
  'בטיפול': 'badge-in-progress',
  'נשלח לספק': 'badge-waiting-approval',
  'אושר לספק': 'badge-approved',
  'ארכיון': 'badge-archive'
};

export const DEFAULT_BOARD_STATUS = 'חדש';

/**
 * Returns { statuses, statusColors, defaultStatus } for a given board ID.
 * 
 * @param {object} settings The settings object containing global statuses, statusColors, and boards array.
 * @param {string} boardId The ID of the board (e.g. 'active', 'board_xxx', or undefined).
 * @returns {{ statuses: string[], statusColors: Record<string, string>, defaultStatus: string }}
 */
export function getBoardStatusConfig(settings, boardId) {
  const globalStatuses = Array.isArray(settings?.statuses) && settings.statuses.length > 0
    ? settings.statuses
    : DEFAULT_BOARD_STATUSES;

  const globalColors = settings?.statusColors && typeof settings.statusColors === 'object'
    ? settings.statusColors
    : DEFAULT_STATUS_COLORS;

  const globalDefaultStatus = settings?.defaultStatus && globalStatuses.includes(settings.defaultStatus)
    ? settings.defaultStatus
    : globalStatuses[0] || DEFAULT_BOARD_STATUS;

  if (!boardId || boardId === 'active' || boardId === 'trash') {
    return {
      statuses: globalStatuses,
      statusColors: globalColors,
      defaultStatus: globalDefaultStatus
    };
  }

  const customBoards = Array.isArray(settings?.boards) ? settings.boards : [];
  const targetBoard = customBoards.find(b => b && b.id === boardId);

  if (!targetBoard) {
    return {
      statuses: globalStatuses,
      statusColors: globalColors,
      defaultStatus: globalDefaultStatus
    };
  }

  // If the board defines custom statuses
  if (Array.isArray(targetBoard.statuses) && targetBoard.statuses.length > 0) {
    const boardStatuses = targetBoard.statuses;
    const boardColors = {
      ...globalColors,
      ...(targetBoard.statusColors || {})
    };
    const boardDefaultStatus = targetBoard.defaultStatus && boardStatuses.includes(targetBoard.defaultStatus)
      ? targetBoard.defaultStatus
      : boardStatuses[0];

    return {
      statuses: boardStatuses,
      statusColors: boardColors,
      defaultStatus: boardDefaultStatus
    };
  }

  // Otherwise, board inherits global statuses
  return {
    statuses: globalStatuses,
    statusColors: globalColors,
    defaultStatus: globalDefaultStatus
  };
}
