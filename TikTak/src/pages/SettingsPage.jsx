import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseDb';
import { cancelSubscriptionAndRecurringOrder, TRANZILA_DEFAULT_CONFIG } from '../utils/paymentConfig';
import PaymentModal from '../components/PaymentModal';
import {
  FIELD_TYPES,
  NEW_TASK_FIELD_STYLES,
  normalizeNewTaskFields,
  createCustomFieldConfig,
  getAllTaskFieldDefinitions
} from '../data/taskFieldConfig';
import { APP_VERSIONS, getFeatureFlags } from '../utils/featureFlags';
import { isBoardSharedWithOrg, isBoardAccessibleToUser, getOrderedBoards } from '../utils/boardStatusHelper';
import { exportAllUserDataToExcel } from '../utils/excelExportHelper';
import IconPickerModal from '../components/IconPickerModal';

const PRESET_COLORS = [
  { value: 'badge-new', label: 'כחול עדין', previewClass: 'badge-new' },
  { value: 'badge-in-progress', label: 'אינדיגו', previewClass: 'badge-in-progress' },
  { value: 'badge-waiting-info', label: 'צהוב', previewClass: 'badge-waiting-info' },
  { value: 'badge-waiting-china', label: 'כתום', previewClass: 'badge-waiting-china' },
  { value: 'badge-waiting-approval', label: 'סגול בהיר', previewClass: 'badge-waiting-approval' },
  { value: 'badge-needs-revision', label: 'אדום', previewClass: 'badge-needs-revision' },
  { value: 'badge-approved', label: 'ירוק אמרלד', previewClass: 'badge-approved' },
  { value: 'badge-sent-production', label: 'טורקיז', previewClass: 'badge-sent-production' },
  { value: 'badge-completed', label: 'ירוק מנטה', previewClass: 'badge-completed' },
  { value: 'badge-frozen', label: 'אפור', previewClass: 'badge-frozen' }
];

const DEFAULT_AUTO_ARCHIVE_INACTIVE_DAYS = 45;
const PRESET_BOARD_ICONS = ['📁', '📋', '🏷️', '🚀', '🎨', '📦', '⚡', '🎯', '📊', '⭐️', '✨', '💼', '📌', '🛠️', '🖨️'];

export default function SettingsPage({
  settings,
  organizationName,
  onSaveSettings,
  onBack,
  userId = '',
  userEmail = '',
  isSystemAdmin = false,
  contacts = [],
  organizationId = '',
  suppliers = []
}) {
  const [localSettings, setLocalSettings] = useState(JSON.parse(JSON.stringify(settings)));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [exportIncludeTrash, setExportIncludeTrash] = useState(true);

  // Inputs for adding status
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('badge-new');

  // Inputs for boards
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardSubtitle, setNewBoardSubtitle] = useState('');
  const [newBoardIcon, setNewBoardIcon] = useState('📁');
  const [newBoardIsShared, setNewBoardIsShared] = useState(true);
  const [newBoardSharedEmails, setNewBoardSharedEmails] = useState([]);
  const [newBoardEmailInput, setNewBoardEmailInput] = useState('');
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editingBoardName, setEditingBoardName] = useState('');
  const [editingBoardSubtitle, setEditingBoardSubtitle] = useState('');
  const [editingBoardIcon, setEditingBoardIcon] = useState('📁');
  const [editingBoardIsShared, setEditingBoardIsShared] = useState(true);
  const [editingBoardSharedEmails, setEditingBoardSharedEmails] = useState([]);
  const [editingBoardEmailInput, setEditingBoardEmailInput] = useState('');

  // Editing state for status names
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [taskFieldOptionDrafts, setTaskFieldOptionDrafts] = useState(() => {
    const fields = normalizeNewTaskFields(settings?.newTaskFields, { includeDeleted: true });
    return Object.fromEntries(
      Object.entries(fields)
        .filter(([, field]) => field.options)
        .map(([key, field]) => [key, (field.options || []).join(', ')])
    );
  });

  // Modal state for adding a new custom field
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldStyle, setNewFieldStyle] = useState('standard');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldDefaultValue, setNewFieldDefaultValue] = useState('');
  const [newFieldIcon, setNewFieldIcon] = useState('✨');

  // Icon Picker Modal State
  const [iconPickerState, setIconPickerState] = useState({
    isOpen: false,
    title: 'בחירת אייקון',
    currentIcon: '📋',
    defaultIcon: '📋',
    onSelect: null
  });

  const openIconPicker = ({ title, currentIcon, defaultIcon, onSelect }) => {
    setIconPickerState({
      isOpen: true,
      title: title || 'בחירת אייקון',
      currentIcon: currentIcon || '📋',
      defaultIcon: defaultIcon || currentIcon || '📋',
      onSelect
    });
  };

  const closeIconPicker = () => {
    setIconPickerState(prev => ({ ...prev, isOpen: false }));
  };

  // Modal state for deleting a field
  const [fieldToDelete, setFieldToDelete] = useState(null);

  // Real-time organization data for subscription & standing order management
  const [orgData, setOrgData] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRenewPaymentModalOpen, setIsRenewPaymentModalOpen] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    const orgDocRef = doc(db, 'organizations', organizationId);
    const unsubscribe = onSnapshot(orgDocRef, (snap) => {
      if (snap.exists()) {
        setOrgData({ id: organizationId, ...snap.data() });
      }
    }, (err) => {
      console.warn('SettingsPage org listener warning:', err);
    });
    return () => unsubscribe();
  }, [organizationId]);

  const subscription = orgData?.subscription;
  const isSubCancelled = subscription?.status === 'cancelled';
  const isSubActive = !isSubCancelled && (subscription?.status === 'active' || (orgData?.active === true && subscription));
  const monthlyPrice = Number(subscription?.amount || orgData?.reopenPrice) || TRANZILA_DEFAULT_CONFIG.defaultReopenPrice;
  const effectiveOrgName = orgData?.name || organizationName || organizationId;
  const confirmationCode = subscription?.confirmationCode || orgData?.lastPayment?.confirmationCode || '';

  const formattedNextBilling = subscription?.nextBillingDate
    ? new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(subscription.nextBillingDate))
    : null;

  const formattedLastPayment = subscription?.lastPaymentDate
    ? new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(subscription.lastPaymentDate))
    : null;

  const formattedCancelledAt = subscription?.cancelledAt
    ? new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(subscription.cancelledAt))
    : null;

  const accessUntilFormatted = subscription?.accessUntil
    ? new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(subscription.accessUntil))
    : formattedNextBilling;

  const trialEndsAt = orgData?.trialEndsAt;
  const isTrialActive = Boolean(
    trialEndsAt &&
    (!subscription || subscription.status === 'trial') &&
    new Date(trialEndsAt).getTime() >= Date.now()
  );
  const remainingTrialDays = isTrialActive
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const formattedTrialEndsAt = trialEndsAt
    ? new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(trialEndsAt))
    : null;

  const handleConfirmCancelSubscription = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      await cancelSubscriptionAndRecurringOrder({
        organizationId,
        userEmail,
        userId,
        reason: cancelReason.trim()
      });
      setIsCancelModalOpen(false);
      setCancelReason('');
      showMsg('המנוי והוראת הקבע בוטלו בהצלחה. לא יבוצעו חיובים נוספים.', 'success');
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      showMsg(`שגיאה בביטול המנוי: ${err.message || 'אנא נסו שנית או פנו לתמיכה'}`, 'danger');
    } finally {
      setIsCancelling(false);
    }
  };

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleSave = async () => {
    const autoArchiveDays = Number(localSettings.autoArchiveInactiveDays);
    if (!Number.isFinite(autoArchiveDays) || autoArchiveDays < 1) {
      showMsg('יש להזין מספר ימים תקין לארכוב אוטומטי', 'danger');
      return;
    }

    setSaving(true);
    try {
      await onSaveSettings({
        ...localSettings,
        boardOrder: localSettings.boardOrder || [],
        taskFieldOrder: localSettings.taskFieldOrder || [],
        newTaskFields: normalizeNewTaskFields(localSettings.newTaskFields, { includeDeleted: true, isLegacy: flags.isLegacy }),
        autoArchiveInactiveDays: Math.floor(autoArchiveDays)
      });
      showMsg('ההגדרות נשמרו בהצלחה בשרת!', 'success');
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בשמירת ההגדרות. נסו שנית.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const flags = getFeatureFlags(localSettings);

  // Board selected for status management
  const [selectedStatusBoardId, setSelectedStatusBoardId] = useState('active');

  const defaultBoardName = localSettings.boardTitle || (flags.isLegacy ? 'עבודות פעילות' : 'פרויקטים פעילים');
  const defaultBoardIcon = localSettings.boardIcon || (flags.isLegacy ? '📁' : '📋');

  const orderedBoards = getOrderedBoards(localSettings, {
    isLegacy: flags.isLegacy,
    userId,
    userEmail,
    isSystemAdmin
  });

  const contactsWithEmails = (Array.isArray(contacts) ? contacts : [])
    .filter(c => c && typeof c === 'object' && c.email && typeof c.email === 'string' && c.email.trim());

  const availableBoardsForStatuses = orderedBoards.map(b => ({
    id: b.id,
    name: b.id === 'active' ? `${b.name} (ברירת מחדל)` : b.name,
    icon: b.icon
  }));

  const isDefaultBoard = selectedStatusBoardId === 'active';
  const selectedBoardObj = (localSettings.boards || []).find(b => b && b.id === selectedStatusBoardId);
  const hasCustomStatuses = !isDefaultBoard && Array.isArray(selectedBoardObj?.statuses) && selectedBoardObj.statuses.length > 0;

  const currentBoardStatuses = isDefaultBoard
    ? (localSettings.statuses || [])
    : hasCustomStatuses
      ? selectedBoardObj.statuses
      : (localSettings.statuses || []);

  const currentBoardStatusColors = isDefaultBoard
    ? (localSettings.statusColors || {})
    : hasCustomStatuses
      ? { ...(localSettings.statusColors || {}), ...(selectedBoardObj.statusColors || {}) }
      : (localSettings.statusColors || {});

  const currentBoardDefaultStatus = isDefaultBoard
    ? (localSettings.defaultStatus || currentBoardStatuses[0] || 'חדש')
    : hasCustomStatuses
      ? (selectedBoardObj.defaultStatus || currentBoardStatuses[0] || 'חדש')
      : (localSettings.defaultStatus || 'חדש');

  // Status Handlers
  const handleAddStatus = (e) => {
    e.preventDefault();
    const nameTrimmed = newStatusName.trim();
    if (!nameTrimmed) return;

    if (currentBoardStatuses.includes(nameTrimmed)) {
      showMsg('סטטוס זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updatedStatuses = [...currentBoardStatuses, nameTrimmed];
    const updatedColors = {
      ...currentBoardStatusColors,
      [nameTrimmed]: newStatusColor
    };

    if (isDefaultBoard) {
      setLocalSettings({
        ...localSettings,
        statuses: updatedStatuses,
        statusColors: updatedColors
      });
    } else {
      const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: updatedStatuses,
          statusColors: updatedColors,
          defaultStatus: b.defaultStatus || updatedStatuses[0]
        } : b))
      });
    }
    setNewStatusName('');
    showMsg(`הסטטוס "${nameTrimmed}" נוסף לרשימה הזמנית.`);
  };

  const handleRemoveStatus = (statusToRemove) => {
    if (currentBoardStatuses.length <= 1) {
      showMsg('חייב להישאר לפחות סטטוס אחד בלוח', 'danger');
      return;
    }

    if (currentBoardDefaultStatus === statusToRemove) {
      showMsg('לא ניתן למחוק את הסטטוס המוגדר כברירת מחדל. שנו את ברירת המחדל תחילה.', 'danger');
      return;
    }

    const updatedStatuses = currentBoardStatuses.filter(s => s !== statusToRemove);
    const updatedColors = { ...currentBoardStatusColors };
    delete updatedColors[statusToRemove];

    if (isDefaultBoard) {
      setLocalSettings({
        ...localSettings,
        statuses: updatedStatuses,
        statusColors: updatedColors
      });
    } else {
      const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: updatedStatuses,
          statusColors: updatedColors,
          defaultStatus: b.defaultStatus === statusToRemove ? updatedStatuses[0] : b.defaultStatus
        } : b))
      });
    }
    showMsg(`הסטטוס "${statusToRemove}" הוסר מהרשימה הזמנית.`);
  };

  const startEditing = (index, currentValue) => {
    setEditingIndex(index);
    setEditingValue(currentValue);
  };

  const saveEditedStatusName = (index) => {
    const oldValue = currentBoardStatuses[index];
    const newValue = editingValue.trim();
    if (!newValue) return;

    if (oldValue === newValue) {
      setEditingIndex(null);
      return;
    }

    if (currentBoardStatuses.includes(newValue)) {
      showMsg('סטטוס זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updatedStatuses = [...currentBoardStatuses];
    updatedStatuses[index] = newValue;

    const updatedColors = { ...currentBoardStatusColors };
    const colorClass = updatedColors[oldValue] || 'badge-frozen';
    delete updatedColors[oldValue];
    updatedColors[newValue] = colorClass;

    if (isDefaultBoard) {
      let updatedDefault = localSettings.defaultStatus;
      if (localSettings.defaultStatus === oldValue) {
        updatedDefault = newValue;
      }
      setLocalSettings({
        ...localSettings,
        statuses: updatedStatuses,
        statusColors: updatedColors,
        defaultStatus: updatedDefault
      });
    } else {
      const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: updatedStatuses,
          statusColors: updatedColors,
          defaultStatus: b.defaultStatus === oldValue ? newValue : b.defaultStatus
        } : b))
      });
    }
    setEditingIndex(null);
    showMsg(`שם הסטטוס "${oldValue}" שונה ל-"${newValue}"`);
  };

  const handleColorChange = (statusName, newColor) => {
    const updatedColors = {
      ...currentBoardStatusColors,
      [statusName]: newColor
    };

    if (isDefaultBoard) {
      setLocalSettings({
        ...localSettings,
        statusColors: updatedColors
      });
    } else {
      const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: currentBoardStatuses,
          statusColors: updatedColors
        } : b))
      });
    }
  };

  const handleDefaultStatusChange = (newDefault) => {
    if (isDefaultBoard) {
      setLocalSettings({
        ...localSettings,
        defaultStatus: newDefault
      });
    } else {
      const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: currentBoardStatuses,
          defaultStatus: newDefault
        } : b))
      });
    }
  };

  const handleToggleCustomStatusesForBoard = (enable) => {
    if (isDefaultBoard) return;
    const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
    if (enable) {
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: [...(localSettings.statuses || ['חדש', 'בטיפול', 'נשלח לספק', 'אושר לספק', 'ארכיון'])],
          statusColors: { ...(localSettings.statusColors || {}) },
          defaultStatus: localSettings.defaultStatus || 'חדש'
        } : b))
      });
      showMsg('הופעלה התאמת סטטוסים ייחודיים ללוח זה.');
    } else {
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => {
          if (b.id !== selectedStatusBoardId) return b;
          const updated = { ...b };
          delete updated.statuses;
          delete updated.statusColors;
          delete updated.defaultStatus;
          return updated;
        })
      });
      showMsg('הלוח הוחזר לשימוש בסטטוסים של לוח ברירת המחדל.');
    }
  };

  // Boards Handlers
  const handleAddBoard = (e) => {
    e.preventDefault();
    const nameTrimmed = newBoardName.trim();
    if (!nameTrimmed) return;

    const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
    if (existingBoards.some(b => b.name === nameTrimmed) || nameTrimmed === 'פרויקטים פעילים') {
      showMsg('לוח בשם זה כבר קיים במערכת', 'danger');
      return;
    }

    const normalizedSharedEmails = newBoardSharedEmails
      .map(e => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
      .filter(Boolean);

    const newBoard = {
      id: 'board_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: nameTrimmed,
      icon: newBoardIcon || '📁',
      subtitle: newBoardSubtitle.trim(),
      isSharedWithOrg: Boolean(newBoardIsShared),
      createdBy: userId || '',
      creatorEmail: userEmail || '',
      sharedEmails: !newBoardIsShared ? normalizedSharedEmails : [],
      sharedUserIds: [],
      createdAt: new Date().toISOString()
    };

    const updatedBoardOrder = [...(localSettings.boardOrder || []).filter(id => id !== newBoard.id), newBoard.id];

    setLocalSettings({
      ...localSettings,
      boards: [...existingBoards.filter(b => b && b.id !== 'active'), newBoard],
      boardOrder: updatedBoardOrder
    });
    setNewBoardName('');
    setNewBoardSubtitle('');
    setNewBoardIsShared(true);
    setNewBoardSharedEmails([]);
    setNewBoardEmailInput('');
    showMsg(`הלוח "${nameTrimmed}" נוסף לרשימה הזמנית. יש ללחוץ על "שמירת הגדרות" בסיום.`);
  };

  const handleRemoveBoard = (boardId) => {
    const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
    const targetBoard = existingBoards.find(b => b.id === boardId);
    setLocalSettings({
      ...localSettings,
      boards: existingBoards.filter(b => b.id !== boardId),
      boardOrder: (localSettings.boardOrder || []).filter(id => id !== boardId)
    });
    showMsg(`הלוח "${targetBoard?.name || ''}" הוסר מהרשימה הזמנית.`);
  };

  const handleMoveBoardUp = (index) => {
    if (index <= 0) return;
    const currentOrder = orderedBoards.map(b => b.id);
    const temp = currentOrder[index - 1];
    currentOrder[index - 1] = currentOrder[index];
    currentOrder[index] = temp;

    const visibleIds = new Set(currentOrder);
    const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
    const hiddenBoards = existingBoards.filter(b => b && !visibleIds.has(b.id));
    const hiddenOrderIds = (localSettings.boardOrder || []).filter(id => !visibleIds.has(id));

    const reorderedCustom = currentOrder
      .filter(id => id !== 'active')
      .map(id => existingBoards.find(b => b && b.id === id))
      .filter(Boolean);

    setLocalSettings(prev => ({
      ...prev,
      boardOrder: [...currentOrder, ...hiddenOrderIds],
      boards: [...reorderedCustom, ...hiddenBoards]
    }));
  };

  const handleMoveBoardDown = (index) => {
    if (index >= orderedBoards.length - 1) return;
    const currentOrder = orderedBoards.map(b => b.id);
    const temp = currentOrder[index + 1];
    currentOrder[index + 1] = currentOrder[index];
    currentOrder[index] = temp;

    const visibleIds = new Set(currentOrder);
    const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
    const hiddenBoards = existingBoards.filter(b => b && !visibleIds.has(b.id));
    const hiddenOrderIds = (localSettings.boardOrder || []).filter(id => !visibleIds.has(id));

    const reorderedCustom = currentOrder
      .filter(id => id !== 'active')
      .map(id => existingBoards.find(b => b && b.id === id))
      .filter(Boolean);

    setLocalSettings(prev => ({
      ...prev,
      boardOrder: [...currentOrder, ...hiddenOrderIds],
      boards: [...reorderedCustom, ...hiddenBoards]
    }));
  };

  const startEditingBoard = (board) => {
    const isDefault = board.id === 'active';
    setEditingBoardId(board.id);
    setEditingBoardName(board.name);
    setEditingBoardSubtitle(isDefault ? (localSettings.boardSubtitle || '') : (board.subtitle || ''));
    setEditingBoardIcon(board.icon || '📁');
    setEditingBoardIsShared(isDefault ? isBoardSharedWithOrg(localSettings, 'active') : isBoardSharedWithOrg(localSettings, board.id));
    setEditingBoardSharedEmails(isDefault ? (Array.isArray(localSettings.activeBoardSharedEmails) ? localSettings.activeBoardSharedEmails : []) : (Array.isArray(board.sharedEmails) ? board.sharedEmails : []));
    setEditingBoardEmailInput('');
  };

  const saveEditedBoard = (boardId) => {
    const nameTrimmed = editingBoardName.trim();
    if (!nameTrimmed) return;

    if (boardId === 'active') {
      setLocalSettings({
        ...localSettings,
        boardTitle: nameTrimmed,
        boardSubtitle: editingBoardSubtitle.trim(),
        boardIcon: editingBoardIcon || '📋',
        activeBoardIsShared: editingBoardIsShared !== false,
        activeBoardCreatedBy: editingBoardIsShared !== false ? '' : (localSettings.activeBoardCreatedBy || userId || ''),
        activeBoardCreatorEmail: editingBoardIsShared !== false ? '' : (localSettings.activeBoardCreatorEmail || userEmail || ''),
        activeBoardSharedEmails: editingBoardIsShared !== false ? [] : editingBoardSharedEmails
      });
      setEditingBoardId(null);
      setEditingBoardEmailInput('');
      showMsg('פרטי לוח ברירת המחדל עודכנו. יש ללחוץ על "שמירת הגדרות" לשמירה קבועה.');
      return;
    }

    const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
    setLocalSettings({
      ...localSettings,
      boards: existingBoards.map(b => (b.id === boardId ? {
        ...b,
        name: nameTrimmed,
        subtitle: editingBoardSubtitle.trim(),
        icon: editingBoardIcon || '📁',
        isSharedWithOrg: editingBoardIsShared !== false,
        sharedEmails: editingBoardIsShared !== false ? [] : (Array.isArray(editingBoardSharedEmails) ? editingBoardSharedEmails : []),
        createdBy: b.createdBy || userId || '',
        creatorEmail: b.creatorEmail || userEmail || ''
      } : b))
    });
    setEditingBoardId(null);
    setEditingBoardEmailInput('');
    showMsg('פרטי הלוח עודכנו ברשימה הזמנית.');
  };

  const handleTaskFieldToggle = (fieldKey, enabled) => {
    const normalizedFields = normalizeNewTaskFields(localSettings.newTaskFields, { includeDeleted: true });
    setLocalSettings({
      ...localSettings,
      newTaskFields: {
        ...normalizedFields,
        [fieldKey]: { ...normalizedFields[fieldKey], enabled }
      }
    });
  };

  const handleTaskFieldDefaultChange = (fieldKey, defaultValue) => {
    const normalizedFields = normalizeNewTaskFields(localSettings.newTaskFields, { includeDeleted: true });
    setLocalSettings({
      ...localSettings,
      newTaskFields: {
        ...normalizedFields,
        [fieldKey]: { ...normalizedFields[fieldKey], defaultValue }
      }
    });
  };

  const handleTaskFieldConfigChange = (fieldKey, patch) => {
    const normalizedFields = normalizeNewTaskFields(localSettings.newTaskFields, { includeDeleted: true });
    setLocalSettings({
      ...localSettings,
      newTaskFields: {
        ...normalizedFields,
        [fieldKey]: { ...normalizedFields[fieldKey], ...patch }
      }
    });
  };

  const handleTaskFieldOptionsChange = (fieldKey, value) => {
    setTaskFieldOptionDrafts(current => ({ ...current, [fieldKey]: value }));
    const options = value.split(',').map(option => option.trim()).filter(Boolean);
    const normalizedFields = normalizeNewTaskFields(localSettings.newTaskFields, { includeDeleted: true });
    const currentDefault = normalizedFields[fieldKey]?.defaultValue;
    handleTaskFieldConfigChange(fieldKey, {
      options,
      defaultValue: options.includes(currentDefault) ? currentDefault : (options[0] || '')
    });
  };

  const activeTaskFields = getAllTaskFieldDefinitions(localSettings.newTaskFields, {
    taskFieldOrder: localSettings.taskFieldOrder,
    isLegacy: flags.isLegacy
  });

  const handleMoveFieldUp = (index) => {
    if (index <= 0) return;
    const currentOrder = activeTaskFields.map(f => f.key);
    const temp = currentOrder[index - 1];
    currentOrder[index - 1] = currentOrder[index];
    currentOrder[index] = temp;
    setLocalSettings(prev => ({
      ...prev,
      taskFieldOrder: currentOrder
    }));
  };

  const handleMoveFieldDown = (index) => {
    if (index >= activeTaskFields.length - 1) return;
    const currentOrder = activeTaskFields.map(f => f.key);
    const temp = currentOrder[index + 1];
    currentOrder[index + 1] = currentOrder[index];
    currentOrder[index] = temp;
    setLocalSettings(prev => ({
      ...prev,
      taskFieldOrder: currentOrder
    }));
  };

  const handleAddNewCustomField = (e) => {
    e?.preventDefault();
    if (!newFieldLabel.trim()) {
      showMsg('יש להזין שם עבור השדה החדש', 'danger');
      return;
    }
    const options = newFieldType === 'select'
      ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean)
      : [];
    const customField = createCustomFieldConfig({
      label: newFieldLabel.trim(),
      type: newFieldType,
      style: newFieldStyle,
      options,
      defaultValue: newFieldDefaultValue,
      icon: newFieldIcon || '✨'
    });
    const currentFields = normalizeNewTaskFields(localSettings.newTaskFields, { includeDeleted: true });
    const currentOrder = localSettings.taskFieldOrder && Array.isArray(localSettings.taskFieldOrder)
      ? [...localSettings.taskFieldOrder, customField.key]
      : [...activeTaskFields.map(f => f.key), customField.key];

    setLocalSettings({
      ...localSettings,
      taskFieldOrder: currentOrder,
      newTaskFields: {
        ...currentFields,
        [customField.key]: customField
      }
    });
    if (options.length > 0) {
      setTaskFieldOptionDrafts(curr => ({
        ...curr,
        [customField.key]: options.join(', ')
      }));
    }
    setIsAddFieldModalOpen(false);
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldStyle('standard');
    setNewFieldOptions('');
    setNewFieldDefaultValue('');
    setNewFieldIcon('✨');
    showMsg(`השדה "${customField.label}" נוסף בהצלחה לרשימת השדות.`);
  };

  const handleDeleteTaskField = (fieldKey, fieldLabel) => {
    setFieldToDelete({ key: fieldKey, label: fieldLabel });
  };

  const confirmDeleteTaskField = () => {
    if (!fieldToDelete) return;
    const { key: fieldKey, label: fieldLabel } = fieldToDelete;
    const currentFields = { ...normalizeNewTaskFields(localSettings.newTaskFields, { includeDeleted: true }) };
    if (currentFields[fieldKey]) {
      currentFields[fieldKey] = {
        ...currentFields[fieldKey],
        deleted: true,
        enabled: false
      };
    } else {
      currentFields[fieldKey] = {
        key: fieldKey,
        label: fieldLabel,
        deleted: true,
        enabled: false
      };
    }
    setLocalSettings({
      ...localSettings,
      newTaskFields: currentFields
    });
    setFieldToDelete(null);
    showMsg(`השדה "${fieldLabel}" נמחק מהגדרות הארגון.`);
  };

  const handleRestoreTaskField = (fieldKey, fieldLabel) => {
    const currentFields = { ...normalizeNewTaskFields(localSettings.newTaskFields, { includeDeleted: true }) };
    if (currentFields[fieldKey]) {
      currentFields[fieldKey] = {
        ...currentFields[fieldKey],
        deleted: false,
        enabled: true
      };
    }
    const currentOrder = localSettings.taskFieldOrder && Array.isArray(localSettings.taskFieldOrder)
      ? [...localSettings.taskFieldOrder, fieldKey]
      : [...activeTaskFields.map(f => f.key), fieldKey];

    setLocalSettings({
      ...localSettings,
      taskFieldOrder: currentOrder,
      newTaskFields: currentFields
    });
    showMsg(`השדה "${fieldLabel}" שוחזר בהצלחה להגדרות הארגון.`);
  };

  const handleExportToExcel = async () => {
    setIsExporting(true);
    try {
      const result = await exportAllUserDataToExcel({
        userId,
        organizationId,
        organizationName,
        userEmail,
        settings: localSettings,
        suppliers,
        contacts,
        includeTrash: exportIncludeTrash
      });
      showMsg(`קובץ האקסל "${result.filename}" הופק והורד בהצלחה! (סה"כ ${result.totalProjects} פרויקטים ו-${result.totalComments} תגובות)`, 'success');
    } catch (err) {
      console.error('Export to Excel failed:', err);
      showMsg(`שגיאה בייצוא קובץ האקסל: ${err.message || 'אנא נסה שנית'}`, 'danger');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="dashboard-container" style={{ maxWidth: '950px', padding: '24px' }}>

      {/* Top Header Row */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>⚙️ הגדרות מערכת</h2>
          {organizationName && (
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              שדות והעדפות פרויקטים עבור ארגון {organizationName}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const el = document.getElementById('excel-export-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            title="מעבר לאזור ייצוא כל הנתונים לאקסל"
            style={{ borderColor: '#059669', color: '#047857', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            📊 ייצוא לאקסל
          </button>
          <button className="btn btn-secondary" onClick={onBack} disabled={saving || isExporting}>
            📋 חזרה ללוח המשימות
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || isExporting}>
            {saving ? '⏳ שומר...' : '💾 שמירת הגדרות'}
          </button>
        </div>
      </div>

      {/* Message feedback */}
      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          fontSize: '0.95rem',
          fontWeight: '500',
          backgroundColor: message.type === 'danger' ? 'var(--priority-urgent-bg)' : 'var(--primary-light)',
          color: message.type === 'danger' ? 'var(--priority-urgent-text)' : 'var(--primary)',
          border: `1px solid ${message.type === 'danger' ? '#fecaca' : '#bfdbfe'}`,
          transition: 'all 0.3s ease'
        }}>
          {message.text}
        </div>
      )}

      {/* Settings Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Section: Subscription & Standing Order Management */}
        <div
          className="filter-panel"
          style={{
            border: isSubActive ? '1px solid #bbf7d0' : isSubCancelled ? '1px solid #fed7aa' : '1px solid #e2e8f0',
            background: isSubActive
              ? 'linear-gradient(145deg, #f0fdf4 0%, #ffffff 100%)'
              : isSubCancelled
                ? 'linear-gradient(145deg, #fffbeb 0%, #ffffff 100%)'
                : '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>💳</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                  ניהול מנוי והוראת קבע
                </h3>
                <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
                  מנוי חודשי עבור ארגון: <strong style={{ color: '#1e293b' }}>{effectiveOrgName}</strong>
                </span>
              </div>
            </div>

            {/* Status Badge */}
            {isSubActive ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.88rem',
                  fontWeight: '800',
                  border: '1px solid #86efac'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                מנוי פעיל 🟢
              </span>
            ) : isSubCancelled ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  backgroundColor: '#ffedd5',
                  color: '#c2410c',
                  fontSize: '0.88rem',
                  fontWeight: '800',
                  border: '1px solid #fdba74'
                }}
              >
                <span>⏸️</span>
                מנוי מבוטל (הוראת הקבע הופסקה)
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontSize: '0.88rem',
                  fontWeight: '700'
                }}
              >
                לא פעיל
              </span>
            )}
          </div>

          {/* Details & Actions based on status */}
          {isSubActive ? (
            <div>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                הוראת קבע חודשית מאובטחת פעילה במערכת Tranzila. החיוב החודשי מתבצע אוטומטית ומאפשר גישה רציפה לכל יכולות TikTak ולוחות העבודה של הארגון.
              </p>

              {/* Data Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  backgroundColor: '#ffffff',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>עלות מנוי חודשי:</span>
                  <strong style={{ fontSize: '1.15rem', color: '#15803d' }}>₪{monthlyPrice} / חודש</strong>
                </div>

                {formattedNextBilling && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>מועד חיוב הבא:</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{formattedNextBilling}</strong>
                  </div>
                )}

                {formattedLastPayment && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>תשלום אחרון שבוצע:</span>
                    <strong style={{ fontSize: '0.92rem', color: '#334155' }}>{formattedLastPayment}</strong>
                  </div>
                )}

                {confirmationCode && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>מספר אישור עסקה:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#475569', fontSize: '0.9rem' }}>
                      {confirmationCode}
                    </span>
                  </div>
                )}
              </div>

              {/* Action row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  🔒 ביטול המנוי יבטל מיידית את הוראת הקבע בחברת הסליקה Tranzila
                </span>

                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    backgroundColor: '#fff1f2',
                    color: '#be123c',
                    border: '1px solid #fecdd3',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffe4e6';
                    e.currentTarget.style.borderColor = '#fda4af';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff1f2';
                    e.currentTarget.style.borderColor = '#fecdd3';
                  }}
                >
                  <span>❌</span>
                  <span>ביטול מנוי והוראת קבע</span>
                </button>
              </div>
            </div>
          ) : isSubCancelled ? (
            <div>
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  marginBottom: '16px',
                  fontSize: '0.88rem',
                  color: '#92400e',
                  lineHeight: '1.5'
                }}
              >
                <div style={{ fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>ℹ️</span>
                  <span>הוראת הקבע בוטלה — לא יבוצעו חיובים נוספים בכרטיס האשראי</span>
                </div>
                <div>
                  {accessUntilFormatted ? (
                    <span>
                      הגישה למערכת תישאר פעילה עד תום התקופה שכבר שולמה ({accessUntilFormatted}). לאחר מכן המערכת תיחסם עד לחידוש המנוי.
                    </span>
                  ) : (
                    <span>הוראת הקבע הופסקה.</span>
                  )}
                  {formattedCancelledAt && (
                    <span style={{ display: 'block', marginTop: '6px', fontSize: '0.8rem', color: '#b45309' }}>
                      בוטל בתאריך: {formattedCancelledAt} {subscription?.cancelledBy ? `על ידי ${subscription.cancelledBy}` : ''}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRenewPaymentModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  fontFamily: 'inherit'
                }}
              >
                <span>🔄</span>
                <span>חידוש מנוי חודשי</span>
              </button>
            </div>
          ) : (
            <div>
              {isTrialActive ? (
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  marginBottom: '16px',
                  fontSize: '0.9rem',
                  color: '#1e40af',
                  lineHeight: '1.5'
                }}>
                  <div style={{ fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.98rem' }}>
                    <span>🎁</span>
                    <span>חודש ניסיון חינם פעיל!</span>
                    <span style={{
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: '700'
                    }}>
                      נותרו עוד {remainingTrialDays} ימים
                    </span>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    הארגון שלך נהנה מגישה מלאה לכל יכולות המערכת ללא עלות עד תאריך <strong>{formattedTrialEndsAt}</strong>.
                    באפשרותך להפעיל מנוי חודשי קבוע בכל עת כדי להבטיח עבודה רציפה.
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRenewPaymentModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    <span>💳</span>
                    <span>הפעלת מנוי חודשי (₪{monthlyPrice}/חודש)</span>
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ margin: '0 0 14px 0', fontSize: '0.88rem', color: '#64748b' }}>
                    לא נמצא מנוי חודשי פעיל עבור ארגון זה.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsRenewPaymentModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '700',
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    <span>💳</span>
                    <span>הפעלת מנוי חודשי (₪{monthlyPrice}/חודש)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 0: Organization App Version / Feature Flags (System Admin ONLY) */}
        {isSystemAdmin && (
          <div className="filter-panel" style={{ border: flags.isV2 ? '1px solid #bfdbfe' : '1px solid #fde68a', background: flags.isV2 ? '#f8faff' : '#fffbeb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
              <h4 className="detail-section-title" style={{ margin: 0 }}>
                🚀 גרסת מערכת לארגון (Feature Flags)
              </h4>
              <span style={{
                padding: '4px 10px',
                borderRadius: '999px',
                fontWeight: '800',
                fontSize: '0.8rem',
                background: flags.isV2 ? '#dbeafe' : '#fef3c7',
                color: flags.isV2 ? '#1e40af' : '#92400e'
              }}>
                {flags.isV2 ? '✨ גרסה 2 (חדשה)' : '🏛️ גרסה קלאסית (Legacy)'}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
              קביעת גרסת המערכת והפיצ'רים שיוצגו לכלל משתמשי הארגון. ארגוני Legacy רואים את הממשק הקלאסי (לוח יחיד, מינוח עבודות).
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: `2px solid ${flags.isV2 ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
                flex: 1,
                minWidth: '220px'
              }}>
                <input
                  type="radio"
                  name="orgAppVersion"
                  value={APP_VERSIONS.V2}
                  checked={flags.isV2}
                  onChange={() => setLocalSettings({ ...localSettings, appVersion: APP_VERSIONS.V2 })}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1e293b' }}>✨ גרסה חדשה (v2)</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>לוחות פרויקטים מרובים, עיצוב מודרני ומינוח פרויקטים</span>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: `2px solid ${flags.isLegacy ? '#d97706' : 'var(--border)'}`,
                cursor: 'pointer',
                flex: 1,
                minWidth: '220px'
              }}>
                <input
                  type="radio"
                  name="orgAppVersion"
                  value={APP_VERSIONS.LEGACY}
                  checked={flags.isLegacy}
                  onChange={() => setLocalSettings({ ...localSettings, appVersion: APP_VERSIONS.LEGACY })}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1e293b' }}>🏛️ גרסה קלאסית (Legacy)</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>לוח יחיד, ממשק קלאסי ומינוח עבודות</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Section 1: Dashboard Details */}
        <div className="filter-panel">
          <h4 className="detail-section-title">🖥️ נראות הלוח</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            הגדרת מאפייני הכותרת והתצוגה הכלליים של לוח ה{flags.terms.items}.
          </p>

          <div className="form-group" style={{ maxWidth: '500px' }}>
            <label className="form-label">שם הלוח (כותרת ראשית בדאשבורד)</label>
            <input
              type="text"
              className="form-control"
              value={localSettings.boardTitle || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, boardTitle: e.target.value })}
            />
          </div>

          {flags.isV2 && (
            <div className="form-group" style={{ maxWidth: '500px', marginTop: '12px' }}>
              <label className="form-label">תת-כותרת ללוח ברירת המחדל (ניתן לכלול קישור)</label>
              <input
                type="text"
                className="form-control"
                placeholder="הזן תת-כותרת או קישור..."
                value={localSettings.boardSubtitle || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, boardSubtitle: e.target.value })}
              />
            </div>
          )}

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
              <input
                type="checkbox"
                checked={localSettings.hideWeeklyHours || false}
                onChange={(e) => setLocalSettings({ ...localSettings, hideWeeklyHours: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>הסתרת שעות עבודה ב{flags.terms.item}</span>
            </label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 26px' }}>
              כאשר מסומן, כרטיס "שעות עבודה" לא יופיע בפרטי ה{flags.terms.item} וכפתור "סיכום שעות" יוסתר.
            </p>
          </div>

        </div>

        {/* Section 2: Auto Archive */}
        <div className="filter-panel">
          <h4 className="detail-section-title">🗄️ ארכוב אוטומטי</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            הגדרת מספר הימים ללא שינוי או עדכון ב{flags.terms.item}, שלאחריהם הוא יעבור אוטומטית לארכיון.
          </p>

          <div className="form-group" style={{ maxWidth: '320px' }}>
            <label className="form-label">מספר ימים עד העברה לארכיון</label>
            <input
              type="number"
              min="1"
              step="1"
              className="form-control"
              value={localSettings.autoArchiveInactiveDays ?? DEFAULT_AUTO_ARCHIVE_INACTIVE_DAYS}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                autoArchiveInactiveDays: e.target.value
              })}
            />
          </div>
        </div>

        <div className="filter-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 className="detail-section-title" style={{ margin: 0 }}>🧩 שדות {flags.terms.item} בארגון</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                התאמת שם, סוג, סגנון, אפשרויות וברירת מחדל של השדות שיווצרו בפרויקטים, והוספת שדות חדשים לארגון.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.88rem' }}
              onClick={() => setIsAddFieldModalOpen(true)}
            >
              ➕ הוספת שדה חדש לארגון
            </button>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {activeTaskFields.map((field, index) => {
              const config = normalizeNewTaskFields(localSettings.newTaskFields, { isLegacy: flags.isLegacy })[field.key] || field;
              const isCustom = field.isCustom || config.isCustom;
              const hasOptions = config.type === 'select' || field.options !== undefined || Array.isArray(config.options);
              const isLockedLegacy = flags.isLegacy && (field.key === 'workOrderFiles' || field.key === 'planogramFile');

              return (
                <div key={field.key} style={{
                  display: 'grid',
                  gap: '12px',
                  padding: '14px 16px',
                  border: isCustom ? '1px solid #c7d2fe' : (isLockedLegacy ? '1px solid #fde68a' : '1px solid var(--border)'),
                  borderRadius: '10px',
                  background: isLockedLegacy ? '#fffdf7' : (!config.enabled ? '#f8fafc' : isCustom ? '#fcfdff' : '#ffffff')
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isLockedLegacy ? 'default' : 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={isLockedLegacy ? true : config.enabled !== false}
                        disabled={isLockedLegacy}
                        onChange={(event) => !isLockedLegacy && handleTaskFieldToggle(field.key, event.target.checked)}
                        style={{ width: '18px', height: '18px', margin: 0, cursor: isLockedLegacy ? 'not-allowed' : 'pointer' }}
                        title={isLockedLegacy ? 'שדה קבוע בגרסת Legacy - לא ניתן לביטול' : undefined}
                      />
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>#{index + 1}</span>
                        {!flags.isLegacy && (
                          <button
                            type="button"
                            disabled={config.enabled === false}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openIconPicker({
                                title: `בחירת אייקון עבור שדה "${config.label || field.label}"`,
                                currentIcon: config.icon || field.icon || '📌',
                                defaultIcon: field.icon || '📌',
                                onSelect: (newIcon) => handleTaskFieldConfigChange(field.key, { icon: newIcon })
                              });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              cursor: config.enabled === false ? 'default' : 'pointer',
                              fontSize: '1.15rem',
                              padding: 0
                            }}
                            title="לחצו להחלפת אייקון מתוך מאגר אייקונים נרחב"
                          >
                            {config.icon || field.icon || '📌'}
                          </button>
                        )}
                        <strong style={{ color: '#1e293b', fontSize: '0.95rem' }}>{config.label || field.label}</strong>
                        {isLockedLegacy && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                            🏛️ שדה חובה ב-Legacy
                          </span>
                        )}
                        {isCustom && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                            ✨ שדה מותאם
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px' }}>
                          סוג: {FIELD_TYPES.find(t => t.value === config.type)?.label || 'טקסט'}
                        </span>
                      </span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={index === 0}
                        style={{ padding: '4px 8px', fontSize: '0.8rem', opacity: index === 0 ? 0.35 : 1, minWidth: '32px' }}
                        onClick={() => handleMoveFieldUp(index)}
                        title="העבר שדה למעלה"
                      >
                        ⬆️
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={index === activeTaskFields.length - 1}
                        style={{ padding: '4px 8px', fontSize: '0.8rem', opacity: index === activeTaskFields.length - 1 ? 0.35 : 1, minWidth: '32px' }}
                        onClick={() => handleMoveFieldDown(index)}
                        title="העבר שדה למטה"
                      >
                        ⬇️
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={isLockedLegacy}
                        style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', opacity: isLockedLegacy ? 0.35 : 1, cursor: isLockedLegacy ? 'not-allowed' : 'pointer' }}
                        onClick={() => !isLockedLegacy && handleDeleteTaskField(field.key, config.label || field.label)}
                        title={isLockedLegacy ? 'שדה זה קבוע בגרסת Legacy ולא ניתן למחיקה' : `מחיקת השדה "${config.label || field.label}" מהארגון`}
                      >
                        🗑️ מחיקת שדה
                      </button>
                    </div>
                  </div>

                  {field.description && !isCustom && (
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '-4px' }}>
                      {field.description}
                    </div>
                  )}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '12px',
                    alignItems: 'end',
                    opacity: config.enabled === false ? 0.55 : 1
                  }}>
                    <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                      שם השדה
                      <input
                        className="form-control"
                        value={config.label}
                        onChange={(event) => handleTaskFieldConfigChange(field.key, { label: event.target.value })}
                        disabled={config.enabled === false}
                        style={{ marginTop: '5px' }}
                      />
                    </label>

                    {isCustom && (
                      <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                        סוג השדה
                        <select
                          className="form-control"
                          value={config.type || 'text'}
                          onChange={(event) => {
                            const newType = event.target.value;
                            handleTaskFieldConfigChange(field.key, {
                              type: newType,
                              ...(newType !== 'select' ? { options: [] } : {})
                            });
                          }}
                          disabled={config.enabled === false}
                          style={{ marginTop: '5px' }}
                        >
                          {FIELD_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </label>
                    )}

                    <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                      סגנון תצוגה
                      <select
                        className="form-control"
                        value={config.style}
                        onChange={(event) => handleTaskFieldConfigChange(field.key, { style: event.target.value })}
                        disabled={config.enabled === false}
                        style={{ marginTop: '5px' }}
                      >
                        {NEW_TASK_FIELD_STYLES.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                      </select>
                    </label>

                    {hasOptions && (
                      <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                        אפשרויות בחירה
                        <input
                          className="form-control"
                          value={taskFieldOptionDrafts[field.key] ?? (config.options || field.options || []).join(', ')}
                          onChange={(event) => handleTaskFieldOptionsChange(field.key, event.target.value)}
                          disabled={config.enabled === false}
                          style={{ marginTop: '5px' }}
                          placeholder="הפרדה באמצעות פסיק"
                        />
                      </label>
                    )}

                    {config.type === 'select' ? (
                      <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                        ברירת מחדל
                        <select
                          className="form-control"
                          value={config.defaultValue || ''}
                          onChange={(event) => handleTaskFieldDefaultChange(field.key, event.target.value)}
                          disabled={config.enabled === false}
                          style={{ marginTop: '5px' }}
                        >
                          <option value="">(ללא ברירת מחדל)</option>
                          {(config.options || field.options || []).map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                    ) : config.type === 'checkbox' ? (
                      <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                        ברירת מחדל
                        <select
                          className="form-control"
                          value={String(config.defaultValue ?? '')}
                          onChange={(event) => handleTaskFieldDefaultChange(field.key, event.target.value)}
                          disabled={config.enabled === false}
                          style={{ marginTop: '5px' }}
                        >
                          <option value="">ללא / כבוי</option>
                          <option value="true">מסומן (כן)</option>
                          <option value="false">לא מסומן (לא)</option>
                        </select>
                      </label>
                    ) : config.type === 'number' ? (
                      <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                        ברירת מחדל
                        <input
                          type="number"
                          className="form-control"
                          value={config.defaultValue || ''}
                          onChange={(event) => handleTaskFieldDefaultChange(field.key, event.target.value)}
                          disabled={config.enabled === false}
                          style={{ marginTop: '5px' }}
                        />
                      </label>
                    ) : config.type === 'date' ? (
                      <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                        ברירת מחדל
                        <input
                          type="date"
                          className="form-control"
                          value={config.defaultValue || ''}
                          onChange={(event) => handleTaskFieldDefaultChange(field.key, event.target.value)}
                          disabled={config.enabled === false}
                          style={{ marginTop: '5px' }}
                        />
                      </label>
                    ) : config.type === 'textarea' ? (
                      <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                        ברירת מחדל (אופציונלי)
                        <input
                          type="text"
                          className="form-control"
                          value={config.defaultValue || ''}
                          onChange={(event) => handleTaskFieldDefaultChange(field.key, event.target.value)}
                          disabled={config.enabled === false}
                          style={{ marginTop: '5px' }}
                          placeholder="טקסט ברירת מחדל..."
                        />
                      </label>
                    ) : (
                      <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                        ברירת מחדל (אופציונלי)
                        <input
                          type="text"
                          className="form-control"
                          value={config.defaultValue || ''}
                          onChange={(event) => handleTaskFieldDefaultChange(field.key, event.target.value)}
                          disabled={config.enabled === false}
                          style={{ marginTop: '5px' }}
                          placeholder="ערך ברירת מחדל..."
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}

            {/* שדות שנמחקו מהארגון (אפשרות שחזור) */}
            {(() => {
              const deletedFields = getAllTaskFieldDefinitions(localSettings.newTaskFields, { includeDeleted: true }).filter(f => f.deleted);
              if (deletedFields.length === 0) return null;
              return (
                <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#475569', margin: '0 0 8px' }}>
                    ➕ שדות שנמחקו מהארגון ({deletedFields.length})
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                    לחצו על שדה כדי לשחזר אותו בחזרה לרשימת השדות הפעילים בארגון:
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {deletedFields.map(df => (
                      <button
                        key={df.key}
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '14px' }}
                        onClick={() => handleRestoreTaskField(df.key, df.label)}
                        title={`שחזור השדה "${df.label}" לארגון`}
                      >
                        ➕ {df.label} {df.isCustom ? '(מותאם)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Section 3: Statuses List Management */}
        <div className="filter-panel">
          <h4 id="status-section-title" className="detail-section-title">🔄 ניהול סטטוסים וצבעי אינדיקציה</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            הוספה, הסרה, שינוי שם ובחירת צבע עבור שלבי הפרויקט. ניתן להגדיר סטטוסים שונים ונפרדים לכל לוח.
          </p>

          {/* Board selector for status editing - only when custom boards enabled */}
          {flags.enableCustomBoards && (
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '8px' }}>בחירת לוח להגדרת סטטוסים:</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {availableBoardsForStatuses.map(b => {
                  const isSelected = selectedStatusBoardId === b.id;
                  const isCustomBoardWithCustomStatuses = b.id !== 'active' && Array.isArray(b.statuses) && b.statuses.length > 0;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        padding: '7px 14px',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? '700' : '500',
                        borderRadius: '8px'
                      }}
                      onClick={() => {
                        setSelectedStatusBoardId(b.id);
                        setEditingIndex(null);
                      }}
                    >
                      {b.icon ? `${b.icon} ` : ''}{b.name}
                      {isCustomBoardWithCustomStatuses && (
                        <span style={{ marginInlineStart: '6px', fontSize: '0.72rem', opacity: 0.85, padding: '1px 5px', borderRadius: '4px', background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)' }}>
                          מותאם אישית
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Statuses Info / Toggle banner for non-default boards */}
          {!isDefaultBoard && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '16px',
              borderRadius: 'var(--radius-md)',
              background: hasCustomStatuses ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${hasCustomStatuses ? '#bbf7d0' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: hasCustomStatuses ? '#166534' : '#334155' }}>
                  {hasCustomStatuses ? '✨ לוח זה מוגדר עם סטטוסים מותאמים אישית' : 'ℹ️ לוח זה משתמש כרגע בסטטוסים של לוח ברירת המחדל'}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {hasCustomStatuses
                    ? 'שינויים ברשימה זו ישפיעו אך ורק על לוח זה.'
                    : 'באפשרותך להגדיר סטטוסים ייחודיים עבור לוח זה או להמשיך להשתמש בסטטוסי המערכת.'}
                </span>
              </div>
              {hasCustomStatuses ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                  onClick={() => handleToggleCustomStatusesForBoard(false)}
                >
                  ↩ איפוס וחזרה לסטטוסים גלובליים
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                  onClick={() => handleToggleCustomStatusesForBoard(true)}
                >
                  ⚙️ התאם אישית סטטוסים ללוח זה
                </button>
              )}
            </div>
          )}

          <div className="table-container" style={{ marginBottom: '20px', overflowX: 'auto' }}>
            <table className="task-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px' }}>שם הסטטוס</th>
                  <th style={{ padding: '8px', width: '200px' }}>צבע תצוגה</th>
                  <th style={{ padding: '8px', width: '120px' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {currentBoardStatuses.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px' }}>
                      אין סטטוסים מוגדרים ללוח זה.
                    </td>
                  </tr>
                ) : (
                  currentBoardStatuses.map((st, index) => {
                    const isEditing = editingIndex === index;
                    const currentColor = currentBoardStatusColors[st] || 'badge-frozen';

                    return (
                      <tr key={index}>
                        <td style={{ padding: '8px' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: '4px 8px', fontSize: '0.85rem', height: '28px' }}
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                            />
                          ) : (
                            <span className={`badge ${currentColor}`} style={{ display: 'inline-block', padding: '4px 10px', fontSize: '0.85rem', fontWeight: '600' }}>
                              {st}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select
                            className="form-control"
                            style={{ padding: '2px 8px', fontSize: '0.85rem', height: '28px' }}
                            value={currentColor}
                            onChange={(e) => handleColorChange(st, e.target.value)}
                          >
                            {PRESET_COLORS.map(color => (
                              <option key={color.value} value={color.value}>
                                {color.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {isEditing ? (
                              <>
                                <button
                                  className="btn btn-secondary btn-icon"
                                  style={{ padding: '4px', color: '#10b981', borderColor: '#10b981' }}
                                  onClick={() => saveEditedStatusName(index)}
                                >
                                  ✔️
                                </button>
                                <button
                                  className="btn btn-secondary btn-icon"
                                  style={{ padding: '4px', color: '#ef4444', borderColor: '#ef4444' }}
                                  onClick={() => setEditingIndex(null)}
                                >
                                  ❌
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn btn-secondary btn-icon"
                                  style={{ padding: '4px' }}
                                  title="שינוי שם הסטטוס"
                                  onClick={() => startEditing(index, st)}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn btn-danger btn-icon"
                                  style={{ padding: '4px' }}
                                  title="מחיקת הסטטוס"
                                  onClick={() => handleRemoveStatus(st)}
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Add Status Form */}
          <form onSubmit={handleAddStatus} className="form-grid-2col" style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>שם סטטוס חדש ללוח נבחר</label>
              <input
                type="text"
                className="form-control"
                placeholder="לדוגמה: בדיקות QA, מוכן לייצור..."
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>בחירת צבע</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  className="form-control"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                >
                  {PRESET_COLORS.map(color => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} disabled={saving || !newStatusName.trim()}>
                  ➕ הוספה
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Section 4: Default Workflow Settings */}
        <div className="filter-panel">
          <h4 className="detail-section-title">
            ⚙️ סטטוס ברירת מחדל {flags.enableCustomBoards ? (isDefaultBoard ? `(${defaultBoardName})` : `(${selectedBoardObj?.name || ''})`) : ''}
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
            הסטטוס שיוקצה אוטומטית לכל {flags.terms.item} חדש שנוצר{flags.enableCustomBoards ? ' בלוח הנבחר' : ''}.
          </p>
          <div className="form-group" style={{ maxWidth: '350px' }}>
            <select
              className="form-control"
              value={currentBoardDefaultStatus}
              onChange={(e) => handleDefaultStatusChange(e.target.value)}
            >
              {currentBoardStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 5: Boards Management (v2 only) */}
        {flags.enableCustomBoards && (
          <div className="filter-panel">
            <h4 className="detail-section-title">📋 {flags.terms.boardManagement} במערכת</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              ניהול הלוחות המוצגים בסרגל הראשי. לוח "{defaultBoardName}" הוא לוח ברירת המחדל.
            </p>

            <div className="table-container" style={{ marginBottom: '20px' }}>
              <table className="task-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center' }}>סדר</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>אייקון</th>
                    <th>שם הלוח</th>
                    <th style={{ width: '180px' }}>סוג וסטטוסים</th>
                    <th style={{ width: '150px' }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedBoards.map((board, index) => {
                    const isDefault = board.id === 'active';
                    const isEditing = editingBoardId === board.id;
                    const isShared = isBoardSharedWithOrg(localSettings, board.id);
                    const isCustomStatus = !isDefault && Array.isArray(board.statuses) && board.statuses.length > 0;
                    const boardName = isDefault ? defaultBoardName : board.name;
                    const boardIcon = isDefault ? defaultBoardIcon : (board.icon || '📁');

                    return (
                      <tr key={board.id}>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon"
                              style={{ padding: '3px 6px', fontSize: '0.75rem', opacity: index === 0 ? 0.35 : 1 }}
                              disabled={index === 0}
                              onClick={() => handleMoveBoardUp(index)}
                              title="העבר לוח למעלה"
                            >
                              ⬆️
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon"
                              style={{ padding: '3px 6px', fontSize: '0.75rem', opacity: index === orderedBoards.length - 1 ? 0.35 : 1 }}
                              disabled={index === orderedBoards.length - 1}
                              onClick={() => handleMoveBoardDown(index)}
                              title="העבר לוח למטה"
                            >
                              ⬇️
                            </button>
                          </div>
                        </td>
                        <td style={{ fontSize: '1.2rem', textAlign: 'center' }}>
                          {isEditing ? (
                            <select
                              className="form-control"
                              style={{ padding: '2px 4px', fontSize: '1rem', width: '60px' }}
                              value={editingBoardIcon}
                              onChange={e => setEditingBoardIcon(e.target.value)}
                            >
                              {PRESET_BOARD_ICONS.map(ic => (
                                <option key={ic} value={ic}>{ic}</option>
                              ))}
                            </select>
                          ) : (
                            boardIcon
                          )}
                        </td>
                        <td style={{ fontWeight: isDefault ? '700' : '600' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={editingBoardName}
                                  onChange={e => setEditingBoardName(e.target.value)}
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveEditedBoard(board.id);
                                    if (e.key === 'Escape') setEditingBoardId(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                  onClick={() => saveEditedBoard(board.id)}
                                >
                                  שמור
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                  onClick={() => setEditingBoardId(null)}
                                >
                                  ביטול
                                </button>
                              </div>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="תת-כותרת / קישור ללוח (אופציונלי)"
                                value={editingBoardSubtitle}
                                onChange={e => setEditingBoardSubtitle(e.target.value)}
                                style={{ fontSize: '0.82rem', padding: '3px 8px' }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveEditedBoard(board.id);
                                  if (e.key === 'Escape') setEditingBoardId(null);
                                }}
                              />
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={editingBoardIsShared}
                                    onChange={e => setEditingBoardIsShared(e.target.checked)}
                                    style={{ width: '15px', height: '15px' }}
                                  />
                                  <span>🌐 שתף פרויקטים בלוח זה עם כל חברי הארגון</span>
                                </label>

                                {!editingBoardIsShared && (
                                  <div style={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    padding: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    marginTop: '4px'
                                  }}>
                                    <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '600' }}>
                                      🔒 חברי צוות שותפים בלוח פרטי:
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <input
                                        type="email"
                                        className="form-control"
                                        style={{ fontSize: '0.8rem', padding: '2px 6px' }}
                                        placeholder="אימייל חבר/ת צוות..."
                                        value={editingBoardEmailInput}
                                        onChange={e => setEditingBoardEmailInput(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const em = editingBoardEmailInput.trim().toLowerCase();
                                            if (em && em.includes('@') && !editingBoardSharedEmails.some(x => x.toLowerCase() === em)) {
                                              setEditingBoardSharedEmails([...editingBoardSharedEmails, em]);
                                              setEditingBoardEmailInput('');
                                            }
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                        onClick={() => {
                                          const em = editingBoardEmailInput.trim().toLowerCase();
                                          if (em && em.includes('@') && !editingBoardSharedEmails.some(x => x.toLowerCase() === em)) {
                                            setEditingBoardSharedEmails([...editingBoardSharedEmails, em]);
                                            setEditingBoardEmailInput('');
                                          }
                                        }}
                                      >
                                        ➕
                                      </button>
                                    </div>
                                    {contactsWithEmails.length > 0 && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {contactsWithEmails.slice(0, 4).map(c => {
                                          const em = (c.email || '').trim().toLowerCase();
                                          if (!em || editingBoardSharedEmails.some(x => x.toLowerCase() === em)) return null;
                                          return (
                                            <button
                                              key={c.id || em}
                                              type="button"
                                              className="btn btn-secondary"
                                              style={{ padding: '1px 6px', fontSize: '0.7rem', borderRadius: '10px' }}
                                              onClick={() => setEditingBoardSharedEmails([...editingBoardSharedEmails, em])}
                                            >
                                              + {c.name || em}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {editingBoardSharedEmails.length > 0 && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {editingBoardSharedEmails.map(em => (
                                          <span
                                            key={em}
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              backgroundColor: '#e0e7ff',
                                              color: '#3730a3',
                                              padding: '2px 8px',
                                              borderRadius: '12px',
                                              fontSize: '0.75rem'
                                            }}
                                          >
                                            {em}
                                            <button
                                              type="button"
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#4338ca' }}
                                              onClick={() => setEditingBoardSharedEmails(editingBoardSharedEmails.filter(x => x !== em))}
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
                            ) : (
                            <div>
                              <div>{boardName} {isDefault ? '(ברירת מחדל)' : ''}</div>
                              {(isDefault ? localSettings.boardSubtitle : board.subtitle) && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '400', marginTop: '2px' }}>
                                  {isDefault ? localSettings.boardSubtitle : board.subtitle}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '999px', background: isDefault ? '#dbeafe' : '#f1f5f9', color: isDefault ? '#1e40af' : '#475569', fontWeight: '700' }}>
                              {isDefault ? 'ברירת מחדל ראשית' : 'לוח מותאם אישית'}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: isShared ? '#1d4ed8' : '#64748b', fontWeight: '600' }}>
                              {isShared ? '🌐 משותף עם הארגון' : '🔒 לוח פרטי'}
                            </span>
                            {!isDefault && (
                              <span style={{ fontSize: '0.72rem', color: isCustomStatus ? '#166534' : 'var(--text-muted)', fontWeight: isCustomStatus ? '700' : '500' }}>
                                {isCustomStatus ? `✨ סטטוסים ייחודיים (${board.statuses?.length || 0})` : '🌐 סטטוסים גלובליים'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {!isEditing && (
                            <div className="actions-cell">
                              <button
                                type="button"
                                className="btn btn-secondary btn-icon"
                                style={{ padding: '4px' }}
                                title="עריכת סטטוסי לוח"
                                onClick={() => {
                                  setSelectedStatusBoardId(board.id);
                                  const el = document.getElementById('status-section-title');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                              >
                                🔄
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-icon"
                                style={{ padding: '4px' }}
                                title="עריכת לוח"
                                onClick={() => startEditingBoard({ id: board.id, name: boardName, icon: boardIcon })}
                              >
                                ✏️
                              </button>
                              {!isDefault && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-icon"
                                  style={{ padding: '4px' }}
                                  title="מחיקת לוח"
                                  onClick={() => handleRemoveBoard(board.id)}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Board Form */}
            <form onSubmit={handleAddBoard} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-grid-2col" style={{ margin: 0 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>שם לוח חדש</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="לדוגמה: דפוס, מיתוג, סניף צפון..."
                    value={newBoardName}
                    onChange={e => setNewBoardName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>אייקון לוח</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      className="form-control"
                      value={newBoardIcon}
                      onChange={e => setNewBoardIcon(e.target.value)}
                      style={{ width: '80px', fontSize: '1.1rem' }}
                    >
                      {PRESET_BOARD_ICONS.map(ic => (
                        <option key={ic} value={ic}>{ic}</option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} disabled={saving || !newBoardName.trim()}>
                      ➕ הוספת לוח
                    </button>
                  </div>
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>תת-כותרת / קישור ללוח (אופציונלי)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="הזן תת-כותרת או קישור..."
                  value={newBoardSubtitle}
                  onChange={e => setNewBoardSubtitle(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={newBoardIsShared}
                    onChange={e => setNewBoardIsShared(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>🌐 שתף פרויקטים בלוח זה עם כל חברי הארגון</span>
                </label>
              </div>

              {!newBoardIsShared && (
                <div style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>
                    🔒 שיתוף חברי צוות בלוח פרטי:
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="email"
                      className="form-control"
                      style={{ fontSize: '0.82rem' }}
                      placeholder="הזן אימייל חבר צוות..."
                      value={newBoardEmailInput}
                      onChange={e => setNewBoardEmailInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const em = newBoardEmailInput.trim().toLowerCase();
                          if (em && em.includes('@') && !newBoardSharedEmails.some(x => x.toLowerCase() === em)) {
                            setNewBoardSharedEmails([...newBoardSharedEmails, em]);
                            setNewBoardEmailInput('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                      onClick={() => {
                        const em = newBoardEmailInput.trim().toLowerCase();
                        if (em && em.includes('@') && !newBoardSharedEmails.some(x => x.toLowerCase() === em)) {
                          setNewBoardSharedEmails([...newBoardSharedEmails, em]);
                          setNewBoardEmailInput('');
                        }
                      }}
                    >
                      ➕ הוסף
                    </button>
                  </div>
                  {contactsWithEmails.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {contactsWithEmails.slice(0, 5).map(c => {
                        const em = (c.email || '').trim().toLowerCase();
                        if (!em || newBoardSharedEmails.some(x => x.toLowerCase() === em)) return null;
                        return (
                          <button
                            key={c.id || em}
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '12px' }}
                            onClick={() => setNewBoardSharedEmails([...newBoardSharedEmails, em])}
                          >
                            + {c.name || em}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {newBoardSharedEmails.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {newBoardSharedEmails.map(em => (
                        <span
                          key={em}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3',
                            padding: '3px 10px',
                            borderRadius: '16px',
                            fontSize: '0.8rem'
                          }}
                        >
                          ✉️ {em}
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#4338ca' }}
                            onClick={() => setNewBoardSharedEmails(newBoardSharedEmails.filter(x => x !== em))}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Section: Export User Content & Projects to Excel */}
        <div
          id="excel-export-section"
          className="filter-panel"
          style={{
            border: '1px solid #bbf7d0',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
            <h4 className="detail-section-title" style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📥 ייצוא וגיבוי כל תוכן המשתמש לאקסל (Excel Export)</span>
            </h4>
            <span style={{
              padding: '4px 12px',
              borderRadius: '999px',
              fontWeight: '700',
              fontSize: '0.8rem',
              background: '#dcfce7',
              color: '#15803d',
              border: '1px solid #86efac'
            }}>
              📊 חוברת עבודה רב-גיליונית (.xlsx)
            </span>
          </div>

          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '16px' }}>
            ייצוא של כל הפרויקטים, המשימות, ההערות הפנימיות, התגובות, תתי-המשימות, אנשי הקשר והספקים של המשתמש והארגון לקובץ אקסל מסודר.
            <strong style={{ color: '#166534', display: 'block', marginTop: '4px' }}>
              🔗 כל הקישורים לקבצי הזמנת העבודה, הפלנוגרמה ותיקיות ה-Drive לחיצים ישירות מתוך קובץ האקסל!
            </strong>
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
            marginBottom: '16px',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '0.83rem', color: '#1e293b' }}>
              <span style={{ display: 'block', fontWeight: '700', color: '#15803d' }}>📋 גיליון פרויקטים</span>
              פרטים מלאים, קישורים לחיצים לקבצים ולדרייב, הערות ושדות מותאמים
            </div>
            <div style={{ fontSize: '0.83rem', color: '#1e293b' }}>
              <span style={{ display: 'block', fontWeight: '700', color: '#15803d' }}>📁 גיליון קבצים ומסמכים</span>
              טבלת כל קבצי הזמנות העבודה והפלנוגרמות עם קישורי פתיחה ישירים
            </div>
            <div style={{ fontSize: '0.83rem', color: '#1e293b' }}>
              <span style={{ display: 'block', fontWeight: '700', color: '#15803d' }}>💬 גיליון תגובות</span>
              כל ההודעות, התכתובות וקבצים מצורפים לתגובות בכל הפרויקטים
            </div>
            <div style={{ fontSize: '0.83rem', color: '#1e293b' }}>
              <span style={{ display: 'block', fontWeight: '700', color: '#15803d' }}>✅ גיליון תתי-משימות</span>
              מעקב ביצוע של כל תת-משימה, צ'קליסט וסטטוס השלמה
            </div>
            <div style={{ fontSize: '0.83rem', color: '#1e293b' }}>
              <span style={{ display: 'block', fontWeight: '700', color: '#15803d' }}>👥 ספקים ואנשי קשר</span>
              פרטי יצירת קשר, טלפונים, אימיילים והערות ספקים
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #cbd5e1'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600', color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={exportIncludeTrash}
                onChange={(e) => setExportIncludeTrash(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#059669' }}
                disabled={isExporting}
              />
              <span>כלול גם פרויקטים מסל המחזור (פרויקטים שנמחקו)</span>
            </label>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportToExcel}
              disabled={isExporting}
              style={{
                backgroundColor: '#059669',
                borderColor: '#047857',
                padding: '10px 22px',
                fontSize: '0.95rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                cursor: isExporting ? 'wait' : 'pointer'
              }}
            >
              {isExporting ? (
                <>⏳ מפיק ומייצא קובץ אקסל... אנא המתן...</>
              ) : (
                <>📥 ייצא את כל הנתונים לקובץ Excel (.xlsx)</>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Floating Save Panel at the bottom */}
      <div className="filter-panel flex-between" style={{ marginTop: '24px', backgroundColor: '#f8fafc' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          שמירת ההגדרות תעדכן את טופס ה{flags.terms.item} והלוח עבור כלל משתמשי הארגון באופן מיידי.
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onBack} disabled={saving}>
            ביטול
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ שומר...' : '💾 שמור הגדרות עכשיו'}
          </button>
        </div>
      </div>

      {/* Modal: Add New Custom Field */}
      {isAddFieldModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title">➕ הוספת שדה {flags.terms.item} חדש לארגון</h3>
              <button type="button" className="close-btn" onClick={() => setIsAddFieldModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddNewCustomField}>
              <div className="modal-body" style={{ display: 'grid', gap: '14px', padding: '20px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>שם השדה ואייקון *</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        openIconPicker({
                          title: 'בחירת אייקון לשדה החדש',
                          currentIcon: newFieldIcon,
                          defaultIcon: '✨',
                          onSelect: (selectedIcon) => setNewFieldIcon(selectedIcon)
                        });
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '1.3rem',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title="בחירת אייקון מתוך מאגר אייקונים נרחב"
                    >
                      {newFieldIcon}
                    </button>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="לדוגמה: ברקוד, מחלקה, תאריך יעד, הערות ספק..."
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      autoFocus
                      required
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>סוג השדה</label>
                  <select
                    className="form-control"
                    value={newFieldType}
                    onChange={(e) => {
                      setNewFieldType(e.target.value);
                      if (e.target.value !== 'select') setNewFieldOptions('');
                    }}
                  >
                    {FIELD_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {newFieldType === 'select' && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>אפשרויות בחירה (מופרדות בפסיקים) *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="לדוגמה: אופציה 1, אופציה 2, אופציה 3"
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                    />
                    <small style={{ color: 'var(--text-muted)' }}>הזינו את הערכים מופרדים בפסיק (,)</small>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>סגנון תצוגה</label>
                  <select
                    className="form-control"
                    value={newFieldStyle}
                    onChange={(e) => setNewFieldStyle(e.target.value)}
                  >
                    {NEW_TASK_FIELD_STYLES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>ערך ברירת מחדל (אופציונלי)</label>
                  {newFieldType === 'select' ? (
                    <select
                      className="form-control"
                      value={newFieldDefaultValue}
                      onChange={(e) => setNewFieldDefaultValue(e.target.value)}
                    >
                      <option value="">(ללא ברירת מחדל)</option>
                      {newFieldOptions.split(',').map(o => o.trim()).filter(Boolean).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : newFieldType === 'checkbox' ? (
                    <select
                      className="form-control"
                      value={newFieldDefaultValue}
                      onChange={(e) => setNewFieldDefaultValue(e.target.value)}
                    >
                      <option value="">ללא / כבוי</option>
                      <option value="true">מסומן (כן)</option>
                      <option value="false">לא מסומן (לא)</option>
                    </select>
                  ) : newFieldType === 'number' ? (
                    <input
                      type="number"
                      className="form-control"
                      value={newFieldDefaultValue}
                      onChange={(e) => setNewFieldDefaultValue(e.target.value)}
                    />
                  ) : newFieldType === 'date' ? (
                    <input
                      type="date"
                      className="form-control"
                      value={newFieldDefaultValue}
                      onChange={(e) => setNewFieldDefaultValue(e.target.value)}
                    />
                  ) : (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ערך ברירת מחדל..."
                      value={newFieldDefaultValue}
                      onChange={(e) => setNewFieldDefaultValue(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddFieldModalOpen(false)}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary">
                  ➕ הוספת שדה
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for confirming task field deletion from organization */}
      {fieldToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setFieldToDelete(null)}>
          <div className="modal-content confirm-dialog" style={{ maxWidth: '420px', textAlign: 'center', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '10px' }}>מחיקת שדה מהארגון</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5, fontSize: '0.9rem' }}>
              האם את/ה בטוח/ה שברצונך למחוק את השדה <strong style={{ color: '#1e293b' }}>"{fieldToDelete.label}"</strong> מהגדרות הארגון?
              <br />
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>השדה לא יופיע עוד בפרויקטים חדשים או קיימים. תוכל/י לשחזר אותו בכל עת מתחתית הרשימה.</span>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFieldToDelete(null)}
                style={{ flex: 1 }}
              >
                ביטול
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDeleteTaskField}
                style={{ flex: 1 }}
              >
                מחק שדה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {isCancelModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            direction: 'rtl',
            fontFamily: 'Rubik, sans-serif'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCancelling) {
              setIsCancelModalOpen(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '520px',
              width: '100%',
              padding: '28px 24px',
              textAlign: 'right',
              boxSizing: 'border-box',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  flexShrink: 0
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                  ביטול מנוי והוראת קבע
                </h3>
                <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
                  עבור ארגון: <strong style={{ color: '#1e293b' }}>{effectiveOrgName}</strong>
                </span>
              </div>
            </div>

            {/* Warning Details */}
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '18px',
                color: '#9f1239',
                fontSize: '0.88rem',
                lineHeight: '1.5'
              }}
            >
              <div style={{ fontWeight: '700', marginBottom: '6px' }}>
                שימו לב למשמעות הביטול:
              </div>
              <ul style={{ margin: 0, paddingRight: '18px' }}>
                <li>הוראת הקבע החודשית ב־Tranzila <strong>תבוטל מיידית</strong> ולא יבוצעו חיובים נוספים בכרטיס האשראי.</li>
                <li>
                  הגישה ללוחות העבודה של TikTak תישאר פתוחה עד תום התקופה שכבר שולמה ({accessUntilFormatted || 'סוף החודש'}).
                </li>
                <li>בתום התקופה, הגישה תיחסם עד להפעלת מנוי מחדש.</li>
              </ul>
            </div>

            {/* Optional Reason Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                סיבת הביטול (אופציונלי):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="למשל: סיום פרויקט, הפסקה זמנית וכו'"
                disabled={isCancelling}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Modal Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                חזרה להגדרות (אל תבטל)
              </button>

              <button
                type="button"
                onClick={handleConfirmCancelSubscription}
                disabled={isCancelling}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.92rem',
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                  fontFamily: 'inherit'
                }}
              >
                {isCancelling ? (
                  <>
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ffffff',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}
                    />
                    <span>מבטל הוראת קבע בטרנזילה...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>כן, בטל את המנוי והוראת הקבע</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew / Reactivate Payment Modal */}
      {isRenewPaymentModalOpen && (
        <PaymentModal
          isOpen={isRenewPaymentModalOpen}
          onClose={() => setIsRenewPaymentModalOpen(false)}
          organization={orgData || { id: organizationId, name: effectiveOrgName, reopenPrice: monthlyPrice }}
          user={{ uid: userId, email: userEmail }}
          amount={monthlyPrice}
          onPaymentSuccess={() => {
            setIsRenewPaymentModalOpen(false);
            showMsg('המנוי חודש בהצלחה!', 'success');
          }}
        />
      )}

      {/* Extensive Icon Picker Modal */}
      <IconPickerModal
        isOpen={iconPickerState.isOpen}
        title={iconPickerState.title}
        currentIcon={iconPickerState.currentIcon}
        defaultIcon={iconPickerState.defaultIcon}
        onSelectIcon={(selectedIcon) => {
          if (iconPickerState.onSelect) {
            iconPickerState.onSelect(selectedIcon);
          }
          closeIconPicker();
        }}
        onClose={closeIconPicker}
      />

    </main>
  );
}
