import { useCallback, useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { getBoardStatusConfig, isBoardSharedWithOrg, isBoardAccessibleToUser, getOrderedBoards } from '../utils/boardStatusHelper';
import { getFeatureFlags } from '../utils/featureFlags';
import { normalizeNewTaskFields, getAllTaskFieldDefinitions } from '../data/taskFieldConfig';

const AdminDetailsModal = lazy(() => import('../components/AdminDetailsModal'));
import StatusPicker from '../components/StatusPicker';
import PlanogramIndicator from '../components/PlanogramIndicator';
import WorkOrderIndicator from '../components/WorkOrderIndicator';
import { hasWorkOrder } from '../utils/workOrderHelper';
import LinkifiedText from '../components/LinkifiedText';

const PENDING_STATUSES_KEY = 'tiktak_pending_status_updates';
const SORT_PREFERENCE_KEY = 'tiktak_admin_sort_preference';
const COMPLETED_SUBTASK_VISIBILITY_MS = 3000;
const PRESET_BOARD_ICONS = ['📁', '📋', '🏷️', '🚀', '🎨', '📦', '⚡', '🎯', '📊', '⭐️', '✨', '💼', '📌', '🛠️', '🖨️'];
let storageApiPromise = null;

const getTaskFieldValue = (task, fieldKey) => {
  if (!task) return '';
  if (fieldKey === 'contactPerson') return task.contactPerson || task.supplierContactName || '';
  if (fieldKey === 'supplierContactEmail' || fieldKey === 'email') return task.supplierContactEmail || task.contactEmail || task.email || '';
  if (fieldKey === 'contactPhone' || fieldKey === 'phone') return task.phone || task.contactPhone || '';
  if (fieldKey === 'status') return task.status || '';
  if (fieldKey === 'title') return task.title || '';
  if (task.customFields && task.customFields[fieldKey] !== undefined) return task.customFields[fieldKey];
  return task[fieldKey] ?? '';
};

const loadStorageApi = () => {
  storageApiPromise ??= import('../utils/storage');
  return storageApiPromise;
};

const getProjectSubtaskKey = (taskId, subtaskId) => `${taskId}:${subtaskId}`;

const isDateInCurrentWeek = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - now.getDay());

  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(weekStart.getDate() + 7);

  return date >= weekStart && date < nextWeekStart;
};

const formatCompletedDate = (isoString) => {
  if (!isoString) return 'השבוע';
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return 'השבוע';

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const formattedDate = date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit'
    });

    if (isToday) {
      return `היום (${formattedDate})`;
    }
    if (isYesterday) {
      return `אתמול (${formattedDate})`;
    }

    const dayName = date.toLocaleDateString('he-IL', { weekday: 'short' });
    return `${dayName} (${formattedDate})`;
  } catch {
    return 'השבוע';
  }
};

const formatFullDateTime = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
};


const normalizeProjectSubtasks = (task) => {
  if (!Array.isArray(task?.subtasks)) return [];
  return task.subtasks
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `legacy-${index}-${item}`,
          text: item,
          completed: false,
          createdAt: task.createdAt || ''
        };
      }
      return {
        id: item.id || `legacy-${index}-${item.text || ''}`,
        text: item.text || '',
        completed: Boolean(item.completed),
        createdAt: item.createdAt || task.createdAt || '',
        completedAt: item.completedAt || (item.completed ? (item.updatedAt || task.updatedAt || task.createdAt) : null)
      };
    })
    .filter(item => item.text.trim());
};

const readSortPreference = () => {
  try {
    const savedPreference = JSON.parse(localStorage.getItem(SORT_PREFERENCE_KEY) || '{}');
    return {
      mode: typeof savedPreference.mode === 'string' && savedPreference.mode ? savedPreference.mode : 'manual',
      direction: savedPreference.direction === 'desc' ? 'desc' : 'asc'
    };
  } catch {
    return { mode: 'manual', direction: 'asc' };
  }
};

const saveSortPreference = (mode, direction) => {
  try {
    localStorage.setItem(SORT_PREFERENCE_KEY, JSON.stringify({ mode, direction }));
  } catch (err) {
    console.warn('Could not store sort preference locally', err);
  }
};

const readPendingStatuses = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_STATUSES_KEY) || '{}');
  } catch {
    return {};
  }
};

const rememberPendingStatus = (taskId, status) => {
  try {
    const pendingStatuses = readPendingStatuses();
    pendingStatuses[taskId] = status;
    localStorage.setItem(PENDING_STATUSES_KEY, JSON.stringify(pendingStatuses));
  } catch (err) {
    console.warn('Could not store pending status locally', err);
  }
};

const clearPendingStatus = (taskId, expectedStatus) => {
  try {
    const pendingStatuses = readPendingStatuses();
    if (pendingStatuses[taskId] !== expectedStatus) return;

    delete pendingStatuses[taskId];
    if (Object.keys(pendingStatuses).length === 0) {
      localStorage.removeItem(PENDING_STATUSES_KEY);
    } else {
      localStorage.setItem(PENDING_STATUSES_KEY, JSON.stringify(pendingStatuses));
    }
  } catch (err) {
    console.warn('Could not clear pending status locally', err);
  }
};

const mergeTasksPreservingOrder = (currentTasks, fetchedTasks) => {
  if (currentTasks.length === 0) return fetchedTasks;

  const fetchedById = new Map(fetchedTasks.map(task => [task.id, task]));
  const mergedTasks = currentTasks
    .filter(task => fetchedById.has(task.id))
    .map(task => fetchedById.get(task.id));
  const knownIds = new Set(mergedTasks.map(task => task.id));
  const newTasks = fetchedTasks.filter(task => !knownIds.has(task.id));

  return [...mergedTasks, ...newTasks];
};

export default function AdminDashboard({ settings, suppliers = [], contacts = [], onSaveSettings, userId, organizationId, userEmail = '', isSystemAdmin = false, autoOpenTaskId, onClearAutoOpen, onNavigate }) {
  const {
    autoArchiveInactiveDays = 45
  } = settings || {};
  const [tasks, setTasks] = useState([]);
  const [trashedTasks, setTrashedTasks] = useState([]);
  const [workspaceView, setWorkspaceView] = useState(() => {
    try {
      const userKey = userId ? `tiktak_workspace_view_${userId}` : 'tiktak_workspace_view';
      return localStorage.getItem(userKey) || localStorage.getItem('tiktak_workspace_view') || 'active';
    } catch {
      return 'active';
    }
  });

  useEffect(() => {
    try {
      if (workspaceView && workspaceView !== 'trash') {
        if (userId) {
          localStorage.setItem(`tiktak_workspace_view_${userId}`, workspaceView);
        }
        localStorage.setItem('tiktak_workspace_view', workspaceView);
      }
    } catch (err) {
      console.warn('Could not save workspace view preference', err);
    }
  }, [workspaceView, userId]);
  const [restoringTaskId, setRestoringTaskId] = useState(null);
  const [permanentlyDeletingTaskId, setPermanentlyDeletingTaskId] = useState(null);
  const [permanentDeleteTask, setPermanentDeleteTask] = useState(null);
  const [isEmptyTrashConfirmOpen, setIsEmptyTrashConfirmOpen] = useState(false);
  const [isPurgingAllTrash, setIsPurgingAllTrash] = useState(false);

  const flags = getFeatureFlags({ organizationId, ...settings });

  // Status configuration for currently active workspace/board
  const currentBoardStatusConfig = useMemo(() => (
    getBoardStatusConfig(settings, workspaceView)
  ), [settings, workspaceView]);
  const STATUSES = currentBoardStatusConfig.statuses;
  const STATUS_CLASSES = currentBoardStatusConfig.statusColors;

  const newTaskFields = useMemo(() => normalizeNewTaskFields(settings?.newTaskFields, { isLegacy: flags.isLegacy }), [settings?.newTaskFields, flags.isLegacy]);
  const contactPersonLabel = newTaskFields.contactPerson?.label || 'איש קשר';
  const contactPhoneLabel = newTaskFields.contactPhone?.label || 'טלפון';
  const supplierContactEmailLabel = newTaskFields.supplierContactEmail?.label || 'אימייל';
  const isContactPersonEnabled = !flags.isLegacy || newTaskFields.contactPerson?.enabled !== false;
  const isContactPhoneEnabled = !flags.isLegacy || newTaskFields.contactPhone?.enabled !== false;
  const isSupplierContactEmailEnabled = !flags.isLegacy || newTaskFields.supplierContactEmail?.enabled !== false;

  const projectFields = useMemo(() => {
    return getAllTaskFieldDefinitions(settings?.newTaskFields, {
      includeDeleted: false,
      taskFieldOrder: settings?.taskFieldOrder,
      isLegacy: flags.isLegacy
    }).filter(field => field.enabled !== false && !field.deleted);
  }, [settings?.newTaskFields, settings?.taskFieldOrder, flags.isLegacy]);

  // Boards State filtered by user access
  const orderedBoards = useMemo(() => {
    return getOrderedBoards(settings, {
      isLegacy: flags.isLegacy,
      userId,
      userEmail,
      tasks,
      isSystemAdmin
    });
  }, [settings, flags.isLegacy, userId, userEmail, tasks, isSystemAdmin]);
  const customBoards = useMemo(() => orderedBoards.filter(b => b && b.id !== 'active'), [orderedBoards]);
  const [isAddBoardModalOpen, setIsAddBoardModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardIcon, setNewBoardIcon] = useState('📁');
  const [newBoardSubtitle, setNewBoardSubtitle] = useState('');
  const [newBoardIsShared, setNewBoardIsShared] = useState(true);
  const [newBoardSharedEmails, setNewBoardSharedEmails] = useState([]);
  const [newBoardEmailInput, setNewBoardEmailInput] = useState('');
  const [editingBoard, setEditingBoard] = useState(null);
  const [editingBoardEmailInput, setEditingBoardEmailInput] = useState('');
  const [activeBoardMenuId, setActiveBoardMenuId] = useState(null);
  const [draggedBoardId, setDraggedBoardId] = useState(null);
  const [dragOverBoardId, setDragOverBoardId] = useState(null);

  // Board subtitle editing state (v2)
  const [isEditingBoardSubtitle, setIsEditingBoardSubtitle] = useState(false);
  const [boardSubtitleValue, setBoardSubtitleValue] = useState('');
  const [isSavingBoardSubtitle, setIsSavingBoardSubtitle] = useState(false);

  // Auto-redirect if current workspaceView board is not accessible
  useEffect(() => {
    if (workspaceView && workspaceView !== 'trash' && orderedBoards.length > 0) {
      const isStillAvailable = orderedBoards.some(b => b.id === workspaceView);
      if (!isStillAvailable) {
        setWorkspaceView(orderedBoards[0]?.id || 'active');
      }
    }
  }, [workspaceView, orderedBoards]);

  // Contacts with email for quick member sharing suggestions
  const contactsWithEmails = useMemo(() => {
    return (Array.isArray(contacts) ? contacts : [])
      .filter(c => c && typeof c === 'object' && c.email && typeof c.email === 'string' && c.email.trim());
  }, [contacts]);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortMode, setSortMode] = useState(() => readSortPreference().mode);
  const [sortDirection, setSortDirection] = useState(() => readSortPreference().direction);
  const [savingStatusIds, setSavingStatusIds] = useState(() => new Set());
  const [recentlyCompletedSubtaskKeys, setRecentlyCompletedSubtaskKeys] = useState(() => new Set());
  const [showCompletedThisWeekSubtasks, setShowCompletedThisWeekSubtasks] = useState(false);
  const [filterSubtasksBySelectedBoard, setFilterSubtasksBySelectedBoard] = useState(false);

  // Reset status filter and board subtitle edit mode when switching boards
  useEffect(() => {
    setStatusFilter('');
    setIsEditingBoardSubtitle(false);
  }, [workspaceView]);

  // Fallback to 'active' if stored custom board was deleted
  useEffect(() => {
    if (workspaceView !== 'active' && workspaceView !== 'trash') {
      if (settings?.boards !== undefined) {
        const exists = customBoards.some(b => b && b.id === workspaceView);
        if (!exists) {
          setWorkspaceView('active');
        }
      }
    }
  }, [settings?.boards, customBoards, workspaceView]);
  const statusChangeSeq = useRef({});
  const autoArchiveRunKey = useRef('');
  const completedSubtaskTimers = useRef({});
  const storageApi = useRef(null);

  const getStorageApi = useCallback(async () => {
    storageApi.current ??= await loadStorageApi();
    return storageApi.current;
  }, []);

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const [viewingTask, setViewingTask] = useState(null); // holds task being viewed, or null
  const [deletingTaskId, setDeletingTaskId] = useState(null); // holds task id to delete, or null

  // Inline editing table cells
  const [editingCell, setEditingCell] = useState({ taskId: null, field: null });
  const [editValue, setEditValue] = useState('');
  const [isSavingCell, setIsSavingCell] = useState(false);

  // Close delete confirmation modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Only close if no detail modal is active (detail modal has its own escape listener)
        if (!viewingTask && !isCreateOpen) {
          if (deletingTaskId) setDeletingTaskId(null);
          if (permanentDeleteTask && !permanentlyDeletingTaskId) setPermanentDeleteTask(null);
          if (isEmptyTrashConfirmOpen && !isPurgingAllTrash) setIsEmptyTrashConfirmOpen(false);
        }
      }
    };
    if (deletingTaskId || permanentDeleteTask || isEmptyTrashConfirmOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deletingTaskId, permanentDeleteTask, isEmptyTrashConfirmOpen, permanentlyDeletingTaskId, isPurgingAllTrash, viewingTask, isCreateOpen]);

  useEffect(() => {
    return () => {
      Object.values(completedSubtaskTimers.current).forEach(clearTimeout);
      completedSubtaskTimers.current = {};
    };
  }, []);

  // Close board dropdown menus when clicking elsewhere
  useEffect(() => {
    const handleDocClick = () => setActiveBoardMenuId(null);
    if (activeBoardMenuId) {
      window.addEventListener('click', handleDocClick);
    }
    return () => window.removeEventListener('click', handleDocClick);
  }, [activeBoardMenuId]);

  const handleAddBoard = async (e) => {
    e?.preventDefault();
    const nameTrimmed = newBoardName.trim();
    if (!nameTrimmed) return;

    const normalizedSharedEmails = newBoardSharedEmails
      .map(e => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
      .filter(Boolean);

    const newBoard = {
      id: 'board_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: nameTrimmed,
      icon: newBoardIcon || '📁',
      subtitle: (newBoardSubtitle || '').trim(),
      isSharedWithOrg: Boolean(newBoardIsShared),
      createdBy: userId || '',
      creatorEmail: userEmail || '',
      sharedEmails: !newBoardIsShared ? normalizedSharedEmails : [],
      sharedUserIds: [],
      createdAt: new Date().toISOString()
    };

    const currentBoards = Array.isArray(settings?.boards) ? settings.boards : [];
    const updatedBoards = [...currentBoards.filter(b => b && b.id !== newBoard.id && b.id !== 'active'), newBoard];
    const currentBoardOrder = Array.isArray(settings?.boardOrder) && settings.boardOrder.length > 0
      ? settings.boardOrder
      : ['active', ...currentBoards.map(b => b.id)];
    const updatedBoardOrder = [...currentBoardOrder.filter(id => id !== newBoard.id), newBoard.id];

    try {
      await onSaveSettings({
        ...settings,
        boards: updatedBoards,
        boardOrder: updatedBoardOrder
      });
      setNewBoardName('');
      setNewBoardIcon('📁');
      setNewBoardSubtitle('');
      setNewBoardIsShared(true);
      setNewBoardSharedEmails([]);
      setNewBoardEmailInput('');
      setIsAddBoardModalOpen(false);
      setWorkspaceView(newBoard.id);
    } catch (err) {
      console.error('Failed to create new board', err);
      alert('שגיאה ביצירת הלוח. נסי שוב.');
    }
  };

  const handleSaveEditedBoard = async (e) => {
    e?.preventDefault();
    if (!editingBoard || !editingBoard.name.trim()) return;

    if (editingBoard.id === 'active') {
      try {
        await onSaveSettings({
          ...settings,
          boardTitle: editingBoard.name.trim(),
          boardIcon: editingBoard.icon || '📋',
          boardSubtitle: (editingBoard.subtitle || '').trim(),
          activeBoardIsShared: editingBoard.isSharedWithOrg !== false,
          activeBoardCreatedBy: editingBoard.isSharedWithOrg !== false ? '' : (settings?.activeBoardCreatedBy || userId || ''),
          activeBoardCreatorEmail: editingBoard.isSharedWithOrg !== false ? '' : (settings?.activeBoardCreatorEmail || userEmail || ''),
          activeBoardSharedEmails: editingBoard.isSharedWithOrg !== false ? [] : (Array.isArray(editingBoard.sharedEmails) ? editingBoard.sharedEmails : [])
        });
        setEditingBoard(null);
        setEditingBoardEmailInput('');
      } catch (err) {
        console.error('Failed to update default board', err);
        alert('שגיאה בעדכון הלוח. נסי שוב.');
      }
      return;
    }

    const currentBoards = Array.isArray(settings?.boards) ? settings.boards : [];
    const updatedBoards = currentBoards.map(b => (
      b.id === editingBoard.id
        ? {
            ...b,
            name: editingBoard.name.trim(),
            icon: editingBoard.icon || '📁',
            subtitle: (editingBoard.subtitle || '').trim(),
            isSharedWithOrg: editingBoard.isSharedWithOrg !== false,
            sharedEmails: editingBoard.isSharedWithOrg !== false ? [] : (Array.isArray(editingBoard.sharedEmails) ? editingBoard.sharedEmails : []),
            createdBy: b.createdBy || userId || '',
            creatorEmail: b.creatorEmail || userEmail || ''
          }
        : b
    ));

    try {
      await onSaveSettings({
        ...settings,
        boards: updatedBoards
      });
      setEditingBoard(null);
      setEditingBoardEmailInput('');
    } catch (err) {
      console.error('Failed to update board', err);
      alert('שגיאה בעדכון הלוח. נסי שוב.');
    }
  };

  // Inline editing handlers for current board subtitle
  const startEditingBoardSubtitle = () => {
    setBoardSubtitleValue(currentBoardSubtitle);
    setIsEditingBoardSubtitle(true);
  };

  const cancelEditingBoardSubtitle = () => {
    setIsEditingBoardSubtitle(false);
    setBoardSubtitleValue('');
  };

  const handleSaveBoardSubtitle = async (newValue) => {
    const trimmedVal = typeof newValue === 'string' ? newValue.trim() : '';
    if (trimmedVal === currentBoardSubtitle) {
      setIsEditingBoardSubtitle(false);
      return;
    }

    setIsSavingBoardSubtitle(true);
    try {
      if (workspaceView === 'active') {
        await onSaveSettings({
          ...settings,
          boardSubtitle: trimmedVal
        });
      } else {
        const currentBoards = Array.isArray(settings?.boards) ? settings.boards : [];
        const updatedBoards = currentBoards.map(b => (
          b && b.id === workspaceView
            ? { ...b, subtitle: trimmedVal }
            : b
        ));
        await onSaveSettings({
          ...settings,
          boards: updatedBoards
        });
      }
      setIsEditingBoardSubtitle(false);
    } catch (err) {
      console.error('Failed to save board subtitle', err);
      alert('שגיאה בשמירת תת-הכותרת של הלוח. נסי שוב.');
    } finally {
      setIsSavingBoardSubtitle(false);
    }
  };

  const handleToggleBoardSharing = async (boardId) => {
    const isCurrentlyShared = isBoardSharedWithOrg(settings, boardId);
    const nextShared = !isCurrentlyShared;

    try {
      if (boardId === 'active') {
        await onSaveSettings({
          ...settings,
          activeBoardIsShared: nextShared,
          activeBoardCreatedBy: nextShared ? '' : (settings?.activeBoardCreatedBy || userId || ''),
          activeBoardCreatorEmail: nextShared ? '' : (settings?.activeBoardCreatorEmail || userEmail || '')
        });
      } else {
        const currentBoards = Array.isArray(settings?.boards) ? settings.boards : [];
        const updatedBoards = currentBoards.map(b => (
          b.id === boardId ? {
            ...b,
            isSharedWithOrg: nextShared,
            createdBy: b.createdBy || userId || '',
            creatorEmail: b.creatorEmail || userEmail || ''
          } : b
        ));
        await onSaveSettings({
          ...settings,
          boards: updatedBoards
        });
      }
      setActiveBoardMenuId(null);
    } catch (err) {
      console.error('Failed to toggle board sharing', err);
      alert('שגיאה בעדכון הגדרות שיתוף הלוח. נסי שוב.');
    }
  };

  const handleDeleteBoard = async (boardId) => {
    const currentBoards = Array.isArray(settings?.boards) ? settings.boards : [];
    const targetBoard = currentBoards.find(b => b.id === boardId);
    if (!targetBoard) return;

    const defaultBoardName = settings?.boardTitle || 'פרויקטים פעילים';
    if (!window.confirm(`האם את בטוחה שברצונך למחוק את הלוח "${targetBoard.name}"?\nכל הפרויקטים בלוח זה יועברו אוטומטית ללוח "${defaultBoardName}".`)) {
      return;
    }

    try {
      const tasksOnBoard = tasks.filter(t => t.boardId === boardId);
      if (tasksOnBoard.length > 0) {
        const { updateTask } = await getStorageApi();
        await Promise.all(tasksOnBoard.map(t => updateTask(t.id, { boardId: 'active' })));
        setTasks(prev => prev.map(t => t.boardId === boardId ? { ...t, boardId: 'active' } : t));
      }

      const updatedBoards = currentBoards.filter(b => b.id !== boardId);
      const updatedBoardOrder = (settings?.boardOrder || []).filter(id => id !== boardId);
      await onSaveSettings({
        ...settings,
        boards: updatedBoards,
        boardOrder: updatedBoardOrder
      });

      setActiveBoardMenuId(null);
      if (workspaceView === boardId) {
        setWorkspaceView('active');
      }
    } catch (err) {
      console.error('Failed to delete board', err);
      alert('שגיאה במחיקת הלוח. נסי שוב.');
    }
  };

  const handleReorderBoards = async (newOrderedBoards) => {
    const visibleBoardIds = new Set(newOrderedBoards.map(b => b.id));
    const allCustomBoards = Array.isArray(settings?.boards) ? settings.boards : [];
    const hiddenCustomBoards = allCustomBoards.filter(b => b && !visibleBoardIds.has(b.id));
    const updatedCustomBoards = [...newOrderedBoards.filter(b => b.id !== 'active'), ...hiddenCustomBoards];

    const visibleOrder = newOrderedBoards.map(b => b.id);
    const existingOrder = Array.isArray(settings?.boardOrder) ? settings.boardOrder : [];
    const hiddenOrderIds = existingOrder.filter(id => !visibleBoardIds.has(id));
    const newBoardOrder = [...visibleOrder, ...hiddenOrderIds];

    try {
      await onSaveSettings({
        ...settings,
        boardOrder: newBoardOrder,
        boards: updatedCustomBoards
      });
    } catch (err) {
      console.error('Failed to update board order', err);
      alert('שגיאה בעדכון סדר הלוחות. נסי שוב.');
    }
  };

  const handleMoveBoard = async (fromIndex, toIndex) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= orderedBoards.length || toIndex >= orderedBoards.length || fromIndex === toIndex) {
      return;
    }
    const newOrdered = [...orderedBoards];
    const [moved] = newOrdered.splice(fromIndex, 1);
    newOrdered.splice(toIndex, 0, moved);
    setActiveBoardMenuId(null);
    await handleReorderBoards(newOrdered);
  };

  const handleDragStart = (e, boardId) => {
    setDraggedBoardId(boardId);
    e.dataTransfer.setData('text/plain', boardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, boardId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedBoardId && draggedBoardId !== boardId && dragOverBoardId !== boardId) {
      setDragOverBoardId(boardId);
    }
  };

  const handleDragLeave = (e, boardId) => {
    if (dragOverBoardId === boardId) {
      setDragOverBoardId(null);
    }
  };

  const handleDrop = async (e, targetBoardId) => {
    e.preventDefault();
    const sourceBoardId = draggedBoardId || e.dataTransfer.getData('text/plain');
    setDraggedBoardId(null);
    setDragOverBoardId(null);

    if (!sourceBoardId || sourceBoardId === targetBoardId) return;

    const fromIndex = orderedBoards.findIndex(b => b.id === sourceBoardId);
    const toIndex = orderedBoards.findIndex(b => b.id === targetBoardId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const newOrdered = [...orderedBoards];
    const [moved] = newOrdered.splice(fromIndex, 1);
    newOrdered.splice(toIndex, 0, moved);
    await handleReorderBoards(newOrdered);
  };

  const handleDragEnd = () => {
    setDraggedBoardId(null);
    setDragOverBoardId(null);
  };

  const loadTasks = useCallback(async () => {
    const { getTasks } = await getStorageApi();
    const fetchedTasks = await getTasks(userId, organizationId);
    setTasks(prev => mergeTasksPreservingOrder(prev, fetchedTasks));
    setViewingTask(prev => {
      if (!prev) return null;
      const updated = fetchedTasks.find(t => t.id === prev.id);
      return updated || prev;
    });
  }, [getStorageApi, userId, organizationId]);

  const loadTrash = useCallback(async () => {
    const { getTrashedTasks } = await getStorageApi();
    const fetchedTasks = await getTrashedTasks(userId, organizationId);
    const loadedAt = Number(new Date());
    setTrashedTasks(fetchedTasks.map(task => ({
      ...task,
      daysRemaining: Math.max(0, Math.ceil((Date.parse(task.expiresAt) - loadedAt) / (24 * 60 * 60 * 1000)))
    })));
  }, [getStorageApi, userId, organizationId]);

  const applyTaskPatch = (taskId, patch) => {
    setTasks(prev => prev.map(task => (
      task.id === taskId ? { ...task, ...patch } : task
    )));
    setViewingTask(prev => (
      prev && prev.id === taskId ? { ...prev, ...patch } : prev
    ));
  };

  // Fetch tasks on mount
  useEffect(() => {
    if (!userId) return;

    const initTasks = async () => {
      const {
        purgeExpiredTasks,
        autoArchiveInactiveTasks,
        updateTask,
        getTasks
      } = await getStorageApi();

      // Fetch main tasks IMMEDIATELY in parallel for fast loading
      const tasksPromise = getTasks(userId, organizationId);

      // Run background maintenance tasks asynchronously
      purgeExpiredTasks(userId, organizationId).catch(err => console.error("Purge error", err));
      const archiveRunKey = `${userId}:${organizationId || ''}:${autoArchiveInactiveDays}`;
      if (autoArchiveRunKey.current !== archiveRunKey) {
        autoArchiveRunKey.current = archiveRunKey;
        autoArchiveInactiveTasks(userId, autoArchiveInactiveDays, organizationId).catch(err => console.error("AutoArchive error", err));
      }
      let fetchedTasks = await tasksPromise;
      const pendingStatuses = readPendingStatuses();
      if (Object.keys(pendingStatuses).length > 0) {
        fetchedTasks = fetchedTasks.map(task => {
          if (pendingStatuses[task.id]) {
            return { ...task, status: pendingStatuses[task.id] };
          }
          return task;
        });
        Promise.all(Object.entries(pendingStatuses).map(async ([taskId, status]) => {
          try {
            await updateTask(taskId, { status });
            clearPendingStatus(taskId, status);
          } catch (err) {
            console.error(`Failed to restore pending status for task ${taskId}`, err);
          }
        })).catch(err => console.error(err));
      }

      setTasks(fetchedTasks);
      loadTrash().catch(err => console.error(err));

      const params = new URLSearchParams(window.location.search);
      const urlTaskId = params.get('taskId');
      if (urlTaskId) {
        const taskToOpen = fetchedTasks.find(t => t.id === urlTaskId);
        if (taskToOpen) {
          if (taskToOpen.boardId && taskToOpen.boardId !== 'active') {
            setWorkspaceView(taskToOpen.boardId);
          } else {
            setWorkspaceView('active');
          }
          setViewingTask(taskToOpen);
        }
      }
    };
    initTasks();
  }, [userId, organizationId, autoArchiveInactiveDays, getStorageApi, loadTrash]);

  // Listen to autoOpenTaskId from global search to open the details modal
  useEffect(() => {
    if (autoOpenTaskId && tasks.length > 0) {
      const taskToOpen = tasks.find(t => t.id === autoOpenTaskId);
      if (taskToOpen) {
        queueMicrotask(() => {
          if (taskToOpen.boardId && taskToOpen.boardId !== 'active') {
            setWorkspaceView(taskToOpen.boardId);
          } else {
            setWorkspaceView('active');
          }
          setViewingTask(taskToOpen);
          if (onClearAutoOpen) onClearAutoOpen();
        });
      }
    }
  }, [autoOpenTaskId, tasks, onClearAutoOpen]);

  // Helper to check if a task is visible on a board based on its sharing configuration
  const isTaskVisibleOnBoard = useCallback((task, boardId) => {
    if (isSystemAdmin) return true;

    const isAccessible = isBoardAccessibleToUser(boardId, {
      userId,
      userEmail,
      settings,
      tasks,
      isSystemAdmin
    });
    if (!isAccessible) return false;

    const isShared = isBoardSharedWithOrg(settings, boardId);
    if (isShared) return true;

    // For a private board: check if current user is owner or explicitly shared
    const boardObj = boardId === 'active'
      ? {
          createdBy: settings?.activeBoardCreatedBy,
          creatorEmail: settings?.activeBoardCreatorEmail,
          sharedEmails: settings?.activeBoardSharedEmails,
          sharedUserIds: settings?.activeBoardSharedUserIds
        }
      : (Array.isArray(settings?.boards) ? settings.boards.find(b => b?.id === boardId) : null);

    const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : '';
    const isCreator = (userId && boardObj?.createdBy === userId) ||
                      (normalizedEmail && boardObj?.creatorEmail && boardObj.creatorEmail.trim().toLowerCase() === normalizedEmail);
    const isSharedMember = (normalizedEmail && Array.isArray(boardObj?.sharedEmails) && boardObj.sharedEmails.some(e => typeof e === 'string' && e.trim().toLowerCase() === normalizedEmail)) ||
                           (userId && Array.isArray(boardObj?.sharedUserIds) && boardObj.sharedUserIds.includes(userId));

    if (isCreator || isSharedMember) return true;

    // Otherwise, user sees tasks assigned to / created by them
    return !task.userId || task.userId === userId || (normalizedEmail && (
      (task.userEmail && task.userEmail.trim().toLowerCase() === normalizedEmail) ||
      (task.creatorEmail && task.creatorEmail.trim().toLowerCase() === normalizedEmail) ||
      (task.email && task.email.trim().toLowerCase() === normalizedEmail)
    ));
  }, [settings, userId, userEmail, tasks, isSystemAdmin]);

  // Tasks in the currently active board view
  const currentBoardTasks = useMemo(() => {
    if (workspaceView === 'trash') return [];
    if (workspaceView === 'active') {
      return tasks.filter(t => (!t.boardId || t.boardId === 'active') && isTaskVisibleOnBoard(t, 'active'));
    }
    return tasks.filter(t => t.boardId === workspaceView && isTaskVisibleOnBoard(t, workspaceView));
  }, [tasks, workspaceView, isTaskVisibleOnBoard]);

  const activeBoardTasksCount = useMemo(() => (
    tasks.filter(t => (!t.boardId || t.boardId === 'active') && isTaskVisibleOnBoard(t, 'active')).length
  ), [tasks, isTaskVisibleOnBoard]);

  const activeTasksCount = useMemo(() => (
    currentBoardTasks.filter(t => t.status !== 'ארכיון').length
  ), [currentBoardTasks]);

  const defaultBoardName = settings?.boardTitle || (flags.isLegacy ? 'עבודות פעילות' : 'פרויקטים פעילים');
  const defaultBoardIcon = settings?.boardIcon || (flags.isLegacy ? '📁' : '📋');

  const currentBoardName = useMemo(() => {
    if (workspaceView === 'trash') return '🗑️ פח אשפה';
    if (workspaceView === 'active') return `${defaultBoardIcon} ${defaultBoardName}`;
    const custom = customBoards.find(b => b.id === workspaceView);
    return custom ? `${custom.icon ? custom.icon + ' ' : ''}${custom.name}` : `${defaultBoardIcon} ${defaultBoardName}`;
  }, [workspaceView, defaultBoardName, defaultBoardIcon, customBoards]);

  const currentBoardSubtitle = useMemo(() => {
    if (workspaceView === 'trash') return '';
    if (workspaceView === 'active') return settings?.boardSubtitle || '';
    const custom = customBoards.find(b => b.id === workspaceView);
    return custom ? (custom.subtitle || '') : '';
  }, [workspaceView, settings?.boardSubtitle, customBoards]);

  // Filter and sort tasks whenever data or controls change
  const filteredTasks = useMemo(() => {
    let result = [...currentBoardTasks];

    // Search query filter (title, contactPerson, email, notes, custom fields)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => {
        const contact = t.contactPerson || t.supplierContactName || '';
        const email = t.supplierContactEmail || t.contactEmail || t.email || '';
        if (t.title && t.title.toLowerCase().includes(q)) return true;
        if (contact && contact.toLowerCase().includes(q)) return true;
        if (email && email.toLowerCase().includes(q)) return true;
        if (t.description && t.description.toLowerCase().includes(q)) return true;
        if (t.internalNotes && t.internalNotes.toLowerCase().includes(q)) return true;
        if (t.customFields && typeof t.customFields === 'object') {
          for (const val of Object.values(t.customFields)) {
            if (val !== null && val !== undefined && String(val).toLowerCase().includes(q)) return true;
          }
        }
        return false;
      });
    }

    // Status filter - if empty ('All'), exclude archived tasks
    if (statusFilter) {
      result = result.filter(t => t.status === statusFilter);
    } else {
      result = result.filter(t => t.status !== 'ארכיון');
    }

    if (sortMode !== 'manual') {
      const statusOrder = new Map(STATUSES.map((status, index) => [status, index]));
      const direction = sortDirection === 'asc' ? 1 : -1;

      result.sort((a, b) => {
        let comparison = 0;
        if (sortMode === 'updatedAt') {
          comparison = (Date.parse(a.updatedAt) || 0) - (Date.parse(b.updatedAt) || 0);
        } else if (sortMode === 'status') {
          comparison = (statusOrder.get(a.status) ?? 999) - (statusOrder.get(b.status) ?? 999);
        } else {
          const valA = getTaskFieldValue(a, sortMode);
          const valB = getTaskFieldValue(b, sortMode);

          if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
          } else if (typeof valA === 'boolean' || typeof valB === 'boolean') {
            comparison = (valA === valB ? 0 : valA ? 1 : -1);
          } else {
            comparison = String(valA || '').localeCompare(String(valB || ''), 'he', {
              sensitivity: 'base',
              numeric: true
            });
          }
        }

        if (comparison !== 0) return comparison * direction;
        return (a.title || '').localeCompare(b.title || '', 'he', { sensitivity: 'base' });
      });
    }

    return result;
  }, [currentBoardTasks, searchQuery, statusFilter, sortMode, sortDirection, STATUSES]);

  const statusCounts = useMemo(() => {
    const counts = new Map();
    currentBoardTasks.forEach(task => {
      counts.set(task.status, (counts.get(task.status) || 0) + 1);
    });
    return counts;
  }, [currentBoardTasks]);

  const contactsByName = useMemo(() => {
    const map = new Map();
    contacts.forEach(contact => {
      const key = contact.name?.trim().toLowerCase();
      if (key) map.set(key, contact);
    });
    return map;
  }, [contacts]);

  const boardsMap = useMemo(() => {
    const map = new Map();
    map.set('active', { id: 'active', name: defaultBoardName, icon: defaultBoardIcon });
    if (Array.isArray(settings?.boards)) {
      settings.boards.forEach(b => {
        if (b?.id) map.set(b.id, { id: b.id, name: b.name || 'לוח ללא שם', icon: b.icon || '📁' });
      });
    }
    orderedBoards.forEach(b => {
      if (b?.id) map.set(b.id, b);
    });
    return map;
  }, [orderedBoards, settings, defaultBoardName, defaultBoardIcon]);

  const candidateSubtaskTasks = useMemo(() => {
    if (!flags.isV2) {
      return currentBoardTasks;
    }

    if (filterSubtasksBySelectedBoard && workspaceView !== 'trash') {
      return currentBoardTasks;
    }

    return tasks.filter(t => {
      if (t.boardId === 'trash') return false;
      const boardId = t.boardId || 'active';
      return isTaskVisibleOnBoard(t, boardId);
    });
  }, [flags.isV2, filterSubtasksBySelectedBoard, workspaceView, currentBoardTasks, tasks, isTaskVisibleOnBoard]);

  const allProjectSubtasks = useMemo(() => {
    return candidateSubtaskTasks
      .flatMap(task => {
        const boardId = task.boardId || 'active';
        const boardInfo = boardsMap.get(boardId);
        const boardName = boardInfo?.name || (boardId === 'active' ? defaultBoardName : 'לוח');
        const boardIcon = boardInfo?.icon || (boardId === 'active' ? defaultBoardIcon : '📁');

        return normalizeProjectSubtasks(task).map(subtask => ({
          ...subtask,
          taskId: task.id,
          projectTitle: task.title || task.jobNumber || 'פרויקט ללא שם',
          projectStatus: task.status || '',
          projectUpdatedAt: task.updatedAt || task.createdAt || '',
          boardId,
          boardName,
          boardIcon
        }));
      });
  }, [candidateSubtaskTasks, boardsMap, defaultBoardName, defaultBoardIcon]);

  const openProjectSubtasks = useMemo(() => (
    allProjectSubtasks
      .filter(item => !item.completed)
      .sort((a, b) => (Date.parse(b.createdAt) || Date.parse(b.projectUpdatedAt) || 0) - (Date.parse(a.createdAt) || Date.parse(a.projectUpdatedAt) || 0))
  ), [allProjectSubtasks]);

  const completedThisWeekProjectSubtasks = useMemo(() => (
    allProjectSubtasks
      .filter(item => item.completed && isDateInCurrentWeek(item.completedAt))
      .sort((a, b) => (Date.parse(b.completedAt) || Date.parse(b.updatedAt) || Date.parse(b.createdAt) || 0) - (Date.parse(a.completedAt) || Date.parse(a.updatedAt) || Date.parse(a.createdAt) || 0))
  ), [allProjectSubtasks]);

  const recentlyCompletedProjectSubtasks = useMemo(() => (
    allProjectSubtasks
      .filter(item => item.completed && recentlyCompletedSubtaskKeys.has(getProjectSubtaskKey(item.taskId, item.id)))
      .sort((a, b) => (Date.parse(b.completedAt) || 0) - (Date.parse(a.completedAt) || 0))
  ), [allProjectSubtasks, recentlyCompletedSubtaskKeys]);

  const visibleOpenProjectSubtasks = useMemo(() => {
    if (showCompletedThisWeekSubtasks) {
      return openProjectSubtasks;
    }
    const recentExtra = recentlyCompletedProjectSubtasks.filter(
      r => !openProjectSubtasks.some(o => o.taskId === r.taskId && o.id === r.id)
    );
    return [...openProjectSubtasks, ...recentExtra];
  }, [openProjectSubtasks, recentlyCompletedProjectSubtasks, showCompletedThisWeekSubtasks]);

  const openProjectSubtasksCount = openProjectSubtasks.length;
  const completedThisWeekProjectSubtasksCount = completedThisWeekProjectSubtasks.length;

  const handleToggleProjectSubtask = async (taskId, subtaskId) => {
    const targetTask = tasks.find(task => task.id === taskId);
    if (!targetTask) return;

    const subtaskKey = getProjectSubtaskKey(taskId, subtaskId);
    let nextCompletedState = false;
    const nextSubtasks = normalizeProjectSubtasks(targetTask).map(subtask => {
      if (subtask.id !== subtaskId) return subtask;
      const completed = !subtask.completed;
      nextCompletedState = completed;
      return {
        ...subtask,
        completed,
        completedAt: completed ? (subtask.completedAt || new Date().toISOString()) : null
      };
    });

    try {
      const { updateTask } = await getStorageApi();
      await updateTask(taskId, { subtasks: nextSubtasks });
      applyTaskPatch(taskId, {
        subtasks: nextSubtasks,
        updatedAt: new Date().toISOString()
      });

      if (completedSubtaskTimers.current[subtaskKey]) {
        clearTimeout(completedSubtaskTimers.current[subtaskKey]);
        delete completedSubtaskTimers.current[subtaskKey];
      }

      if (nextCompletedState) {
        setRecentlyCompletedSubtaskKeys(prev => new Set(prev).add(subtaskKey));
        completedSubtaskTimers.current[subtaskKey] = setTimeout(() => {
          setRecentlyCompletedSubtaskKeys(prev => {
            const next = new Set(prev);
            next.delete(subtaskKey);
            return next;
          });
          delete completedSubtaskTimers.current[subtaskKey];
        }, COMPLETED_SUBTASK_VISIBILITY_MS);
      } else {
        setRecentlyCompletedSubtaskKeys(prev => {
          if (!prev.has(subtaskKey)) return prev;
          const next = new Set(prev);
          next.delete(subtaskKey);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to update project subtask from dashboard', err);
      alert('המשימה לא עודכנה. נסי שוב בעוד רגע.');
    }
  };

  const handleSort = (column) => {
    const nextDirection = sortMode === column
      ? (sortDirection === 'asc' ? 'desc' : 'asc')
      : (column === 'updatedAt' ? 'desc' : 'asc');
    setSortMode(column);
    setSortDirection(nextDirection);
    saveSortPreference(column, nextDirection);
  };

  const getAriaSort = (column) => {
    if (sortMode !== column) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortableHeader = (column, label) => (
    <th key={column} aria-sort={getAriaSort(column)}>
      <button
        type="button"
        className={`sortable-header ${sortMode === column ? 'active' : ''}`}
        onClick={() => handleSort(column)}
        title={`מיון לפי ${label}`}
      >
        <span>{label}</span>
        <span className="sort-indicator" aria-hidden="true">
          {sortMode === column ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );

  const handleStatusChange = async (taskId, newStatus) => {
    const changedAt = new Date().toISOString();
    const isCompleted = newStatus === 'אושר' || newStatus === 'אושר לספק' || newStatus === 'ארכיון';
    const targetTask = tasks.find(t => t.id === taskId);
    const completedAt = isCompleted ? (targetTask?.completedAt || changedAt) : null;

    const requestId = (statusChangeSeq.current[taskId] || 0) + 1;
    statusChangeSeq.current[taskId] = requestId;
    rememberPendingStatus(taskId, newStatus);
    setSavingStatusIds(prev => new Set(prev).add(taskId));

    try {
      const { updateTask } = await getStorageApi();
      await updateTask(taskId, { status: newStatus, completedAt });
      if (statusChangeSeq.current[taskId] !== requestId) return false;

      // Show the new value only after Firestore confirms the write.
      applyTaskPatch(taskId, { status: newStatus, completedAt, updatedAt: changedAt });
      clearPendingStatus(taskId, newStatus);
      return true;
    } catch (err) {
      if (statusChangeSeq.current[taskId] !== requestId) return false;
      console.error("Failed to update status", err);
      alert('שגיאה בעדכון הסטטוס. נסי שוב בעוד רגע.');
      return false;
    } finally {
      if (statusChangeSeq.current[taskId] === requestId) {
        setSavingStatusIds(prev => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    }
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (viewingTask) {
        // Edit mode
        const { updateTask, getTasks } = await getStorageApi();
        await updateTask(viewingTask.id, taskData);
        const allTasks = await getTasks(userId, organizationId);
        const updated = allTasks.find(t => t.id === viewingTask.id);
        setViewingTask(updated || null);
      } else {
        // Create mode
        const { createTask } = await getStorageApi();
        await createTask(taskData, userId, { organizationId });
        setIsCreateOpen(false);
      }
      await loadTasks();
    } catch (err) {
      console.error('Error saving task:', err);
      alert('שגיאה בשמירת הפרויקט: ' + (err?.message || 'אנא נסי שוב'));
    }
  };

  const handleCellClick = (task, e) => {
    // Check if click was on select, button, or links
    if (
      e.target.tagName === 'SELECT' ||
      e.target.tagName === 'BUTTON' ||
      e.target.closest('.actions-cell') ||
      e.target.closest('.badge') ||
      e.target.closest('.priority-badge') ||
      e.target.closest('a')
    ) {
      return;
    }
    setViewingTask(task);
  };

  const startEditingCell = (taskId, field, initialValue) => {
    setEditingCell({ taskId, field });
    setEditValue(initialValue || '');
  };

  const handleSaveCellInline = async (task, field, value) => {
    const trimmedVal = typeof value === 'string' ? value.trim() : value;

    // Check if the value hasn't changed
    const originalValue = (field === 'phone' || field === 'contactPhone')
      ? (() => {
          const contact = contactsByName.get((task.contactPerson || '').trim().toLowerCase());
          return task.phone || (contact ? contact.phone : '');
        })()
      : (field === 'email' || field === 'supplierContactEmail')
        ? (task.supplierContactEmail || (() => {
            const contact = contactsByName.get((task.contactPerson || '').trim().toLowerCase());
            return contact ? contact.email : '';
          })())
        : (task.customFields?.[field] ?? task[field]);

    if (trimmedVal === (originalValue || '') && typeof value === 'string') {
      setEditingCell({ taskId: null, field: null });
      return;
    }

    // Validation
    if (field === 'title' && !trimmedVal) {
      alert('שם הפרויקט הוא שדה חובה');
      return;
    }

    if ((field === 'email' || field === 'supplierContactEmail') && trimmedVal) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedVal)) {
        alert('כתובת אימייל לא תקינה');
        return;
      }
    }

    setIsSavingCell(true);
    try {
      const { updateTask, updateContact, addContact } = await getStorageApi();
      const isCustomField = field.startsWith('custom_') || (task.customFields && task.customFields[field] !== undefined);

      if (field === 'title' || field === 'contactPerson' || field === 'status' || field === 'diecutsStatus' || field === 'imagesStatus' || field === 'standardsInstituteRequired' || field === 'description' || field === 'internalNotes') {
        await updateTask(task.id, { [field]: trimmedVal });
        applyTaskPatch(task.id, { [field]: trimmedVal, updatedAt: new Date().toISOString() });
      } else if (field === 'email' || field === 'supplierContactEmail') {
        await updateTask(task.id, { supplierContactEmail: trimmedVal });
        applyTaskPatch(task.id, { supplierContactEmail: trimmedVal, updatedAt: new Date().toISOString() });
      } else if (field === 'phone' || field === 'contactPhone') {
        await updateTask(task.id, { phone: trimmedVal });
        applyTaskPatch(task.id, { phone: trimmedVal, updatedAt: new Date().toISOString() });
        if (task.contactPerson) {
          const contact = contactsByName.get(task.contactPerson.trim().toLowerCase());
          if (contact) {
            await updateContact(contact.id, { ...contact, phone: trimmedVal });
          } else if (trimmedVal) {
            await addContact({
              name: task.contactPerson.trim(),
              phone: trimmedVal,
              email: task.supplierContactEmail || '',
              role: '',
              address: '',
              wechat: '',
              notes: ''
            }, userId);
          }
        }
      } else if (isCustomField) {
        const updatedCustomFields = {
          ...(task.customFields || {}),
          [field]: trimmedVal
        };
        await updateTask(task.id, { customFields: updatedCustomFields });
        applyTaskPatch(task.id, { customFields: updatedCustomFields, updatedAt: new Date().toISOString() });
      } else {
        await updateTask(task.id, { [field]: trimmedVal });
        applyTaskPatch(task.id, { [field]: trimmedVal, updatedAt: new Date().toISOString() });
      }
      setEditingCell({ taskId: null, field: null });
    } catch (err) {
      console.error(`Failed to save cell for field ${field}`, err);
      alert('שגיאה בשמירת הנתונים. נסי שוב.');
    } finally {
      setIsSavingCell(false);
    }
  };

  const handleCellKeyDown = (e, task, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCellInline(task, field, editValue);
    } else if (e.key === 'Escape') {
      setEditingCell({ taskId: null, field: null });
    }
  };

  const handleDeleteTask = async (taskId) => {
    const { deleteTask } = await getStorageApi();
    await deleteTask(taskId);
    setDeletingTaskId(null);
    setViewingTask(null);
    await loadTasks();
    await loadTrash();
  };

  const handleRestoreTask = async (taskId) => {
    setRestoringTaskId(taskId);
    try {
      const { restoreTask } = await getStorageApi();
      await restoreTask(taskId);
      await Promise.all([loadTasks(), loadTrash()]);
    } catch (err) {
      console.error('Failed to restore task', err);
      alert('שגיאה בשחזור הפרויקט. נסי שוב בעוד רגע.');
    } finally {
      setRestoringTaskId(null);
    }
  };

  const handlePermanentlyDeleteTask = async (taskId) => {
    setPermanentlyDeletingTaskId(taskId);
    try {
      const { permanentlyDeleteTask } = await getStorageApi();
      await permanentlyDeleteTask(taskId);
      setPermanentDeleteTask(null);
      await loadTrash();
    } catch (err) {
      console.error('Failed to permanently delete task', err);
      alert('שגיאה במחיקת הפרויקט לצמיתות. נסי שוב בעוד רגע.');
    } finally {
      setPermanentlyDeletingTaskId(null);
    }
  };

  const handleEmptyTrash = async () => {
    setIsPurgingAllTrash(true);
    try {
      const { emptyTrash } = await getStorageApi();
      await emptyTrash(userId, organizationId);
      setIsEmptyTrashConfirmOpen(false);
      await loadTrash();
    } catch (err) {
      console.error('Failed to empty trash', err);
      alert('שגיאה בריקון פח האשפה. נסי שוב בעוד רגע.');
    } finally {
      setIsPurgingAllTrash(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const renderV2TableCell = (task, field, ctx) => {
    const isEditing = editingCell.taskId === task.id && editingCell.field === field.key;

    // 1. STATUS
    if (field.key === 'status') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <StatusPicker
            currentStatus={task.status}
            statuses={ctx.taskStatusConfig.statuses}
            statusColors={ctx.taskStatusConfig.statusColors}
            onChange={(newStatus) => handleStatusChange(task.id, newStatus)}
            disabled={savingStatusIds.has(task.id)}
          />
          {(task.status === 'אושר' || task.status === 'אושר לספק' || task.status === 'ארכיון' || task.completedAt) && (
            <div className="task-completed-date-badge">
              הושלם ב-{formatDate(task.completedAt || task.updatedAt)}
            </div>
          )}
        </div>
      );
    }

    // 2. CONTACT PERSON
    if (field.key === 'contactPerson') {
      if (isEditing) {
        return (
          <input
            type="text"
            className="form-control table-inline-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveCellInline(task, field.key, editValue)}
            onKeyDown={(e) => handleCellKeyDown(e, task, field.key)}
            list="contacts-list-table"
            autoFocus
            disabled={isSavingCell}
          />
        );
      }
      return ctx.currentContactPerson || '-';
    }

    // 3. SUPPLIER CONTACT EMAIL
    if (field.key === 'supplierContactEmail') {
      if (isEditing) {
        return (
          <input
            type="email"
            className="form-control table-inline-input direction-ltr text-left"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveCellInline(task, field.key, editValue)}
            onKeyDown={(e) => handleCellKeyDown(e, task, field.key)}
            autoFocus
            disabled={isSavingCell}
          />
        );
      }
      return ctx.email ? (
        <a
          href={`mailto:${ctx.email}`}
          className="direction-ltr"
          style={{ textDecoration: 'none', color: 'var(--primary)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctx.email}
        </a>
      ) : '-';
    }

    // 3.5. CONTACT PHONE
    if (field.key === 'contactPhone' || field.key === 'phone') {
      const contact = contactsByName.get((ctx.currentContactPerson || '').trim().toLowerCase());
      const phoneVal = task.phone || (contact ? contact.phone : '');
      if (isEditing) {
        return (
          <input
            type="tel"
            className="form-control table-inline-input direction-ltr text-left"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveCellInline(task, field.key, editValue)}
            onKeyDown={(e) => handleCellKeyDown(e, task, field.key)}
            autoFocus
            disabled={isSavingCell}
          />
        );
      }
      return phoneVal ? (
        <a
          href={`tel:${phoneVal.replace(/\s+/g, '')}`}
          className="directory-phone-link direction-ltr"
          style={{ textDecoration: 'none', color: 'var(--primary)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {phoneVal}
        </a>
      ) : '-';
    }

    // 4. DIECUTS STATUS / IMAGES STATUS
    if (field.key === 'diecutsStatus' || field.key === 'imagesStatus') {
      const currentVal = task[field.key] || 'אין';
      if (isEditing) {
        return (
          <select
            className="form-control table-inline-input"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              handleSaveCellInline(task, field.key, e.target.value);
            }}
            onBlur={() => handleSaveCellInline(task, field.key, editValue)}
            autoFocus
            disabled={isSavingCell}
          >
            {(field.options || ['אין', 'יש', 'חלקי']).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }
      const badgeClass = currentVal === 'יש' ? 'badge-completed' : currentVal === 'חלקי' ? 'badge-review' : 'badge-neutral';
      return (
        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.8rem', padding: '3px 8px' }}>
          {currentVal}
        </span>
      );
    }

    // 5. STANDARDS INSTITUTE REQUIRED
    if (field.key === 'standardsInstituteRequired') {
      const currentVal = task.standardsInstituteRequired || 'לא';
      if (isEditing) {
        return (
          <select
            className="form-control table-inline-input"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              handleSaveCellInline(task, field.key, e.target.value);
            }}
            onBlur={() => handleSaveCellInline(task, field.key, editValue)}
            autoFocus
            disabled={isSavingCell}
          >
            {(field.options || ['לא', 'כן']).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }
      const badgeClass = currentVal === 'כן' ? 'badge-in-progress' : 'badge-neutral';
      return (
        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.8rem', padding: '3px 8px' }}>
          {currentVal}
        </span>
      );
    }

    // 6. WORK ORDER FILES
    if (field.key === 'workOrderFiles') {
      const fileCount = Array.isArray(task.workOrderFiles) ? task.workOrderFiles.length : (task.workOrderFiles ? 1 : 0);
      return fileCount > 0 ? (
        <span className="badge badge-neutral" style={{ fontSize: '0.78rem' }}>
          📎 {fileCount} קבצים
        </span>
      ) : '-';
    }

    // 7. PLANOGRAM FILE
    if (field.key === 'planogramFile') {
      return (task.planogramFile || task.planogram) ? (
        <span className="badge badge-neutral" style={{ fontSize: '0.78rem' }}>
          🗺️ יש פלנוגרמה
        </span>
      ) : '-';
    }

    // 8. DESCRIPTION / INTERNAL NOTES
    if (field.key === 'description' || field.key === 'internalNotes') {
      const textVal = task[field.key] || '';
      if (isEditing) {
        return (
          <input
            type="text"
            className="form-control table-inline-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveCellInline(task, field.key, editValue)}
            onKeyDown={(e) => handleCellKeyDown(e, task, field.key)}
            autoFocus
            disabled={isSavingCell}
          />
        );
      }
      if (!textVal) return '-';
      return (
        <span title={textVal} style={{ cursor: 'pointer' }}>
          <LinkifiedText text={textVal} truncate={35} inline />
        </span>
      );
    }

    // 9. CUSTOM FIELDS
    const rawVal = task.customFields?.[field.key] ?? task[field.key];

    if (field.type === 'checkbox') {
      const isChecked = Boolean(rawVal === true || rawVal === 'true');
      return (
        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0 }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => handleSaveCellInline(task, field.key, e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
            disabled={isSavingCell}
          />
        </label>
      );
    }

    if (field.type === 'select') {
      const selectVal = rawVal || '';
      if (isEditing) {
        return (
          <select
            className="form-control table-inline-input"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              handleSaveCellInline(task, field.key, e.target.value);
            }}
            onBlur={() => handleSaveCellInline(task, field.key, editValue)}
            autoFocus
            disabled={isSavingCell}
          >
            <option value="">(ללא בחירה)</option>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }
      return selectVal ? (
        <span className="badge badge-neutral" style={{ fontSize: '0.8rem', padding: '3px 8px' }}>
          {selectVal}
        </span>
      ) : '-';
    }

    if (field.type === 'date') {
      const dateVal = rawVal || '';
      if (isEditing) {
        return (
          <input
            type="date"
            className="form-control table-inline-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveCellInline(task, field.key, editValue)}
            onKeyDown={(e) => handleCellKeyDown(e, task, field.key)}
            autoFocus
            disabled={isSavingCell}
          />
        );
      }
      return dateVal ? formatDate(dateVal) : '-';
    }

    if (field.type === 'number') {
      const numVal = rawVal !== undefined && rawVal !== null && rawVal !== '' ? rawVal : '';
      if (isEditing) {
        return (
          <input
            type="number"
            className="form-control table-inline-input direction-ltr text-left"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveCellInline(task, field.key, editValue)}
            onKeyDown={(e) => handleCellKeyDown(e, task, field.key)}
            autoFocus
            disabled={isSavingCell}
          />
        );
      }
      return numVal !== '' ? String(numVal) : '-';
    }

    // Default: text / textarea
    const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
    if (isEditing) {
      return (
        <input
          type="text"
          className="form-control table-inline-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleSaveCellInline(task, field.key, editValue)}
          onKeyDown={(e) => handleCellKeyDown(e, task, field.key)}
          autoFocus
          disabled={isSavingCell}
        />
      );
    }
    if (!strVal) return '-';
    return (
      <span title={strVal} style={{ cursor: 'pointer' }}>
        <LinkifiedText text={strVal} truncate={35} inline />
      </span>
    );
  };

  const renderDashboardSubtaskCard = (item) => {
    const isCompleted = Boolean(item.completed);
    const completedDateFormatted = isCompleted
      ? formatCompletedDate(item.completedAt || item.updatedAt || item.createdAt)
      : null;
    const fullDateTime = isCompleted
      ? formatFullDateTime(item.completedAt || item.updatedAt || item.createdAt)
      : null;

    return (
      <article
        className={`dashboard-subtask-item ${isCompleted ? 'completed' : ''}`}
        key={`${item.taskId}-${item.id}`}
      >
        <div className="dashboard-subtask-top">
          <label className="dashboard-subtask-main">
            <input
              type="checkbox"
              className="dashboard-subtask-checkbox"
              checked={isCompleted}
              onChange={() => handleToggleProjectSubtask(item.taskId, item.id)}
            />
            <span
              className={`dashboard-subtask-text ${isCompleted ? 'completed' : ''}`}
              title={item.text}
            >
              {item.text}
            </span>
          </label>
        </div>

        <div className="dashboard-subtask-meta">
          {isCompleted && completedDateFormatted && (
            <span
              className="dashboard-subtask-completed-date"
              title={fullDateTime ? `הושלם בתאריך: ${fullDateTime}` : `הושלם השבוע`}
            >
              <span className="subtask-check-icon" aria-hidden="true">✓</span>
              <span>הושלם {completedDateFormatted}</span>
            </span>
          )}

          <button
            type="button"
            className="dashboard-subtask-project"
            onClick={() => {
              const project = tasks.find(task => task.id === item.taskId);
              if (project) {
                if (project.boardId) {
                  setWorkspaceView(project.boardId);
                } else {
                  setWorkspaceView('active');
                }
                setViewingTask(project);
              }
            }}
            title={`פתיחת הפרויקט: ${item.projectTitle}`}
          >
            <span className="subtask-chip-icon" aria-hidden="true">📁</span>
            <span className="subtask-chip-text">{item.projectTitle}</span>
          </button>

          {flags.isV2 && item.boardName && (
            <button
              type="button"
              className="dashboard-subtask-board-badge"
              onClick={(e) => {
                e.stopPropagation();
                setWorkspaceView(item.boardId);
                setFilterSubtasksBySelectedBoard(true);
              }}
              title={`מעבר ללוח ${item.boardName} וסינון לפיו`}
            >
              <span className="subtask-chip-icon" aria-hidden="true">{item.boardIcon}</span>
              <span className="subtask-chip-text">{item.boardName}</span>
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <main className="dashboard-container">

      {/* Upper Actions Panel */}
      <div className="flex-between" style={{ marginBottom: '24px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, marginInlineEnd: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, lineHeight: 1.2 }}>{currentBoardName}</h2>
          {flags.isV2 && workspaceView !== 'trash' && (
            <div className="board-subtitle-container">
              {isEditingBoardSubtitle ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="form-control board-subtitle-input"
                    value={boardSubtitleValue}
                    onChange={(e) => setBoardSubtitleValue(e.target.value)}
                    onBlur={() => handleSaveBoardSubtitle(boardSubtitleValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveBoardSubtitle(boardSubtitleValue);
                      } else if (e.key === 'Escape') {
                        cancelEditingBoardSubtitle();
                      }
                    }}
                    placeholder="הזן תת-כותרת או קישור ללוח..."
                    autoFocus
                    disabled={isSavingBoardSubtitle}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ padding: '4px 10px', height: '32px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSaveBoardSubtitle(boardSubtitleValue);
                    }}
                    disabled={isSavingBoardSubtitle}
                    title="שמור תת-כותרת (Enter)"
                  >
                    {isSavingBoardSubtitle ? 'שומר...' : 'שמור'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', height: '32px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      cancelEditingBoardSubtitle();
                    }}
                    disabled={isSavingBoardSubtitle}
                    title="ביטול (Esc)"
                  >
                    ביטול
                  </button>
                </div>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
                  <div
                    className="board-subtitle-wrapper editable-cell"
                    onClick={() => startEditingBoardSubtitle()}
                    title="לחץ לעריכת תת-הכותרת"
                  >
                    {currentBoardSubtitle ? (
                      <LinkifiedText text={currentBoardSubtitle} />
                    ) : (
                      <span className="board-subtitle-placeholder">
                        ➕ הוספת תת-כותרת או קישור ללוח...
                      </span>
                    )}
                  </div>
                  {Boolean(currentBoardSubtitle) && (
                    <button
                      type="button"
                      className="btn-board-subtitle-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingBoardSubtitle();
                      }}
                      title="עריכת תת-כותרת"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {flags.isLegacy && workspaceView !== 'trash' && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setViewingTask(null);
              setStartInEditMode(false);
              setIsCreateOpen(true);
            }}
          >
            ➕ {flags.terms.createItem}
          </button>
        )}
      </div>

      <div className="workspace-view-switcher" role="tablist" aria-label={`בחירת תצוגת ${flags.terms.items}`}>
        <div className="workspace-boards-tabs-group">
          {/* Unified Ordered Boards Tabs */}
          {orderedBoards.map((board, index) => {
            const isDefault = board.id === 'active';
            const isShared = isBoardSharedWithOrg(settings, board.id);
            const count = isDefault
              ? activeBoardTasksCount
              : tasks.filter(t => t.boardId === board.id && isTaskVisibleOnBoard(t, board.id)).length;
            const isActive = workspaceView === board.id;
            const boardName = isDefault ? defaultBoardName : board.name;
            const boardIcon = isDefault ? defaultBoardIcon : (board.icon || '📁');
            const canDrag = Boolean(flags.enableCustomBoards && orderedBoards.length > 1);
            const isDragging = draggedBoardId === board.id;
            const isDragOver = dragOverBoardId === board.id;

            return (
              <div
                key={board.id}
                className={`workspace-board-tab-item ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
                draggable={canDrag}
                onDragStart={(e) => handleDragStart(e, board.id)}
                onDragOver={(e) => handleDragOver(e, board.id)}
                onDragLeave={(e) => handleDragLeave(e, board.id)}
                onDrop={(e) => handleDrop(e, board.id)}
                onDragEnd={handleDragEnd}
                title={canDrag ? 'ניתן לגרור לשינוי סדר הלוחות' : undefined}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`workspace-view-button ${isActive ? 'active' : ''}`}
                  onClick={() => setWorkspaceView(board.id)}
                >
                  {canDrag && (
                    <span className="board-drag-handle" title="גרירה לשינוי סדר" aria-hidden="true">
                      ⋮⋮
                    </span>
                  )}
                  <span className="workspace-tab-label">
                    {boardIcon} {boardName}
                    <span
                      className="workspace-share-indicator"
                      title={isShared ? 'משותף עם כל חברי הארגון' : 'לוח פרטי'}
                      style={{ fontSize: '0.8rem', opacity: 0.75, marginInlineStart: '4px' }}
                    >
                      {isShared ? '🌐' : '🔒'}
                    </span>
                  </span>
                  <span className="workspace-view-count">{count}</span>
                  {flags.enableCustomBoards && (
                    <span
                      role="button"
                      tabIndex={0}
                      className="workspace-board-settings-trigger"
                      title="אפשרויות לוח"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBoardMenuId(activeBoardMenuId === board.id ? null : board.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          e.preventDefault();
                          setActiveBoardMenuId(activeBoardMenuId === board.id ? null : board.id);
                        }
                      }}
                    >
                      ⚙️
                    </span>
                  )}
                </button>

                {flags.enableCustomBoards && activeBoardMenuId === board.id && (
                  <div className="workspace-board-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="workspace-board-dropdown-item"
                      onClick={() => handleToggleBoardSharing(board.id)}
                    >
                      {isShared ? '🔒 הפוך ללוח פרטי' : '🌐 שתף פרויקטים עם הארגון'}
                    </button>
                    <button
                      type="button"
                      className="workspace-board-dropdown-item"
                      onClick={() => {
                        setActiveBoardMenuId(null);
                        setEditingBoard({
                          id: board.id,
                          name: boardName,
                          icon: boardIcon,
                          subtitle: isDefault ? (settings?.boardSubtitle || '') : (board.subtitle || ''),
                          isSharedWithOrg: isShared,
                          sharedEmails: isDefault ? (Array.isArray(settings?.activeBoardSharedEmails) ? settings.activeBoardSharedEmails : []) : (Array.isArray(board.sharedEmails) ? board.sharedEmails : []),
                          createdBy: isDefault ? (settings?.activeBoardCreatedBy || '') : (board.createdBy || ''),
                          creatorEmail: isDefault ? (settings?.activeBoardCreatorEmail || '') : (board.creatorEmail || '')
                        });
                        setEditingBoardEmailInput('');
                      }}
                    >
                      ✏️ {isDefault ? 'עריכת לוח' : 'עריכת שם ואייקון'}
                    </button>
                    {isDefault ? (
                      <button
                        type="button"
                        className="workspace-board-dropdown-item"
                        onClick={() => {
                          setActiveBoardMenuId(null);
                          onNavigate('settings');
                        }}
                      >
                        🔄 ניהול סטטוסים
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="workspace-board-dropdown-item danger"
                        onClick={() => handleDeleteBoard(board.id)}
                      >
                        🗑️ מחיקת לוח
                      </button>
                    )}

                    {orderedBoards.length > 1 && (
                      <>
                        <div className="workspace-board-dropdown-divider" />
                        {index > 0 && (
                          <button
                            type="button"
                            className="workspace-board-dropdown-item"
                            onClick={() => handleMoveBoard(index, index - 1)}
                          >
                            ➡️ הזז ימינה
                          </button>
                        )}
                        {index < orderedBoards.length - 1 && (
                          <button
                            type="button"
                            className="workspace-board-dropdown-item"
                            onClick={() => handleMoveBoard(index, index + 1)}
                          >
                            ⬅️ הזז שמאלה
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Board Button (v2 only) */}
          {flags.enableCustomBoards && (
            <button
              type="button"
              className="workspace-add-board-button"
              onClick={() => {
                setNewBoardName('');
                setNewBoardIcon('📁');
                setNewBoardIsShared(true);
                setIsAddBoardModalOpen(true);
              }}
              title="יצירת לוח חדש"
            >
              ➕ לוח חדש
            </button>
          )}
        </div>

        {/* Trash Tab - Always pinned at the far end */}
        <button
          type="button"
          role="tab"
          aria-selected={workspaceView === 'trash'}
          className={`workspace-view-button workspace-view-trash-button ${workspaceView === 'trash' ? 'active' : ''}`}
          onClick={() => setWorkspaceView('trash')}
        >
          <span className="workspace-tab-label">🗑️ פח אשפה</span>
          <span className="workspace-view-count">{trashedTasks.length}</span>
        </button>
      </div>

      {workspaceView === 'trash' ? (
        <section className="trash-panel" aria-labelledby="trash-title">
          <div className="trash-panel-header">
            <div>
              <h3 id="trash-title">פח אשפה</h3>
              <p>{flags.terms.items} שנמחקו נשמרים כאן למשך 30 יום וניתנים לשחזור או למחיקה לצמיתות.</p>
            </div>
            {trashedTasks.length > 0 && (
              <button
                type="button"
                className="btn btn-danger"
                style={{ backgroundColor: 'transparent', border: '1px solid var(--color-needs-revision)', color: 'var(--color-needs-revision)' }}
                disabled={isPurgingAllTrash || Boolean(permanentlyDeletingTaskId) || Boolean(restoringTaskId)}
                onClick={() => setIsEmptyTrashConfirmOpen(true)}
              >
                {isPurgingAllTrash ? 'מרוקן פח...' : '🗑️ ריקון פח האשפה'}
              </button>
            )}
          </div>

          {trashedTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗑️</div>
              <div className="empty-state-title">פח האשפה ריק</div>
              <div className="empty-state-text">{flags.terms.items} שתמחקי יופיעו כאן למשך 30 יום.</div>
            </div>
          ) : (
            <div className="trash-list">
              {trashedTasks.map(task => {
                const daysRemaining = task.daysRemaining;
                const isBusy = restoringTaskId === task.id || permanentlyDeletingTaskId === task.id || isPurgingAllTrash;
                return (
                  <article className="trash-item" key={task.id}>
                    <div className="trash-item-main">
                      <h4>{task.title}</h4>
                      <div className="trash-item-meta">
                        <span>{task.jobNumber || `ללא מספר ${flags.terms.item}`}</span>
                        <span>נמחק ב־{formatDate(task.deletedAt)}</span>
                        <span className={daysRemaining <= 3 ? 'trash-expiry urgent' : 'trash-expiry'}>
                          {daysRemaining === 0 ? 'יימחק לצמיתות היום' : `יימחק לצמיתות בעוד ${daysRemaining} ימים`}
                        </span>
                      </div>
                    </div>
                    <div className="trash-item-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={isBusy}
                        onClick={() => handleRestoreTask(task.id)}
                      >
                        {restoringTaskId === task.id ? 'משחזר...' : `↩ שחזור ${flags.terms.item}`}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={isBusy}
                        onClick={() => setPermanentDeleteTask(task)}
                      >
                        {permanentlyDeletingTaskId === task.id ? 'מוחק...' : '🗑️ מחיקה לצמיתות'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
      <>

      {/* Status Filter Chips */}
      <div className="status-chips-container">
        <button
          type="button"
          className={`status-chip ${statusFilter === '' ? 'active' : ''}`}
          onClick={() => setStatusFilter('')}
        >
          הכל <span className="chip-count">{activeTasksCount}</span>
        </button>
        {STATUSES.map(st => {
          const count = statusCounts.get(st) || 0;
          return (
            <button
              key={st}
              type="button"
              className={`status-chip ${statusFilter === st ? 'active' : ''} ${count === 0 ? 'empty' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st} <span className="chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Panel */}
      <div className="filter-panel">
        <div className="admin-filter-controls">
          {/* Search input */}
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '280px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>חיפוש חופשי</label>
            <input
              type="text"
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '190px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>מיון</label>
            <select
              className="form-control"
              value={sortMode}
              onChange={(e) => {
                const mode = e.target.value;
                const direction = mode === 'updatedAt' ? 'desc' : 'asc';
                setSortMode(mode);
                setSortDirection(direction);
                saveSortPreference(mode, direction);
              }}
            >
              <option value="manual">סדר קבוע</option>
              <option value="updatedAt">עודכן לאחרונה</option>
              <option value="status">לפי סטטוס</option>
              <option value="title">שם ה{flags.terms.item}</option>
              <option value="contactPerson">{contactPersonLabel}</option>
            </select>
          </div>
        </div>

        {/* Filter Summary and Clear Trigger */}
        <div className="filter-summary" style={{ marginTop: '16px' }}>
          <div>
            מציג <span className="filter-badge-info">{filteredTasks.length}</span> מתוך <span className="filter-badge-info">{currentBoardTasks.length}</span> {flags.terms.items} בסך הכל
          </div>
          {(searchQuery || statusFilter || sortMode !== 'manual') && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setSortMode('manual');
                setSortDirection('asc');
                saveSortPreference('manual', 'asc');
              }}
              style={{ fontSize: '0.8rem', padding: '4px 10px', height: 'auto' }}
            >
              ❌ נקה מסננים
            </button>
          )}
        </div>
      </div>

      <section className="dashboard-subtasks-overview" aria-labelledby="dashboard-subtasks-title">
        <div className="dashboard-subtasks-header">
          <div>
            <h3 id="dashboard-subtasks-title">
              {openProjectSubtasksCount === 0 && showCompletedThisWeekSubtasks && completedThisWeekProjectSubtasksCount > 0
                ? 'משימות שהושלמו השבוע 🎉'
                : openProjectSubtasksCount === 0
                  ? 'משימות בפרויקטים'
                  : showCompletedThisWeekSubtasks && completedThisWeekProjectSubtasksCount > 0
                    ? 'משימות בפרויקטים'
                    : 'משימות פתוחות'}
            </h3>
            <p>
              {openProjectSubtasksCount === 0 && showCompletedThisWeekSubtasks && completedThisWeekProjectSubtasksCount > 0
                ? `כל המשימות הפתוחות הושלמו! מציג ${completedThisWeekProjectSubtasksCount} משימות שהושלמו השבוע${flags.isV2 ? (filterSubtasksBySelectedBoard ? ` (${currentBoardName})` : ' (מכל הלוחות)') : ''}`
                : openProjectSubtasksCount === 0
                  ? (filterSubtasksBySelectedBoard ? `אין משימות פתוחות בלוח ${currentBoardName}` : 'אין משימות פתוחות כרגע')
                  : showCompletedThisWeekSubtasks && completedThisWeekProjectSubtasksCount > 0
                    ? `${openProjectSubtasksCount} פתוחות לביצוע, ${completedThisWeekProjectSubtasksCount} הושלמו השבוע${flags.isV2 ? (filterSubtasksBySelectedBoard ? ` (${currentBoardName})` : ' (מכל הלוחות)') : ''}`
                    : `${openProjectSubtasksCount} משימות פתוחות לביצוע${flags.isV2 ? (filterSubtasksBySelectedBoard ? ` (${currentBoardName})` : ' (מכל הלוחות)') : ''}`}
            </p>
          </div>
          <div className="dashboard-subtasks-actions">
            {flags.isV2 && workspaceView !== 'trash' && (
              <button
                type="button"
                className={`dashboard-subtasks-toggle dashboard-subtasks-board-filter ${filterSubtasksBySelectedBoard ? 'active' : ''}`}
                onClick={() => setFilterSubtasksBySelectedBoard(prev => !prev)}
                aria-pressed={filterSubtasksBySelectedBoard}
                title={filterSubtasksBySelectedBoard ? 'הצגת משימות מכל הלוחות' : `סינון משימות לפי הלוח הנבחר: ${currentBoardName}`}
              >
                <span>
                  {filterSubtasksBySelectedBoard ? (
                    <>📌 מסונן לפי: <strong>{currentBoardName}</strong></>
                  ) : (
                    <>🔍 סינון לפי הלוח הנבחר (<strong>{currentBoardName}</strong>)</>
                  )}
                </span>
                {filterSubtasksBySelectedBoard && (
                  <span className="dashboard-subtasks-toggle-clear" title="בטל סינון והצג מכל הלוחות" aria-hidden="true">✕</span>
                )}
              </button>
            )}

            {completedThisWeekProjectSubtasksCount > 0 && (
              <button
                type="button"
                className={`dashboard-subtasks-toggle ${showCompletedThisWeekSubtasks ? 'active' : ''}`}
                onClick={() => setShowCompletedThisWeekSubtasks(prev => !prev)}
                aria-pressed={showCompletedThisWeekSubtasks}
              >
                <span>{showCompletedThisWeekSubtasks ? 'הסתרת משימות שהושלמו השבוע' : 'הצגת משימות שהושלמו השבוע'}</span>
                <span className="dashboard-subtasks-toggle-count">{completedThisWeekProjectSubtasksCount}</span>
              </button>
            )}
          </div>
        </div>

        {openProjectSubtasksCount === 0 && (!showCompletedThisWeekSubtasks || completedThisWeekProjectSubtasksCount === 0) ? (
          <div className="dashboard-subtasks-empty">
            {filterSubtasksBySelectedBoard ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span>אין משימות פתוחות בלוח "{currentBoardName}".</span>
                {completedThisWeekProjectSubtasksCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                    onClick={() => setShowCompletedThisWeekSubtasks(true)}
                  >
                    🎉 הצגת {completedThisWeekProjectSubtasksCount} משימות שהושלמו השבוע
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  onClick={() => setFilterSubtasksBySelectedBoard(false)}
                >
                  🌐 הצג משימות מכל הלוחות
                </button>
              </div>
            ) : allProjectSubtasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span>כל המשימות בפרויקטים סומנו כבוצעו! 🎉</span>
                {completedThisWeekProjectSubtasksCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                    onClick={() => setShowCompletedThisWeekSubtasks(true)}
                  >
                    צפייה ב-{completedThisWeekProjectSubtasksCount} משימות שהושלמו השבוע
                  </button>
                )}
              </div>
            ) : (
              'הוסיפי משימות מתוך אזור הערות ועדכוני פרויקט, והן יופיעו כאן.'
            )}
          </div>
        ) : (
          <div className="dashboard-subtasks-content">
            {/* Open tasks group (if any) */}
            {visibleOpenProjectSubtasks.length > 0 && (
              <div className="dashboard-subtasks-group">
                {showCompletedThisWeekSubtasks && completedThisWeekProjectSubtasksCount > 0 && (
                  <div className="dashboard-subtasks-group-header">
                    <span className="dashboard-subtasks-group-title">
                      📌 משימות פתוחות לביצוע ({openProjectSubtasksCount})
                    </span>
                  </div>
                )}
                <div className="dashboard-subtasks-list">
                  {visibleOpenProjectSubtasks.map(renderDashboardSubtaskCard)}
                </div>
              </div>
            )}

            {/* If 0 open tasks and showing completed tasks (matches user's screenshot), show celebratory banner */}
            {openProjectSubtasksCount === 0 && showCompletedThisWeekSubtasks && completedThisWeekProjectSubtasksCount > 0 && (
              <div className="dashboard-subtasks-completed-banner">
                <div className="completed-banner-icon">🎉</div>
                <div className="completed-banner-content">
                  <div className="completed-banner-title">כל המשימות הפתוחות הושלמו!</div>
                  <div className="completed-banner-subtitle">
                    מעולה! כל הכבוד על ההספק השבוע. להלן {completedThisWeekProjectSubtasksCount} משימות שהושלמו:
                  </div>
                </div>
              </div>
            )}

            {/* Completed tasks this week group */}
            {showCompletedThisWeekSubtasks && completedThisWeekProjectSubtasks.length > 0 && (
              <div className="dashboard-subtasks-group dashboard-subtasks-group-completed">
                {visibleOpenProjectSubtasks.length > 0 && (
                  <div className="dashboard-subtasks-group-header">
                    <span className="dashboard-subtasks-group-title completed">
                      ✅ הושלמו השבוע ({completedThisWeekProjectSubtasksCount})
                    </span>
                  </div>
                )}
                <div className="dashboard-subtasks-list">
                  {completedThisWeekProjectSubtasks.map(renderDashboardSubtaskCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Empty State */}
      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <div className="empty-state-title">אין פרויקטים במערכת עדיין</div>
          <div className="empty-state-text">לחצי על הכפתור למטה כדי ליצור את פרויקט הגרפיקה הראשון במערכת!</div>
          <button
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => {
              setViewingTask(null);
              setStartInEditMode(false);
              setIsCreateOpen(true);
            }}
          >
            ➕ יצירת הפרויקט הראשון
          </button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">לא נמצאו פרויקטים מתאימים</div>
          <div className="empty-state-text">נסו לשנות או לאפס את תנאי הסינון כדי לראות את שאר המשימות.</div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '16px' }}
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('');
            }}
          >
            איפוס כל המסננים
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-container">
            <table className="task-table">
              <thead>
                {flags.isLegacy ? (
                  <tr>
                    {renderSortableHeader('title', 'שם הפרויקט')}
                    {isContactPersonEnabled && renderSortableHeader('contactPerson', contactPersonLabel)}
                    {isContactPhoneEnabled && <th>{contactPhoneLabel}</th>}
                    {isSupplierContactEmailEnabled && <th>{supplierContactEmailLabel}</th>}
                    {renderSortableHeader('status', 'סטטוס')}
                    {renderSortableHeader('updatedAt', 'עודכן ב')}
                    <th>פעולות</th>
                  </tr>
                ) : (
                  <tr>
                    {renderSortableHeader('title', `שם ה${flags.terms.item}`)}
                    {projectFields.map(field => {
                      const displayLabel = field.icon ? `${field.icon} ${field.label}` : field.label;
                      if (field.type === 'file') {
                        return <th key={field.key}>{displayLabel}</th>;
                      }
                      return renderSortableHeader(field.key, displayLabel);
                    })}
                    {renderSortableHeader('updatedAt', 'עודכן ב')}
                    <th>פעולות</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredTasks.map(task => {
                  const currentContactPerson = task.contactPerson || task.supplierContactName || '';
                  const currentPlanogram = task.planogramFile || task.planogram;
                  const currentWorkOrder = hasWorkOrder(task);
                  const contact = contactsByName.get(currentContactPerson.trim().toLowerCase());
                  const phone = contact ? contact.phone : '';
                  const email = task.supplierContactEmail || task.contactEmail || task.email || (contact ? contact.email : '');
                  const taskStatusConfig = getBoardStatusConfig(settings, task.boardId);

                  if (flags.isLegacy) {
                    return (
                      <tr key={task.id} onClick={(e) => handleCellClick(task, e)}>
                        <td style={{ fontWeight: '600' }}>
                          <span className="task-title-with-indicator">
                            <span>{task.title}</span>
                            {(Boolean(currentWorkOrder) || Boolean(currentPlanogram)) && (
                              <span className="task-indicators-stack">
                                {currentWorkOrder && <WorkOrderIndicator />}
                                {currentPlanogram && <PlanogramIndicator />}
                              </span>
                            )}
                          </span>
                        </td>
                        {isContactPersonEnabled && (
                          <td
                            className={editingCell.taskId === task.id && editingCell.field === 'contactPerson' ? '' : 'editable-cell'}
                            onClick={(e) => {
                              if (editingCell.taskId === task.id && editingCell.field === 'contactPerson') return;
                              e.stopPropagation();
                              startEditingCell(task.id, 'contactPerson', currentContactPerson);
                            }}
                          >
                            {editingCell.taskId === task.id && editingCell.field === 'contactPerson' ? (
                              <input
                                type="text"
                                className="form-control table-inline-input"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveCellInline(task, 'contactPerson', editValue)}
                                onKeyDown={(e) => handleCellKeyDown(e, task, 'contactPerson')}
                                list="contacts-list-table"
                                autoFocus
                                disabled={isSavingCell}
                              />
                            ) : (
                              currentContactPerson || '-'
                            )}
                          </td>
                        )}
                        {isContactPhoneEnabled && (
                          <td
                            className={editingCell.taskId === task.id && editingCell.field === 'phone' ? '' : 'editable-cell'}
                            onClick={(e) => {
                              if (editingCell.taskId === task.id && editingCell.field === 'phone') return;
                              e.stopPropagation();
                              if (!currentContactPerson) {
                                alert('יש להגדיר איש קשר לפני עדכון מספר טלפון');
                                return;
                              }
                              startEditingCell(task.id, 'phone', phone);
                            }}
                          >
                            {editingCell.taskId === task.id && editingCell.field === 'phone' ? (
                              <input
                                type="text"
                                className="form-control table-inline-input direction-ltr text-left"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveCellInline(task, 'phone', editValue)}
                                onKeyDown={(e) => handleCellKeyDown(e, task, 'phone')}
                                autoFocus
                                disabled={isSavingCell}
                              />
                            ) : (
                              phone ? (
                                <a
                                  href={`tel:${phone.replace(/\s+/g, '')}`}
                                  className="directory-phone-link direction-ltr"
                                  style={{ textDecoration: 'none', color: 'var(--primary)' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {phone}
                                </a>
                              ) : '-'
                            )}
                          </td>
                        )}
                        {isSupplierContactEmailEnabled && (
                          <td
                            className={editingCell.taskId === task.id && editingCell.field === 'email' ? '' : 'editable-cell'}
                            onClick={(e) => {
                              if (editingCell.taskId === task.id && editingCell.field === 'email') return;
                              e.stopPropagation();
                              startEditingCell(task.id, 'email', email);
                            }}
                          >
                            {editingCell.taskId === task.id && editingCell.field === 'email' ? (
                              <input
                                type="email"
                                className="form-control table-inline-input direction-ltr text-left"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveCellInline(task, 'email', editValue)}
                                onKeyDown={(e) => handleCellKeyDown(e, task, 'email')}
                                autoFocus
                                disabled={isSavingCell}
                              />
                            ) : (
                              email ? (
                                <a
                                  href={`mailto:${email}`}
                                  className="direction-ltr"
                                  style={{ textDecoration: 'none', color: 'var(--primary)' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {email}
                                </a>
                              ) : '-'
                            )}
                          </td>
                        )}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <StatusPicker
                              currentStatus={task.status}
                              statuses={taskStatusConfig.statuses}
                              statusColors={taskStatusConfig.statusColors}
                              onChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                              disabled={savingStatusIds.has(task.id)}
                            />
                            {(task.status === 'אושר' || task.status === 'אושר לספק' || task.status === 'ארכיון' || task.completedAt) && (
                              <div className="task-completed-date-badge">
                                הושלם ב-{formatDate(task.completedAt || task.updatedAt)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{formatDate(task.updatedAt)}</td>
                        <td>
                          <div className="actions-cell">
                            <button
                              className="btn btn-secondary btn-icon"
                              title="צפייה בפרטים"
                              onClick={() => setViewingTask(task)}
                            >
                              👁️
                            </button>
                            <button
                              className="btn btn-danger btn-icon"
                              title="מחיקת משימה"
                              onClick={() => setDeletingTaskId(task.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // V2 Row - Dynamically render cells based on projectFields
                  return (
                    <tr key={task.id} onClick={(e) => handleCellClick(task, e)}>
                      <td style={{ fontWeight: '600' }}>
                        <span className="task-title-with-indicator">
                          <span>{task.title}</span>
                          {Boolean(currentPlanogram) && (
                            <span className="task-indicators-stack">
                              <PlanogramIndicator />
                            </span>
                          )}
                        </span>
                      </td>

                      {projectFields.map(field => {
                        const isNonEditableCell = field.key === 'status' || field.type === 'file' || field.type === 'checkbox';
                        const isEditingThisField = editingCell.taskId === task.id && editingCell.field === field.key;
                        return (
                          <td
                            key={field.key}
                            className={isNonEditableCell || isEditingThisField ? '' : 'editable-cell'}
                            onClick={(e) => {
                              if (isNonEditableCell || isEditingThisField) return;
                              e.stopPropagation();
                              const val = getTaskFieldValue(task, field.key);
                              startEditingCell(task.id, field.key, val);
                            }}
                          >
                            {renderV2TableCell(task, field, {
                              currentContactPerson,
                              email,
                              currentPlanogram,
                              currentWorkOrder,
                              taskStatusConfig
                            })}
                          </td>
                        );
                      })}

                      <td>{formatDate(task.updatedAt)}</td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn btn-secondary btn-icon"
                            title={`צפייה בפרטי ה${flags.terms.item}`}
                            onClick={() => setViewingTask(task)}
                          >
                            👁️
                          </button>
                          <button
                            className="btn btn-danger btn-icon"
                            title={`מחיקת ${flags.terms.item}`}
                            onClick={() => setDeletingTaskId(task.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <datalist id="contacts-list-table">
            {Array.from(new Set([
              ...(newTaskFields.contactPerson?.options || []),
              ...contacts.map(c => typeof c === 'string' ? c : c.name)
            ])).map(name => {
              const contactObj = contacts.find(c => (typeof c === 'string' ? c : c.name) === name);
              const role = contactObj && typeof contactObj !== 'string' ? contactObj.role : '';
              const phone = contactObj && typeof contactObj !== 'string' ? contactObj.phone : '';
              return (
                <option key={name} value={name}>
                  {role ? `${role} ${phone ? `(${phone})` : ''}` : ''}
                </option>
              );
            })}
          </datalist>

          {/* Mobile Cards View */}
          <div className="mobile-cards-grid">
            {filteredTasks.map(task => {
              const currentContactPerson = task.contactPerson || task.supplierContactName || '';
              const currentPlanogram = task.planogramFile || task.planogram;
              const currentWorkOrder = hasWorkOrder(task);
              const contact = contactsByName.get(currentContactPerson.trim().toLowerCase());
              const phone = contact ? contact.phone : '';
              const email = task.supplierContactEmail || task.contactEmail || task.email || (contact ? contact.email : '');
              const taskStatusConfig = getBoardStatusConfig(settings, task.boardId);

              return (
                <div key={task.id} className="task-card" onClick={(e) => handleCellClick(task, e)}>
                  <div className="task-card-header">
                    <div>
                      <h4 className="task-card-title">
                        <span className="task-title-with-indicator">
                          <span>{task.title}</span>
                          {(Boolean(flags.isLegacy && currentWorkOrder) || Boolean(currentPlanogram)) && (
                            <span className="task-indicators-stack">
                              {flags.isLegacy && currentWorkOrder && <WorkOrderIndicator compact />}
                              {currentPlanogram && <PlanogramIndicator compact />}
                            </span>
                          )}
                        </span>
                      </h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <StatusPicker
                        currentStatus={task.status}
                        statuses={taskStatusConfig.statuses}
                        statusColors={taskStatusConfig.statusColors}
                        onChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                        disabled={savingStatusIds.has(task.id)}
                      />
                      {(task.status === 'אושר' || task.status === 'אושר לספק' || task.status === 'ארכיון' || task.completedAt) && (
                        <div className="task-completed-date-badge">
                          הושלם ב-{formatDate(task.completedAt || task.updatedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="task-card-meta">
                    {flags.isLegacy ? (
                      <>
                        <div className="meta-item">
                          <span className="meta-label">איש קשר</span>
                          <span className="meta-value">{currentContactPerson || '-'}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">עודכן ב</span>
                          <span className="meta-value">{formatDate(task.updatedAt)}</span>
                        </div>
                        {(task.status === 'אושר' || task.status === 'אושר לספק' || task.status === 'ארכיון' || task.completedAt) && (
                          <div className="meta-item">
                            <span className="meta-label">תאריך השלמה</span>
                            <span className="meta-value completed-date-highlight">{formatDate(task.completedAt || task.updatedAt)}</span>
                          </div>
                        )}
                        <div className="meta-item">
                          <span className="meta-label">טלפון</span>
                          <span className="meta-value">
                            {phone ? <a className="directory-phone-link direction-ltr" href={`tel:${phone.replace(/\s+/g, '')}`} onClick={(e) => e.stopPropagation()}>{phone}</a> : '-'}
                          </span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">אימייל</span>
                          <span className="meta-value">
                            {email ? <a className="direction-ltr mobile-email-link" href={`mailto:${email}`} onClick={(e) => e.stopPropagation()}>{email}</a> : '-'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {projectFields.filter(f => f.key !== 'status').map(field => (
                          <div key={field.key} className="meta-item">
                            <span className="meta-label">{field.label}</span>
                            <span className="meta-value">
                              {renderV2TableCell(task, field, {
                                currentContactPerson,
                                email,
                                currentPlanogram,
                                currentWorkOrder,
                                taskStatusConfig
                              })}
                            </span>
                          </div>
                        ))}
                        <div className="meta-item">
                          <span className="meta-label">עודכן ב</span>
                          <span className="meta-value">{formatDate(task.updatedAt)}</span>
                        </div>
                        {(task.status === 'אושר' || task.status === 'אושר לספק' || task.status === 'ארכיון' || task.completedAt) && (
                          <div className="meta-item">
                            <span className="meta-label">תאריך השלמה</span>
                            <span className="meta-value completed-date-highlight">{formatDate(task.completedAt || task.updatedAt)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="task-card-actions">
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '8px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingTask(task);
                      }}
                    >
                      פרטים
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '8px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingTaskId(task.id);
                      }}
                    >
                      מחק
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Unified Task details/edit/create Modal */}
      {(viewingTask || isCreateOpen) && (
        <Suspense fallback={null}>
          <AdminDetailsModal
            task={viewingTask}
            settings={settings}
            suppliers={suppliers}
            contacts={contacts}
            onSaveSettings={onSaveSettings}
            startInEditMode={startInEditMode}
            initialBoardId={workspaceView === 'trash' ? 'active' : workspaceView}
            onClose={() => {
              setViewingTask(null);
              setIsCreateOpen(false);
              setStartInEditMode(false);
            }}
            onSave={handleSaveTask}
            onDelete={(id) => setDeletingTaskId(id)}
            onRefresh={loadTasks}
            onTaskUpdated={applyTaskPatch}
            onStatusChange={handleStatusChange}
            userId={userId}
            userEmail={userEmail}
            isSystemAdmin={isSystemAdmin}
            organizationId={organizationId}
          />
        </Suspense>
      )}

      {/* Modal for adding a new board */}
      {isAddBoardModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddBoardModalOpen(false)}>
          <div className="modal-content confirm-dialog" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">✨ יצירת לוח פרויקטים חדש</h3>
              <button type="button" className="modal-close" onClick={() => setIsAddBoardModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddBoard}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">שם הלוח *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="לדוגמה: דפוס ומדבקות, סניף צפון..."
                    value={newBoardName}
                    onChange={e => setNewBoardName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">תת-כותרת / תיאור הלוח (אופציונלי)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="הזן תת-כותרת או קישור..."
                    value={newBoardSubtitle}
                    onChange={e => setNewBoardSubtitle(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">אייקון לוח</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {PRESET_BOARD_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className={`btn ${newBoardIcon === icon ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 10px', fontSize: '1.1rem', minWidth: '38px' }}
                        onClick={() => setNewBoardIcon(icon)}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0, marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={newBoardIsShared}
                      onChange={e => setNewBoardIsShared(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>🌐 שתף פרויקטים בלוח זה עם כל חברי הארגון</span>
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginInlineStart: '26px' }}>
                    {newBoardIsShared ? 'כל מי שמחובר לארגון יוכל לצפות ולערוך פרויקטים בלוח זה' : 'לוח פרטי - לא יוצג ליתר חברי הארגון אלא אם שותפו'}
                  </span>
                </div>

                {!newBoardIsShared && (
                  <div style={{
                    backgroundColor: 'var(--bg-secondary, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '0.88rem' }}>
                      <span>🔒</span>
                      <span>שיתוף חברי צוות בלוח זה</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      לוח זה מוסתר מיתר חברי הארגון. רק את/ה ומי שיוגדר כאן יוכלו לצפות בלוח ובפרויקטים שבו.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="email"
                        className="form-control"
                        style={{ fontSize: '0.85rem' }}
                        placeholder="הזן אימייל של חבר צוות להוספה..."
                        value={newBoardEmailInput}
                        onChange={e => setNewBoardEmailInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const email = newBoardEmailInput.trim().toLowerCase();
                            if (email && email.includes('@') && !newBoardSharedEmails.some(x => x.toLowerCase() === email)) {
                              setNewBoardSharedEmails([...newBoardSharedEmails, email]);
                              setNewBoardEmailInput('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 12px', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                        onClick={() => {
                          const email = newBoardEmailInput.trim().toLowerCase();
                          if (email && email.includes('@') && !newBoardSharedEmails.some(x => x.toLowerCase() === email)) {
                            setNewBoardSharedEmails([...newBoardSharedEmails, email]);
                            setNewBoardEmailInput('');
                          }
                        }}
                      >
                        ➕ הוסף
                      </button>
                    </div>
                    {contactsWithEmails.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>הוספה מהירה:</span>
                        {contactsWithEmails.slice(0, 5).map(c => {
                          const email = (c.email || '').trim().toLowerCase();
                          if (!email || newBoardSharedEmails.some(x => x.toLowerCase() === email)) return null;
                          return (
                            <button
                              key={c.id || email}
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '12px' }}
                              onClick={() => setNewBoardSharedEmails([...newBoardSharedEmails, email])}
                            >
                              + {c.name || email}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {newBoardSharedEmails.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {newBoardSharedEmails.map(email => (
                          <span
                            key={email}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#e0e7ff',
                              color: '#3730a3',
                              padding: '3px 10px',
                              borderRadius: '16px',
                              fontSize: '0.8rem',
                              fontWeight: '500'
                            }}
                          >
                            ✉️ {email}
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.85rem', color: '#4338ca' }}
                              onClick={() => setNewBoardSharedEmails(newBoardSharedEmails.filter(e => e !== email))}
                              title="הסר שיתוף"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddBoardModalOpen(false)}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" disabled={!newBoardName.trim()}>
                  צור לוח
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for editing an existing board */}
      {editingBoard && (
        <div className="modal-overlay" onClick={() => setEditingBoard(null)}>
          <div className="modal-content confirm-dialog" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ עריכת לוח</h3>
              <button type="button" className="modal-close" onClick={() => setEditingBoard(null)}>&times;</button>
            </div>
            <form onSubmit={handleSaveEditedBoard}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">שם הלוח *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingBoard.name}
                    onChange={e => setEditingBoard({ ...editingBoard, name: e.target.value })}
                    autoFocus
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">תת-כותרת / תיאור הלוח (אופציונלי)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="הזן תת-כותרת או קישור..."
                    value={editingBoard.subtitle || ''}
                    onChange={e => setEditingBoard({ ...editingBoard, subtitle: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">אייקון לוח</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {PRESET_BOARD_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className={`btn ${editingBoard.icon === icon ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 10px', fontSize: '1.1rem', minWidth: '38px' }}
                        onClick={() => setEditingBoard({ ...editingBoard, icon })}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0, marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={editingBoard.isSharedWithOrg !== false}
                      onChange={e => setEditingBoard({ ...editingBoard, isSharedWithOrg: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>🌐 שתף פרויקטים בלוח זה עם כל חברי הארגון</span>
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginInlineStart: '26px' }}>
                    {editingBoard.isSharedWithOrg !== false ? 'כל מי שמחובר לארגון יוכל לצפות ולערוך פרויקטים בלוח זה' : 'לוח פרטי - לא יוצג ליתר חברי הארגון אלא אם שותפו'}
                  </span>
                </div>

                {editingBoard.isSharedWithOrg === false && (
                  <div style={{
                    backgroundColor: 'var(--bg-secondary, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '0.88rem' }}>
                      <span>🔒</span>
                      <span>שיתוף חברי צוות בלוח זה</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      לוח זה מוסתר מיתר חברי הארגון. רק את/ה ומי שיוגדר כאן יוכלו לצפות בלוח ובפרויקטים שבו.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="email"
                        className="form-control"
                        style={{ fontSize: '0.85rem' }}
                        placeholder="הזן אימייל של חבר צוות להוספה..."
                        value={editingBoardEmailInput}
                        onChange={e => setEditingBoardEmailInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const email = editingBoardEmailInput.trim().toLowerCase();
                            const current = Array.isArray(editingBoard.sharedEmails) ? editingBoard.sharedEmails : [];
                            if (email && email.includes('@') && !current.some(x => x.toLowerCase() === email)) {
                              setEditingBoard({ ...editingBoard, sharedEmails: [...current, email] });
                              setEditingBoardEmailInput('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 12px', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                        onClick={() => {
                          const email = editingBoardEmailInput.trim().toLowerCase();
                          const current = Array.isArray(editingBoard.sharedEmails) ? editingBoard.sharedEmails : [];
                          if (email && email.includes('@') && !current.some(x => x.toLowerCase() === email)) {
                            setEditingBoard({ ...editingBoard, sharedEmails: [...current, email] });
                            setEditingBoardEmailInput('');
                          }
                        }}
                      >
                        ➕ הוסף
                      </button>
                    </div>
                    {contactsWithEmails.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>הוספה מהירה:</span>
                        {contactsWithEmails.slice(0, 5).map(c => {
                          const email = (c.email || '').trim().toLowerCase();
                          const current = Array.isArray(editingBoard.sharedEmails) ? editingBoard.sharedEmails : [];
                          if (!email || current.some(x => x.toLowerCase() === email)) return null;
                          return (
                            <button
                              key={c.id || email}
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '12px' }}
                              onClick={() => setEditingBoard({ ...editingBoard, sharedEmails: [...current, email] })}
                            >
                              + {c.name || email}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {Array.isArray(editingBoard.sharedEmails) && editingBoard.sharedEmails.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {editingBoard.sharedEmails.map(email => (
                          <span
                            key={email}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#e0e7ff',
                              color: '#3730a3',
                              padding: '3px 10px',
                              borderRadius: '16px',
                              fontSize: '0.8rem',
                              fontWeight: '500'
                            }}
                          >
                            ✉️ {email}
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.85rem', color: '#4338ca' }}
                              onClick={() => setEditingBoard({
                                ...editingBoard,
                                sharedEmails: editingBoard.sharedEmails.filter(e => e !== email)
                              })}
                              title="הסר שיתוף"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingBoard(null)}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" disabled={!editingBoard.name.trim()}>
                  שמור שינויים
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deletingTaskId && (
        <div className="modal-overlay" onClick={() => setDeletingTaskId(null)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{flags.terms.deleteConfirmTitle}</h3>
              <button className="modal-close" onClick={() => setDeletingTaskId(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>{flags.terms.deleteConfirmBody}</p>
              <p style={{ marginTop: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>
                {flags.terms.deleteConfirmSubtext}
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingTaskId(null)}
              >
                ביטול
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ backgroundColor: 'var(--color-needs-revision)', color: 'white' }}
                onClick={() => handleDeleteTask(deletingTaskId)}
              >
                העברה לפח האשפה
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Permanent Delete Single Task Confirmation Modal */}
      {permanentDeleteTask && (
        <div className="modal-overlay" onClick={() => !permanentlyDeletingTaskId && setPermanentDeleteTask(null)}>
          <div className="modal-content confirm-dialog" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🗑️ מחיקת {flags.terms.item} לצמיתות</h3>
              <button
                type="button"
                className="modal-close"
                disabled={Boolean(permanentlyDeletingTaskId)}
                onClick={() => setPermanentDeleteTask(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                האם את בטוחה שברצונך למחוק לצמיתות את ה{flags.terms.item} <strong>"{permanentDeleteTask.title || permanentDeleteTask.jobNumber}"</strong>?
              </p>
              <p style={{ marginTop: '10px', color: 'var(--color-needs-revision)', fontWeight: '600', fontSize: '0.88rem' }}>
                ⚠️ פעולה זו היא סופית ובלתי הפיכה! ה{flags.terms.item}, הקבצים וההערות יימחקו לחלוטין ללא אפשרות שחזור.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={Boolean(permanentlyDeletingTaskId)}
                onClick={() => setPermanentDeleteTask(null)}
              >
                ביטול
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ backgroundColor: 'var(--color-needs-revision)', color: 'white' }}
                disabled={Boolean(permanentlyDeletingTaskId)}
                onClick={() => handlePermanentlyDeleteTask(permanentDeleteTask.id)}
              >
                {permanentlyDeletingTaskId ? 'מוחק לצמיתות...' : 'מחק לצמיתות'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Entire Trash Confirmation Modal */}
      {isEmptyTrashConfirmOpen && (
        <div className="modal-overlay" onClick={() => !isPurgingAllTrash && setIsEmptyTrashConfirmOpen(false)}>
          <div className="modal-content confirm-dialog" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🗑️ ריקון פח האשפה</h3>
              <button
                type="button"
                className="modal-close"
                disabled={isPurgingAllTrash}
                onClick={() => setIsEmptyTrashConfirmOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                האם את בטוחה שברצונך למחוק לצמיתות את כל ה{flags.terms.items} שבפח האשפה (<strong>{trashedTasks.length} {flags.terms.items}</strong>)?
              </p>
              <p style={{ marginTop: '10px', color: 'var(--color-needs-revision)', fontWeight: '600', fontSize: '0.88rem' }}>
                ⚠️ פעולה זו תמחק לצמיתות את כל ה{flags.terms.items} והמידע המשויך אליהם ללא אפשרות שחזור!
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isPurgingAllTrash}
                onClick={() => setIsEmptyTrashConfirmOpen(false)}
              >
                ביטול
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ backgroundColor: 'var(--color-needs-revision)', color: 'white' }}
                disabled={isPurgingAllTrash}
                onClick={handleEmptyTrash}
              >
                {isPurgingAllTrash ? 'מרוקן פח...' : 'ריקון כל הפח עכשיו'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for creating a project - Only in new version (v2) */}
      {!flags.isLegacy && workspaceView !== 'trash' && (
        <button
          type="button"
          className="floating-create-btn"
          onClick={() => {
            setViewingTask(null);
            setStartInEditMode(false);
            setIsCreateOpen(true);
          }}
          aria-label="יצירת פרויקט חדש"
        >
          <svg
            className="floating-create-btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="floating-create-tooltip" role="tooltip">
            יצירת פרויקט חדש
          </span>
        </button>
      )}
    </main>
  );
}
