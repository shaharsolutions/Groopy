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

export const DEFAULT_BOARD_STATUSES_V2 = [
  'חדש',
  'בטיפול',
  'נשלח',
  'אושר',
  'ארכיון'
];

export const DEFAULT_STATUS_COLORS = {
  'חדש': 'badge-new',
  'בטיפול': 'badge-in-progress',
  'נשלח': 'badge-waiting-approval',
  'אושר': 'badge-approved',
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
  const isLegacy = settings?.appVersion === 'v1' || settings?.isLegacy === true;
  const fallbackStatuses = isLegacy ? DEFAULT_BOARD_STATUSES : DEFAULT_BOARD_STATUSES_V2;

  const globalStatuses = Array.isArray(settings?.statuses) && settings.statuses.length > 0
    ? settings.statuses
    : fallbackStatuses;

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

/**
 * Checks whether a given board's projects are shared with all members in the organization.
 * 
 * @param {object} settings The settings object containing activeBoardIsShared and boards array.
 * @param {string} boardId The ID of the board (e.g. 'active', 'board_xxx').
 * @returns {boolean} True if the board projects are shared with everyone in the organization.
 */
export function isBoardSharedWithOrg(settings, boardId) {
  if (!boardId || boardId === 'active') {
    return settings?.activeBoardIsShared !== false;
  }
  const customBoards = Array.isArray(settings?.boards) ? settings.boards : [];
  const targetBoard = customBoards.find(b => b && b.id === boardId);
  return targetBoard ? targetBoard.isSharedWithOrg !== false : true;
}

/**
 * Checks whether a given board is accessible to a user.
 * 
 * Rules:
 * 1. If isSystemAdmin is true, user can access all boards.
 * 2. If board is shared with org, all org members can access it.
 * 3. If board is private:
 *    - Board creator can access (createdBy === userId or creatorEmail === userEmail).
 *    - Members explicitly shared can access (sharedEmails or sharedUserIds).
 *    - Fallback for legacy private boards: accessible if user has tasks on this board, or is org owner.
 * 4. Otherwise: returns false (board must be hidden).
 * 
 * @param {object|string} board Board object or board ID.
 * @param {object} context User & environment context.
 * @param {string} [context.userId] Current user ID.
 * @param {string} [context.userEmail] Current user email.
 * @param {object} [context.settings] Global/org settings object.
 * @param {Array} [context.tasks] List of tasks for legacy task ownership check.
 * @param {boolean} [context.isSystemAdmin] Whether current user is system admin.
 * @returns {boolean}
 */
export function isBoardAccessibleToUser(board, context = {}) {
  const {
    userId = null,
    userEmail = null,
    settings = null,
    tasks = null,
    isSystemAdmin = false
  } = context;

  if (isSystemAdmin) return true;

  const boardId = typeof board === 'string' ? board : board?.id;
  if (!boardId) return true;

  const isDefault = boardId === 'active';
  // The default board ('active') is the primary workspace board for the organization.
  // It is always accessible to all users in the organization.
  // (In private mode, isTaskVisibleOnBoard restricts task visibility, but the board itself is accessible).
  if (isDefault) {
    return true;
  }

  let boardObj = (typeof board === 'object' && board !== null) ? board : null;
  if (!boardObj && settings) {
    const customBoards = Array.isArray(settings.boards) ? settings.boards : [];
    boardObj = customBoards.find(b => b && b.id === boardId);
  }

  if (!boardObj) {
    return true;
  }

  // If board is shared with the organization, all organization members can access it
  if (boardObj.isSharedWithOrg !== false) {
    return true;
  }

  // If board is private, check creator & shared permissions
  const normalizedUserEmail = userEmail ? userEmail.trim().toLowerCase() : null;
  const rawCreatorEmail = boardObj.creatorEmail || '';
  const boardCreatorEmail = rawCreatorEmail ? rawCreatorEmail.trim().toLowerCase() : '';

  // 1. Check if user is the creator
  if (userId && (boardObj.createdBy === userId || boardObj.userId === userId)) {
    return true;
  }
  if (normalizedUserEmail && boardCreatorEmail && boardCreatorEmail === normalizedUserEmail) {
    return true;
  }

  // 2. Check if user is explicitly in sharedEmails
  if (normalizedUserEmail && Array.isArray(boardObj.sharedEmails)) {
    const isEmailShared = boardObj.sharedEmails.some(email => (
      typeof email === 'string' && email.trim().toLowerCase() === normalizedUserEmail
    ));
    if (isEmailShared) return true;
  }

  // 3. Check if user is in sharedUserIds
  if (userId && Array.isArray(boardObj.sharedUserIds)) {
    if (boardObj.sharedUserIds.includes(userId)) {
      return true;
    }
  }

  // 4. Check if user has tasks on this board
  if (Array.isArray(tasks) && (userId || normalizedUserEmail)) {
    const userHasTaskOnBoard = tasks.some(t => {
      if (!t) return false;
      const matchesBoard = t.boardId === boardId;
      const matchesUser = (userId && t.userId === userId) ||
                          (normalizedUserEmail && t.userEmail && t.userEmail.trim().toLowerCase() === normalizedUserEmail) ||
                          (normalizedUserEmail && t.creatorEmail && t.creatorEmail.trim().toLowerCase() === normalizedUserEmail) ||
                          (normalizedUserEmail && t.email && t.email.trim().toLowerCase() === normalizedUserEmail);
      return matchesBoard && matchesUser;
    });
    if (userHasTaskOnBoard) return true;
  }

  // 5. Check if user is organization owner
  if (userId && settings?.organizationId === userId) {
    return true;
  }

  return false;
}

/**
 * Returns an ordered array of all boards (including the default 'active' board and custom boards)
 * sorted according to settings.boardOrder, filtered by user accessibility if user context is provided.
 * 
 * @param {object} settings The settings object containing boardOrder, boards, boardTitle, etc.
 * @param {object} [options]
 * @param {boolean} [options.isLegacy]
 * @param {string} [options.userId]
 * @param {string} [options.userEmail]
 * @param {Array} [options.tasks]
 * @param {boolean} [options.isSystemAdmin]
 * @param {boolean} [options.showAll] Set to true to bypass user filtering (e.g. for superadmin or raw config)
 * @returns {Array<{ id: string, name: string, icon: string, isDefault: boolean, isSharedWithOrg: boolean, createdBy?: string, creatorEmail?: string, sharedEmails?: string[], sharedUserIds?: string[], statuses?: string[], statusColors?: Record<string, string>, defaultStatus?: string }>}
 */
export function getOrderedBoards(settings, {
  isLegacy = false,
  userId = null,
  userEmail = null,
  tasks = null,
  isSystemAdmin = false,
  showAll = false
} = {}) {
  const defaultBoard = {
    id: 'active',
    name: settings?.boardTitle || (isLegacy ? 'עבודות פעילות' : 'פרויקטים פעילים'),
    icon: settings?.boardIcon || (isLegacy ? '📁' : '📋'),
    subtitle: settings?.boardSubtitle || '',
    isDefault: true,
    isSharedWithOrg: settings?.activeBoardIsShared !== false,
    createdBy: settings?.activeBoardCreatedBy || settings?.organizationId || '',
    creatorEmail: settings?.activeBoardCreatorEmail || '',
    sharedEmails: Array.isArray(settings?.activeBoardSharedEmails) ? settings.activeBoardSharedEmails : [],
    sharedUserIds: Array.isArray(settings?.activeBoardSharedUserIds) ? settings.activeBoardSharedUserIds : []
  };

  const customBoards = (Array.isArray(settings?.boards) ? settings.boards : [])
    .filter(b => b && b.id && b.id !== 'active' && b.name?.trim() !== 'בדיקה')
    .map(b => ({
      ...b,
      subtitle: b.subtitle || '',
      isDefault: false,
      isSharedWithOrg: b.isSharedWithOrg !== false,
      sharedEmails: Array.isArray(b.sharedEmails) ? b.sharedEmails : [],
      sharedUserIds: Array.isArray(b.sharedUserIds) ? b.sharedUserIds : []
    }));

  const allBoardsMap = new Map();
  allBoardsMap.set('active', defaultBoard);
  customBoards.forEach(b => {
    allBoardsMap.set(b.id, b);
  });

  const rawOrder = Array.isArray(settings?.boardOrder) && settings.boardOrder.length > 0
    ? settings.boardOrder
    : ['active', ...customBoards.map(b => b.id)];

  const result = [];
  const visited = new Set();

  for (const id of rawOrder) {
    if (allBoardsMap.has(id) && !visited.has(id)) {
      result.push(allBoardsMap.get(id));
      visited.add(id);
    }
  }

  // Ensure 'active' is always included
  if (!visited.has('active')) {
    result.push(defaultBoard);
    visited.add('active');
  }

  // Ensure all custom boards are included
  for (const b of customBoards) {
    if (!visited.has(b.id)) {
      result.push(b);
      visited.add(b.id);
    }
  }

  // Filter by user accessibility if user context provided and showAll is not true
  if (!showAll && (userId || userEmail || isSystemAdmin)) {
    return result.filter(b => isBoardAccessibleToUser(b, {
      userId,
      userEmail,
      settings,
      tasks,
      isSystemAdmin
    }));
  }

  return result;
}
