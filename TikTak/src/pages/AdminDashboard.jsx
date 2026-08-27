import { useCallback, useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { getBoardStatusConfig } from '../utils/boardStatusHelper';
import { getFeatureFlags } from '../utils/featureFlags';
import { normalizeNewTaskFields } from '../data/taskFieldConfig';

const AdminDetailsModal = lazy(() => import('../components/AdminDetailsModal'));
import StatusPicker from '../components/StatusPicker';
import PlanogramIndicator from '../components/PlanogramIndicator';

const PENDING_STATUSES_KEY = 'tiktak_pending_status_updates';
const SORT_PREFERENCE_KEY = 'tiktak_admin_sort_preference';
const SORT_MODES = new Set(['manual', 'updatedAt', 'status', 'title', 'contactPerson']);
const COMPLETED_SUBTASK_VISIBILITY_MS = 3000;
const PRESET_BOARD_ICONS = ['📁', '📋', '🏷️', '🚀', '🎨', '📦', '⚡', '🎯', '📊', '⭐️', '✨', '💼', '📌', '🛠️', '🖨️'];
let storageApiPromise = null;

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
      mode: SORT_MODES.has(savedPreference.mode) ? savedPreference.mode : 'manual',
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

export default function AdminDashboard({ settings, suppliers = [], contacts = [], onSaveSettings, userId, organizationId, autoOpenTaskId, onClearAutoOpen, onNavigate }) {
  const {
    autoArchiveInactiveDays = 45
  } = settings || {};
  const [tasks, setTasks] = useState([]);
  const [trashedTasks, setTrashedTasks] = useState([]);
  const [workspaceView, setWorkspaceView] = useState('active');
  const [restoringTaskId, setRestoringTaskId] = useState(null);
  const [permanentlyDeletingTaskId, setPermanentlyDeletingTaskId] = useState(null);
  const [permanentDeleteTask, setPermanentDeleteTask] = useState(null);
  const [isEmptyTrashConfirmOpen, setIsEmptyTrashConfirmOpen] = useState(false);
  const [isPurgingAllTrash, setIsPurgingAllTrash] = useState(false);

  // Status configuration for currently active workspace/board
  const currentBoardStatusConfig = useMemo(() => (
    getBoardStatusConfig(settings, workspaceView)
  ), [settings, workspaceView]);
  const STATUSES = currentBoardStatusConfig.statuses;
  const STATUS_CLASSES = currentBoardStatusConfig.statusColors;

  const newTaskFields = useMemo(() => normalizeNewTaskFields(settings?.newTaskFields), [settings?.newTaskFields]);
  const contactPersonLabel = newTaskFields.contactPerson?.label || 'איש קשר';

  // Custom Boards State
  const customBoards = useMemo(() => (Array.isArray(settings?.boards) ? settings.boards : []).filter(b => b && b.id !== 'active'), [settings?.boards]);
  const [isAddBoardModalOpen, setIsAddBoardModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardIcon, setNewBoardIcon] = useState('📁');
  const [editingBoard, setEditingBoard] = useState(null);
  const [activeBoardMenuId, setActiveBoardMenuId] = useState(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortMode, setSortMode] = useState(() => readSortPreference().mode);
  const [sortDirection, setSortDirection] = useState(() => readSortPreference().direction);
  const [savingStatusIds, setSavingStatusIds] = useState(() => new Set());
  const [recentlyCompletedSubtaskKeys, setRecentlyCompletedSubtaskKeys] = useState(() => new Set());
  const [showCompletedThisWeekSubtasks, setShowCompletedThisWeekSubtasks] = useState(false);

  // Reset status filter when switching boards
  useEffect(() => {
    setStatusFilter('');
  }, [workspaceView]);
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

    const newBoard = {
      id: 'board_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: nameTrimmed,
      icon: newBoardIcon || '📁',
      createdAt: new Date().toISOString()
    };

    const currentBoards = Array.isArray(settings?.boards) ? settings.boards : [];
    const updatedBoards = [...currentBoards.filter(b => b && b.id !== newBoard.id && b.id !== 'active'), newBoard];

    try {
      await onSaveSettings({
        ...settings,
        boards: updatedBoards
      });
      setNewBoardName('');
      setNewBoardIcon('📁');
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
          boardIcon: editingBoard.icon || '📋'
        });
        setEditingBoard(null);
      } catch (err) {
        console.error('Failed to update default board', err);
        alert('שגיאה בעדכון הלוח. נסי שוב.');
      }
      return;
    }

    const currentBoards = Array.isArray(settings?.boards) ? settings.boards : [];
    const updatedBoards = currentBoards.map(b => (b.id === editingBoard.id ? { ...b, name: editingBoard.name.trim(), icon: editingBoard.icon || '📁' } : b));

    try {
      await onSaveSettings({
        ...settings,
        boards: updatedBoards
      });
      setEditingBoard(null);
    } catch (err) {
      console.error('Failed to update board', err);
      alert('שגיאה בעדכון הלוח. נסי שוב.');
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
      await onSaveSettings({
        ...settings,
        boards: updatedBoards
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

  const loadTasks = useCallback(async () => {
    const { getTasks } = await getStorageApi();
    const fetchedTasks = await getTasks(userId);
    setTasks(prev => mergeTasksPreservingOrder(prev, fetchedTasks));
    setViewingTask(prev => {
      if (!prev) return null;
      const updated = fetchedTasks.find(t => t.id === prev.id);
      return updated || prev;
    });
  }, [getStorageApi, userId]);

  const loadTrash = useCallback(async () => {
    const { getTrashedTasks } = await getStorageApi();
    const fetchedTasks = await getTrashedTasks(userId);
    const loadedAt = Number(new Date());
    setTrashedTasks(fetchedTasks.map(task => ({
      ...task,
      daysRemaining: Math.max(0, Math.ceil((Date.parse(task.expiresAt) - loadedAt) / (24 * 60 * 60 * 1000)))
    })));
  }, [getStorageApi, userId]);

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
      const tasksPromise = getTasks(userId);

      // Run background maintenance tasks asynchronously
      purgeExpiredTasks(userId).catch(err => console.error("Purge error", err));
      const archiveRunKey = `${userId}:${autoArchiveInactiveDays}`;
      if (autoArchiveRunKey.current !== archiveRunKey) {
        autoArchiveRunKey.current = archiveRunKey;
        autoArchiveInactiveTasks(userId, autoArchiveInactiveDays).catch(err => console.error("AutoArchive error", err));
      }
      const pendingStatuses = readPendingStatuses();
      if (Object.keys(pendingStatuses).length > 0) {
        Promise.all(Object.entries(pendingStatuses).map(async ([taskId, status]) => {
          try {
            await updateTask(taskId, { status });
            clearPendingStatus(taskId, status);
          } catch (err) {
            console.error(`Failed to restore pending status for task ${taskId}`, err);
          }
        })).catch(err => console.error(err));
      }

      const fetchedTasks = await tasksPromise;
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
  }, [userId, autoArchiveInactiveDays, getStorageApi, loadTrash]);

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

  // Tasks in the currently active board view
  const currentBoardTasks = useMemo(() => {
    if (workspaceView === 'trash') return [];
    if (workspaceView === 'active') {
      return tasks.filter(t => !t.boardId || t.boardId === 'active');
    }
    return tasks.filter(t => t.boardId === workspaceView);
  }, [tasks, workspaceView]);

  const activeBoardTasksCount = useMemo(() => (
    tasks.filter(t => !t.boardId || t.boardId === 'active').length
  ), [tasks]);

  const flags = getFeatureFlags(settings);

  const defaultBoardName = settings?.boardTitle || (flags.isLegacy ? 'עבודות פעילות' : 'פרויקטים פעילים');
  const defaultBoardIcon = settings?.boardIcon || (flags.isLegacy ? '📁' : '📋');

  const currentBoardName = useMemo(() => {
    if (workspaceView === 'trash') return '🗑️ פח אשפה';
    if (workspaceView === 'active') return `${defaultBoardIcon} ${defaultBoardName}`;
    const custom = customBoards.find(b => b.id === workspaceView);
    return custom ? `${custom.icon ? custom.icon + ' ' : ''}${custom.name}` : `${defaultBoardIcon} ${defaultBoardName}`;
  }, [workspaceView, defaultBoardName, defaultBoardIcon, customBoards]);

  // Filter and sort tasks whenever data or controls change
  const filteredTasks = useMemo(() => {
    let result = [...currentBoardTasks];

    // Search query filter ( title, contactPerson )
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => {
        const contact = t.contactPerson || t.supplierContactName || '';
        return (t.title && t.title.toLowerCase().includes(q)) ||
          (contact && contact.toLowerCase().includes(q));
      });
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(t => t.status === statusFilter);
    }

    if (sortMode !== 'manual') {
      const statusOrder = new Map(STATUSES.map((status, index) => [status, index]));
      const direction = sortDirection === 'asc' ? 1 : -1;

      result.sort((a, b) => {
        const comparison = sortMode === 'updatedAt'
          ? (Date.parse(a.updatedAt) || 0) - (Date.parse(b.updatedAt) || 0)
          : sortMode === 'status'
            ? (statusOrder.get(a.status) ?? 999) - (statusOrder.get(b.status) ?? 999)
            : (a[sortMode] || '').localeCompare(b[sortMode] || '', 'he', {
            sensitivity: 'base',
            numeric: true
          });

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

  const allProjectSubtasks = useMemo(() => {
    return currentBoardTasks
      .flatMap(task => normalizeProjectSubtasks(task).map(subtask => ({
        ...subtask,
        taskId: task.id,
        projectTitle: task.title || task.jobNumber || 'פרויקט ללא שם',
        projectStatus: task.status || '',
        projectUpdatedAt: task.updatedAt || task.createdAt || ''
      })))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (Date.parse(b.createdAt) || Date.parse(b.projectUpdatedAt) || 0) - (Date.parse(a.createdAt) || Date.parse(a.projectUpdatedAt) || 0);
      });
  }, [tasks]);

  const completedThisWeekProjectSubtasks = useMemo(() => (
    allProjectSubtasks.filter(item => item.completed && isDateInCurrentWeek(item.completedAt))
  ), [allProjectSubtasks]);

  const completedThisWeekSubtaskKeys = useMemo(() => (
    new Set(completedThisWeekProjectSubtasks.map(item => getProjectSubtaskKey(item.taskId, item.id)))
  ), [completedThisWeekProjectSubtasks]);

  const visibleProjectSubtasks = useMemo(() => {
    return allProjectSubtasks.filter(item => (
      (showCompletedThisWeekSubtasks && completedThisWeekSubtaskKeys.has(getProjectSubtaskKey(item.taskId, item.id))) ||
      !item.completed || recentlyCompletedSubtaskKeys.has(getProjectSubtaskKey(item.taskId, item.id))
    ));
  }, [allProjectSubtasks, completedThisWeekSubtaskKeys, recentlyCompletedSubtaskKeys, showCompletedThisWeekSubtasks]);

  const openProjectSubtasksCount = useMemo(() => (
    allProjectSubtasks.filter(item => !item.completed).length
  ), [allProjectSubtasks]);

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
    <th aria-sort={getAriaSort(column)}>
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
    const isCompleted = newStatus === 'אושר לספק' || newStatus === 'ארכיון';
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
        const allTasks = await getTasks(userId);
        const updated = allTasks.find(t => t.id === viewingTask.id);
        setViewingTask(updated || null);
      } else {
        // Create mode
        const { createTask } = await getStorageApi();
        await createTask(taskData, userId);
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
    const originalValue = field === 'phone'
      ? (() => {
          const contact = contactsByName.get((task.contactPerson || '').trim().toLowerCase());
          return contact ? contact.phone : '';
        })()
      : field === 'email'
        ? (task.supplierContactEmail || (() => {
            const contact = contactsByName.get((task.contactPerson || '').trim().toLowerCase());
            return contact ? contact.email : '';
          })())
        : task[field];

    if (trimmedVal === (originalValue || '')) {
      setEditingCell({ taskId: null, field: null });
      return;
    }

    // Validation
    if (field === 'title' && !trimmedVal) {
      alert('שם הפרויקט הוא שדה חובה');
      return;
    }

    if (field === 'email' && trimmedVal) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedVal)) {
        alert('כתובת אימייל לא תקינה');
        return;
      }
    }

    setIsSavingCell(true);
    try {
      const { updateTask, updateContact, addContact } = await getStorageApi();
      if (field === 'title' || field === 'contactPerson') {
        await updateTask(task.id, { [field]: trimmedVal });
        applyTaskPatch(task.id, { [field]: trimmedVal, updatedAt: new Date().toISOString() });
      } else if (field === 'email') {
        await updateTask(task.id, { supplierContactEmail: trimmedVal });
        applyTaskPatch(task.id, { supplierContactEmail: trimmedVal, updatedAt: new Date().toISOString() });
      } else if (field === 'phone') {
        if (task.contactPerson) {
          const contact = contactsByName.get(task.contactPerson.trim().toLowerCase());
          if (contact) {
            await updateContact(contact.id, { ...contact, phone: trimmedVal });
          } else {
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
        } else {
          alert('לא ניתן לעדכן מספר טלפון ללא איש קשר מוגדר');
          setIsSavingCell(false);
          return;
        }
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
      await emptyTrash(userId);
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

  return (
    <main className="dashboard-container">

      {/* Upper Actions Panel */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{currentBoardName}</h2>
        </div>
        {workspaceView !== 'trash' && (
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
          {/* Default Active Board */}
          <div className="workspace-board-tab-item">
            <button
              type="button"
              role="tab"
              aria-selected={workspaceView === 'active'}
              className={`workspace-view-button ${workspaceView === 'active' ? 'active' : ''}`}
              onClick={() => setWorkspaceView('active')}
            >
              <span className="workspace-tab-label">{defaultBoardIcon} {defaultBoardName}</span>
              <span className="workspace-view-count">{activeBoardTasksCount}</span>
              {flags.enableCustomBoards && (
                <span
                  role="button"
                  tabIndex={0}
                  className="workspace-board-settings-trigger"
                  title="אפשרויות לוח"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveBoardMenuId(activeBoardMenuId === 'active' ? null : 'active');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      e.preventDefault();
                      setActiveBoardMenuId(activeBoardMenuId === 'active' ? null : 'active');
                    }
                  }}
                >
                  ⚙️
                </span>
              )}
            </button>

            {flags.enableCustomBoards && activeBoardMenuId === 'active' && (
              <div className="workspace-board-dropdown" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="workspace-board-dropdown-item"
                  onClick={() => {
                    setActiveBoardMenuId(null);
                    setEditingBoard({
                      id: 'active',
                      name: defaultBoardName,
                      icon: defaultBoardIcon
                    });
                  }}
                >
                  ✏️ עריכת לוח
                </button>
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
              </div>
            )}
          </div>

          {/* Custom Boards (v2 only) */}
          {flags.enableCustomBoards && customBoards.map(board => {
            const count = tasks.filter(t => t.boardId === board.id).length;
            const isActive = workspaceView === board.id;
            return (
              <div key={board.id} className="workspace-board-tab-item">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`workspace-view-button ${isActive ? 'active' : ''}`}
                  onClick={() => setWorkspaceView(board.id)}
                >
                  <span className="workspace-tab-label">{board.icon || '📁'} {board.name}</span>
                  <span className="workspace-view-count">{count}</span>
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
                </button>

                {activeBoardMenuId === board.id && (
                  <div className="workspace-board-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="workspace-board-dropdown-item"
                      onClick={() => {
                        setActiveBoardMenuId(null);
                        setEditingBoard({ ...board });
                      }}
                    >
                      ✏️ עריכת שם ואייקון
                    </button>
                    <button
                      type="button"
                      className="workspace-board-dropdown-item danger"
                      onClick={() => handleDeleteBoard(board.id)}
                    >
                      🗑️ מחיקת לוח
                    </button>
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
          הכל <span className="chip-count">{tasks.length}</span>
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
            מציג <span className="filter-badge-info">{filteredTasks.length}</span> מתוך <span className="filter-badge-info">{tasks.length}</span> {flags.terms.items} בסך הכל
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
            <h3 id="dashboard-subtasks-title">משימות פתוחות</h3>
            <p>
              {visibleProjectSubtasks.length > 0
                ? showCompletedThisWeekSubtasks
                  ? `${openProjectSubtasksCount} פתוחות, ${completedThisWeekProjectSubtasksCount} הושלמו השבוע`
                  : `${openProjectSubtasksCount} פתוחות מתוך ${visibleProjectSubtasks.length}`
                : allProjectSubtasks.length > 0
                  ? 'אין משימות פתוחות כרגע'
                  : 'אין עדיין משימות בפרויקטים'}
            </p>
          </div>
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

        {visibleProjectSubtasks.length === 0 ? (
          <div className="dashboard-subtasks-empty">
            {allProjectSubtasks.length > 0
              ? 'כל המשימות בפרויקטים סומנו כבוצעו.'
              : 'הוסיפי משימות מתוך אזור הערות ועדכוני פרויקט, והן יופיעו כאן.'}
          </div>
        ) : (
          <div className="dashboard-subtasks-list">
            {visibleProjectSubtasks.map(item => (
              <article
                className={`dashboard-subtask-item ${item.completed ? 'completed' : ''}`}
                key={`${item.taskId}-${item.id}`}
              >
                <label className="dashboard-subtask-main">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleProjectSubtask(item.taskId, item.id)}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span>{item.text}</span>
                    {item.completed && (
                      <span className="dashboard-subtask-completed-date" title={`הושלם ב-${formatDate(item.completedAt || item.updatedAt || item.createdAt)}`}>
                        הושלם ב-{formatDate(item.completedAt || item.updatedAt || item.createdAt)}
                      </span>
                    )}
                  </div>
                </label>
                <button
                  type="button"
                  className="dashboard-subtask-project"
                  onClick={() => {
                    const project = tasks.find(task => task.id === item.taskId);
                    if (project) setViewingTask(project);
                  }}
                  title="פתיחת הפרויקט"
                >
                  {item.projectTitle}
                </button>
              </article>
            ))}
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
                <tr>
                  {renderSortableHeader('title', 'שם הפרויקט')}
                  {renderSortableHeader('contactPerson', contactPersonLabel)}
                  <th>טלפון</th>
                  <th>אימייל</th>
                  {renderSortableHeader('status', 'סטטוס')}
                  {renderSortableHeader('updatedAt', 'עודכן ב')}
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => {
                  const currentContactPerson = task.contactPerson || task.supplierContactName || '';
                  const currentPlanogram = task.planogramFile || task.planogram;
                  const contact = contactsByName.get(currentContactPerson.trim().toLowerCase());
                  const phone = contact ? contact.phone : '';
                  const email = task.supplierContactEmail || task.contactEmail || task.email || (contact ? contact.email : '');

                  return (
                    <tr key={task.id} onClick={(e) => handleCellClick(task, e)}>
                      <td
                        style={{ fontWeight: '600' }}
                      >
                        <span className="task-title-with-indicator">
                          <span>{task.title}</span>
                          {currentPlanogram && <PlanogramIndicator />}
                        </span>
                      </td>
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
                      <td>
                        {(() => {
                          const taskStatusConfig = getBoardStatusConfig(settings, task.boardId);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                              <StatusPicker
                                currentStatus={task.status}
                                statuses={taskStatusConfig.statuses}
                                statusColors={taskStatusConfig.statusColors}
                                onChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                                disabled={savingStatusIds.has(task.id)}
                              />
                              {(task.status === 'אושר לספק' || task.status === 'ארכיון' || task.completedAt) && (
                                <div className="task-completed-date-badge">
                                  הושלם ב-{formatDate(task.completedAt || task.updatedAt)}
                                </div>
                              )}
                            </div>
                          );
                        })()}
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
                          {currentPlanogram && <PlanogramIndicator compact />}
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
                      {(task.status === 'אושר לספק' || task.status === 'ארכיון' || task.completedAt) && (
                        <div className="task-completed-date-badge">
                          הושלם ב-{formatDate(task.completedAt || task.updatedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="task-card-meta">
                    <div className="meta-item">
                      <span className="meta-label">איש קשר</span>
                      <span className="meta-value">{currentContactPerson || '-'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">עודכן ב</span>
                      <span className="meta-value">{formatDate(task.updatedAt)}</span>
                    </div>
                    {(task.status === 'אושר לספק' || task.status === 'ארכיון' || task.completedAt) && (
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
            organizationId={organizationId}
          />
        </Suspense>
      )}

      {/* Modal for adding a new board */}
      {isAddBoardModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddBoardModalOpen(false)}>
          <div className="modal-content confirm-dialog" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
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
          <div className="modal-content confirm-dialog" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
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
    </main>
  );
}
