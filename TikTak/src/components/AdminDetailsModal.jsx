import React, { useCallback, useState, useEffect } from 'react';
import { getCommentsForTask, addComment, deleteComment, updateTask, getPrivateNotes, uploadFileToStorage, addContact, updateContact, addSupplier, updateSupplier, getOrCreateOrganizationShareToken } from '../utils/storage';
const ExcelPreviewModal = React.lazy(() => import('./ExcelPreviewModal'));
const PdfPreviewModal = React.lazy(() => import('./PdfPreviewModal'));
const ImagePreviewModal = React.lazy(() => import('./ImagePreviewModal'));
import PlanogramFileCard from './PlanogramFileCard';
import PlanogramIndicator from './PlanogramIndicator';
import { normalizeNewTaskFields, getAllTaskFieldDefinitions } from '../data/taskFieldConfig';
import { getBoardStatusConfig } from '../utils/boardStatusHelper';
import { getFeatureFlags } from '../utils/featureFlags';

function getSundayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = d.getDate() - day; // Adjust to Sunday
  const sunday = new Date(d.setDate(diff));
  const yyyy = sunday.getFullYear();
  const mm = String(sunday.getMonth() + 1).padStart(2, '0');
  const dd = String(sunday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDayDate(sundayStr, offset) {
  const [yyyy, mm, dd] = sundayStr.split('-').map(Number);
  const sunday = new Date(yyyy, mm - 1, dd);
  const targetDate = new Date(sunday);
  targetDate.setDate(sunday.getDate() + offset);
  const tDd = String(targetDate.getDate()).padStart(2, '0');
  const tMm = String(targetDate.getMonth() + 1).padStart(2, '0');
  return `${tDd}/${tMm}`;
}

function getMonthlySummary(weeklyHoursObj) {
  if (!weeklyHoursObj) return {};

  const monthlyTotals = {};

  if (weeklyHoursObj.sunday !== undefined || weeklyHoursObj.monday !== undefined) {
    const currentWeekSunday = getSundayOfWeek(new Date());
    const [yyyy, mm, dd] = currentWeekSunday.split('-').map(Number);

    const days = [
      { key: 'sunday', offset: 0 },
      { key: 'monday', offset: 1 },
      { key: 'tuesday', offset: 2 },
      { key: 'wednesday', offset: 3 },
      { key: 'thursday', offset: 4 }
    ];

    days.forEach(day => {
      const hours = weeklyHoursObj[day.key] || 0;
      if (hours > 0) {
        const d = new Date(yyyy, mm - 1, dd + day.offset);
        const monthName = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
        monthlyTotals[monthName] = (monthlyTotals[monthName] || 0) + hours;
      }
    });

    Object.keys(monthlyTotals).forEach(month => {
      monthlyTotals[month] = Number(monthlyTotals[month].toFixed(2));
    });
    return monthlyTotals;
  }

  Object.entries(weeklyHoursObj).forEach(([sundayStr, weekData]) => {
    if (!sundayStr.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    const [yyyy, mm, dd] = sundayStr.split('-').map(Number);

    const days = [
      { key: 'sunday', offset: 0 },
      { key: 'monday', offset: 1 },
      { key: 'tuesday', offset: 2 },
      { key: 'wednesday', offset: 3 },
      { key: 'thursday', offset: 4 }
    ];

    days.forEach(day => {
      const hours = weekData[day.key] || 0;
      if (hours > 0) {
        const d = new Date(yyyy, mm - 1, dd + day.offset);
        const monthName = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
        monthlyTotals[monthName] = (monthlyTotals[monthName] || 0) + hours;
      }
    });
  });

  Object.keys(monthlyTotals).forEach(month => {
    monthlyTotals[month] = Number(monthlyTotals[month].toFixed(2));
  });

  return monthlyTotals;
}

export default function AdminDetailsModal({
  task,
  settings,
  contacts: CONTACTS = [],
  onClose,
  onSave,
  onDelete,
  onRefresh,
  onTaskUpdated,
  onStatusChange,
  startInEditMode = false,
  initialBoardId = 'active',
  userId,
  organizationId
}) {
  const isCreateMode = !task;
  const [createBoardId, setCreateBoardId] = useState(task?.boardId || initialBoardId || 'active');

  const targetBoardId = isCreateMode ? (createBoardId || 'active') : (task?.boardId || 'active');
  const boardStatusConfig = React.useMemo(() => (
    getBoardStatusConfig(settings, targetBoardId)
  ), [settings, targetBoardId]);

  const STATUSES = boardStatusConfig.statuses;
  const STATUS_CLASSES = boardStatusConfig.statusColors;
  const DEFAULT_STATUS = boardStatusConfig.defaultStatus;

  const {
    hideWeeklyHours = false
  } = settings || {};

  const flags = getFeatureFlags(settings);

  const newTaskFields = React.useMemo(() => normalizeNewTaskFields(settings?.newTaskFields), [settings?.newTaskFields]);
  const allFieldDefinitions = React.useMemo(() => getAllTaskFieldDefinitions(settings?.newTaskFields, {
    taskFieldOrder: settings?.taskFieldOrder
  }), [settings?.newTaskFields, settings?.taskFieldOrder]);
  const customFieldDefinitions = React.useMemo(() => allFieldDefinitions.filter(f => f.isCustom), [allFieldDefinitions]);

  const isNewTaskFieldEnabled = (fieldKey) => Boolean(newTaskFields[fieldKey] && newTaskFields[fieldKey].enabled !== false && !newTaskFields[fieldKey].deleted);
  const isFieldExcludedForTask = React.useCallback((fieldKey) => {
    if (!flags.enableFieldExclusion) return false;
    return Array.isArray(task?.excludedFields) && task.excludedFields.includes(fieldKey);
  }, [flags.enableFieldExclusion, task?.excludedFields]);

  const isFieldVisibleForTask = React.useCallback((fieldKey) => {
    if (isFieldExcludedForTask(fieldKey)) return false;
    // Always show if task has existing data to prevent hiding previous version data
    if (task) {
      if (fieldKey === 'contactPerson' && (task.contactPerson || task.supplierContactName)) return true;
      if (fieldKey === 'supplierContactEmail' && (task.supplierContactEmail || task.contactEmail || task.email || task.supplierEmail)) return true;
      if (fieldKey === 'planogramFile' && (task.planogramFile || task.planogram)) return true;
      if (fieldKey === 'workOrderFiles' && (task.workOrderFile || (Array.isArray(task.workOrderFiles) ? task.workOrderFiles.length > 0 : Array.isArray(task.attachments) && task.attachments.length > 0))) return true;
    }
    return isNewTaskFieldEnabled(fieldKey);
  }, [isFieldExcludedForTask, isNewTaskFieldEnabled, task]);

  const excludedFieldsList = React.useMemo(() => {
    if (!flags.enableFieldExclusion || !task || !Array.isArray(task.excludedFields) || task.excludedFields.length === 0) return [];
    return task.excludedFields.map(key => {
      const fieldDef = allFieldDefinitions.find(f => f.key === key) || { key, label: key };
      return { key, label: fieldDef.label || key };
    });
  }, [flags.enableFieldExclusion, task, allFieldDefinitions]);

  const getNewTaskFieldLabel = (fieldKey) => newTaskFields[fieldKey]?.label || fieldKey;
  const getNewTaskFieldOptions = (fieldKey) => newTaskFields[fieldKey]?.options || [];
  const getNewTaskFieldStyle = (fieldKey) => {
    const style = newTaskFields[fieldKey]?.style;
    if (style === 'highlighted') {
      return { padding: '14px', border: '1px solid #c7d2fe', borderRadius: '10px', background: '#f8faff' };
    }
    if (style === 'compact') {
      return { padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' };
    }
    return undefined;
  };

  const defaultContactPerson = newTaskFields.contactPerson?.defaultValue || '';
  const defaultSupplierContactEmail = newTaskFields.supplierContactEmail?.defaultValue || '';
  const defaultDiecutsStatus = newTaskFields.diecutsStatus?.defaultValue || 'אין';
  const defaultImagesStatus = newTaskFields.imagesStatus?.defaultValue || 'אין';
  const defaultStandardsInstituteRequired = newTaskFields.standardsInstituteRequired?.defaultValue || 'לא';

  const availableBoards = React.useMemo(() => {
    const defaultBoard = {
      id: 'active',
      name: settings?.boardTitle || (flags.isLegacy ? 'עבודות פעילות' : 'פרויקטים פעילים'),
      icon: settings?.boardIcon || (flags.isLegacy ? '📁' : '📋')
    };
    const customBoards = (settings?.boards || []).filter(b => b && b.id !== 'active');
    return [defaultBoard, ...customBoards];
  }, [settings?.boards, settings?.boardTitle, settings?.boardIcon, flags.isLegacy]);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [excelPreviewFile, setExcelPreviewFile] = useState(null);
  const [pdfPreviewFile, setPdfPreviewFile] = useState(null);
  const [imagePreviewFile, setImagePreviewFile] = useState(null);
  const [isReplacingPlanogram, setIsReplacingPlanogram] = useState(false);

  const handlePreviewFile = (file) => {
    if (!file || !file.url) return;
    const fileName = file.name || '';
    if (/\.pdf$/i.test(fileName)) {
      setPdfPreviewFile({ url: file.url, name: fileName });
    } else if (/\.(xlsx|xls)$/i.test(fileName)) {
      setExcelPreviewFile({ url: file.url, name: fileName });
    } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)) {
      setImagePreviewFile({ url: file.url, name: fileName });
    } else {
      window.open(file.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadFile = async (file, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!file || !file.url) return;
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
      const blobUrl = URL.createObjectURL(await response.blob());
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = file.name || 'file';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download file', error);
      const fallbackLink = document.createElement('a');
      fallbackLink.href = file.url;
      fallbackLink.download = file.name || 'file';
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      fallbackLink.click();
    }
  };

  const handleCopyTaskLink = async () => {
    if (!task) return;
    try {
      const shareToken = await getOrCreateOrganizationShareToken(organizationId);
      const shareUrl = `${window.location.origin}${window.location.pathname}?mode=viewer&userId=${userId}&organizationId=${organizationId}&shareToken=${shareToken}&taskId=${task.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  const handleCopyEmail = (emailStr) => {
    if (!emailStr) return;
    navigator.clipboard.writeText(emailStr)
      .then(() => {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy email", err);
      });
  };

  // View state: comments
  const [comments, setComments] = useState([]);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [showPlanogramDeleteConfirm, setShowPlanogramDeleteConfirm] = useState(false);
  const [fieldToExclude, setFieldToExclude] = useState(null); // { key, label }
  const commentAuthorName = 'מנהל/ת תיקתק';
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [subtaskError, setSubtaskError] = useState('');
  const [subtasksDraft, setSubtasksDraft] = useState([]);
  const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(false);
  const [savingSubtasks, setSavingSubtasks] = useState(false);

  const [attachedFile, setAttachedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadErrorFile, setUploadErrorFile] = useState('');
  const [uploadProgressFile, setUploadProgressFile] = useState(0);

  // Inline Editing Mode States
  const [activeEditField, setActiveEditField] = useState(null);
  const [activeInfoCard, setActiveInfoCard] = useState(null);
  const [activeCardEditField, setActiveCardEditField] = useState(null);
  const [isSavingInfoCard, setIsSavingInfoCard] = useState(false);

  const handleOpenContactCard = (contactName) => {
    if (!contactName) return;
    setActiveCardEditField(null);
    const contact = CONTACTS.find(c => (typeof c === 'string' ? c : c?.name)?.trim().toLowerCase() === contactName.trim().toLowerCase());
    const contactObj = contact || {
      name: contactName,
      phone: task?.phone || task?.contactPhone || task?.supplierContactPhone || '',
      email: task?.supplierContactEmail || task?.contactEmail || task?.email || task?.supplierEmail || '',
      role: task?.contactRole || ''
    };
    setActiveInfoCard({
      type: 'contact',
      title: `📇 כרטיס איש קשר: ${contactObj.name}`,
      contactId: contactObj.id,
      fields: [
        { key: 'name', label: 'שם מלא', value: contactObj.name },
        { key: 'role', label: 'תפקיד', value: contactObj.role || '' },
        { key: 'phone', label: 'טלפון', value: contactObj.phone || '', isLtr: true, type: 'phone' },
        { key: 'email', label: 'אימייל', value: contactObj.email || '', isLtr: true, type: 'email' },
        { key: 'address', label: 'כתובת', value: contactObj.address || '' },
        { key: 'wechat', label: 'WeChat / WhatsApp', value: contactObj.wechat || '', isLtr: true, type: 'whatsapp' },
        { key: 'notes', label: 'הערות ומידע נוסף', value: contactObj.notes || '', isMultiline: true }
      ]
    });
  };

  const updateInfoCardField = (index, value) => {
    setActiveInfoCard((current) => ({
      ...current,
      title: current.fields[index].key === 'name' ? (current.type === 'supplier' ? `📇 כרטיס ספק: ${value}` : `📇 כרטיס איש קשר: ${value}`) : current.title,
      fields: current.fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, value } : field)
    }));
  };

  const saveInfoCard = async () => {
    if (!activeInfoCard) return;
    const fieldsData = Object.fromEntries(activeInfoCard.fields.map(({ key, value }) => [key, (value || '').trim()]));
    if (!fieldsData.name) return;

    setIsSavingInfoCard(true);
    try {
      if (activeInfoCard.type === 'contact') {
        const contactId = activeInfoCard.contactId;
        if (contactId) {
          await updateContact(contactId, fieldsData);
        } else {
          await addContact(fieldsData, userId);
        }
      } else if (activeInfoCard.type === 'supplier') {
        const supplierId = activeInfoCard.supplierId;
        if (supplierId) {
          await updateSupplier(supplierId, fieldsData);
        } else {
          await addSupplier(fieldsData, userId);
        }
      }
      setActiveInfoCard(null);
      setActiveCardEditField(null);
    } catch (error) {
      console.error('Failed to save card', error);
    } finally {
      setIsSavingInfoCard(false);
    }
  };

  // States for temporary field values while editing inline
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editSupplierContactEmail, setEditSupplierContactEmail] = useState('');
  const [editInternalNotes, setEditInternalNotes] = useState('');
  const [editCustomValue, setEditCustomValue] = useState('');

  // States for CREATE mode (full form)
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createContactPerson, setCreateContactPerson] = useState(defaultContactPerson);
  const [createSupplierContactEmail, setCreateSupplierContactEmail] = useState(defaultSupplierContactEmail);
  const [createDiecutsStatus, setCreateDiecutsStatus] = useState(defaultDiecutsStatus);
  const [createImagesStatus, setCreateImagesStatus] = useState(defaultImagesStatus);
  const [createStandardsInstituteRequired, setCreateStandardsInstituteRequired] = useState(defaultStandardsInstituteRequired);
  const [createStatus, setCreateStatus] = useState(DEFAULT_STATUS || 'חדש');
  const [createInternalNotes, setCreateInternalNotes] = useState('');
  const [createAttachments, setCreateAttachments] = useState([]);
  const [createPlanogramFile, setCreatePlanogramFile] = useState(null);
  const [createCustomFields, setCreateCustomFields] = useState(() => {
    const initial = {};
    customFieldDefinitions.forEach(f => {
      initial[f.key] = f.defaultValue ?? '';
    });
    return initial;
  });

  const handleSelectCreateBoard = (bId) => {
    setCreateBoardId(bId);
    const targetConfig = getBoardStatusConfig(settings, bId);
    if (!targetConfig.statuses.includes(createStatus)) {
      setCreateStatus(targetConfig.defaultStatus);
    }
  };

  // Common upload/error states for files
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [totalUploadCount, setTotalUploadCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [planogramDragActive, setPlanogramDragActive] = useState(false);
  const [errors, setErrors] = useState({});

  // Quick-edit states for View Mode (Status)
  const [quickStatus, setQuickStatus] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');

  // Weekly hours states
  const [activeSunday, setActiveSunday] = useState(() => getSundayOfWeek(new Date()));
  const [savingHours, setSavingHours] = useState(false);
  const [hoursState, setHoursState] = useState({
    sunday: '0',
    monday: '0',
    tuesday: '0',
    wednesday: '0',
    thursday: '0'
  });

  // Planogram creation upload states
  const [uploadingPlanogram, setUploadingPlanogram] = useState(false);
  const [uploadErrorPlanogram, setUploadErrorPlanogram] = useState('');
  const [, setUploadProgressPlanogram] = useState(0);

  const startEditingField = useCallback((fieldKey, value) => {
    setActiveEditField(fieldKey);
    if (fieldKey === 'title') setEditTitle(value || '');
    if (fieldKey === 'description') setEditDescription(value || '');
    if (fieldKey === 'contactPerson') setEditContactPerson(value || '');
    if (fieldKey === 'supplierContactEmail') setEditSupplierContactEmail(value || '');
    if (fieldKey === 'internalNotes') setEditInternalNotes(value || '');
    setEditCustomValue(value !== undefined ? value : '');
  }, []);

  // Sync with task updates
  useEffect(() => {
    let cancelled = false;

    if (task) {
      queueMicrotask(() => {
        if (cancelled) return;
        setQuickStatus(task.status || '');
        if (startInEditMode && activeEditField === null) {
          startEditingField('title', task.title);
        }
      });

      const loadComments = async () => {
        const fetchedComments = await getCommentsForTask(task.id, userId);
        if (cancelled) return;
        setComments(fetchedComments);
      };
      const loadPrivateNotes = async () => {
        const notes = await getPrivateNotes(task.id, userId);
        if (cancelled) return;
        setInternalNotes(notes);
      };
      loadComments();
      loadPrivateNotes();
    } else {
      queueMicrotask(() => {
        if (cancelled) return;
        // Seed default creation form
        setCreateTitle('');
        setCreateDescription('');
        setCreateContactPerson(defaultContactPerson);
        setCreateSupplierContactEmail(defaultSupplierContactEmail);
        setCreateDiecutsStatus(defaultDiecutsStatus);
        setCreateImagesStatus(defaultImagesStatus);
        setCreateStandardsInstituteRequired(defaultStandardsInstituteRequired);
        setCreateStatus(DEFAULT_STATUS || 'חדש');
        setCreateAttachments([]);
        setCreatePlanogramFile(null);
        setCreateInternalNotes('');
        const initialCustom = {};
        customFieldDefinitions.forEach(f => {
          initialCustom[f.key] = f.defaultValue ?? '';
        });
        setCreateCustomFields(initialCustom);
        setCreateBoardId(initialBoardId || 'active');
        setErrors({});
      });
    }
    return () => {
      cancelled = true;
    };
  }, [task, startInEditMode, activeEditField, userId, DEFAULT_STATUS, startEditingField, defaultDiecutsStatus, defaultImagesStatus, defaultStandardsInstituteRequired, defaultContactPerson, defaultSupplierContactEmail, initialBoardId, customFieldDefinitions]);

  // Sync hours state with active Sunday week
  useEffect(() => {
    if (task) {
      const wh = task.weeklyHours || {};
      let weekData = {};

      if (wh.sunday !== undefined || wh.monday !== undefined) {
        const currentWeekSunday = getSundayOfWeek(new Date());
        if (activeSunday === currentWeekSunday) {
          weekData = wh;
        }
      } else {
        weekData = wh[activeSunday] || {};
      }

      const sun = weekData.sunday !== undefined ? String(weekData.sunday) : '0';
      const mon = weekData.monday !== undefined ? String(weekData.monday) : '0';
      const tue = weekData.tuesday !== undefined ? String(weekData.tuesday) : '0';
      const wed = weekData.wednesday !== undefined ? String(weekData.wednesday) : '0';
      const thu = weekData.thursday !== undefined ? String(weekData.thursday) : '0';

      const timer = setTimeout(() => {
        setHoursState({
          sunday: sun,
          monday: mon,
          tuesday: tue,
          wednesday: wed,
          thursday: thu
        });
      }, 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setHoursState({
          sunday: '0',
          monday: '0',
          tuesday: '0',
          wednesday: '0',
          thursday: '0'
        });
        setActiveSunday(getSundayOfWeek(new Date()));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [task, activeSunday]);

  // Close modal or cancel actions on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (document.querySelector('.status-picker-popover')) {
          return;
        }
        if (commentToDelete) {
          setCommentToDelete(null);
        } else if (showPlanogramDeleteConfirm) {
          setShowPlanogramDeleteConfirm(false);
        } else if (activeEditField) {
          setActiveEditField(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [commentToDelete, showPlanogramDeleteConfirm, activeEditField, onClose]);

  // --- Inline Field Handlers ---

  const handleCancelField = () => {
    setActiveEditField(null);
  };

  const handleSaveField = async (fieldKey, value) => {
    const trimmedVal = typeof value === 'string' ? value.trim() : value;
    if (fieldKey === 'title' && !trimmedVal) {
      alert('שם הפרויקט הוא שדה חובה');
      return false;
    }

    if (fieldKey === 'supplierContactEmail' && trimmedVal) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedVal)) {
        alert('כתובת אימייל לא תקינה');
        return false;
      }
    }

    const updateData = fieldKey === 'internalNotes'
      ? { internalNotes: trimmedVal }
      : { [fieldKey]: trimmedVal };

    try {
      await updateTask(task.id, updateData);
      if (fieldKey === 'internalNotes') {
        setInternalNotes(trimmedVal);
      } else if (onTaskUpdated) {
        onTaskUpdated(task.id, {
          [fieldKey]: trimmedVal,
          updatedAt: new Date().toISOString()
        });
      }
      setActiveEditField(currentField => currentField === fieldKey ? null : currentField);
      return true;
    } catch (err) {
      console.error(`Failed to save ${fieldKey}`, err);
      alert('השינוי לא נשמר. בדקי את החיבור ונסי שוב.');
      return false;
    }
  };

  const handleSaveCustomField = async (fieldKey, value) => {
    if (!task) return false;
    try {
      const updatedCustomFields = {
        ...(task.customFields || {}),
        [fieldKey]: value
      };
      await updateTask(task.id, { customFields: updatedCustomFields });
      if (onTaskUpdated) {
        onTaskUpdated(task.id, {
          customFields: updatedCustomFields,
          updatedAt: new Date().toISOString()
        });
      }
      setActiveEditField(null);
      return true;
    } catch (err) {
      console.error(`Failed to save custom field ${fieldKey}`, err);
      alert('השינוי לא נשמר. בדקי את החיבור ונסי שוב.');
      return false;
    }
  };

  const handleExcludeFieldFromTask = (fieldKey, fieldLabel) => {
    setFieldToExclude({ key: fieldKey, label: fieldLabel });
  };

  const confirmExcludeFieldFromTask = async () => {
    if (!task || !fieldToExclude) return;
    const { key: fieldKey } = fieldToExclude;
    const currentExcluded = Array.isArray(task.excludedFields) ? task.excludedFields : [];
    const newExcluded = [...new Set([...currentExcluded, fieldKey])];
    try {
      await updateTask(task.id, { excludedFields: newExcluded });
      if (onTaskUpdated) {
        onTaskUpdated(task.id, {
          excludedFields: newExcluded,
          updatedAt: new Date().toISOString()
        });
      }
      setFieldToExclude(null);
    } catch (err) {
      console.error('Failed to exclude field from task', err);
      alert('שגיאה בהסרת השדה מפרויקט זה.');
    }
  };

  const handleRestoreFieldToTask = async (fieldKey) => {
    if (!task) return;
    const currentExcluded = Array.isArray(task.excludedFields) ? task.excludedFields : [];
    const newExcluded = currentExcluded.filter(k => k !== fieldKey);
    try {
      await updateTask(task.id, { excludedFields: newExcluded });
      if (onTaskUpdated) {
        onTaskUpdated(task.id, {
          excludedFields: newExcluded,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to restore field to task', err);
      alert('שגיאה בהחזרת השדה לפרויקט.');
    }
  };

  const handleAutoSaveBlur = (event, fieldKey, value) => {
    if (event.relatedTarget?.closest?.('[data-inline-edit-action="true"]')) return;
    void handleSaveField(fieldKey, value);
  };

  const handleHourChange = (day, val) => {
    if (val.includes('-')) return;
    const num = parseFloat(val);
    if (num < 0) return;
    setHoursState(prev => ({
      ...prev,
      [day]: val
    }));
  };

  const handlePrevWeek = () => {
    const [yyyy, mm, dd] = activeSunday.split('-').map(Number);
    const activeDate = new Date(yyyy, mm - 1, dd);
    activeDate.setDate(activeDate.getDate() - 7);
    const yyyyNew = activeDate.getFullYear();
    const mmNew = String(activeDate.getMonth() + 1).padStart(2, '0');
    const ddNew = String(activeDate.getDate()).padStart(2, '0');
    setActiveSunday(`${yyyyNew}-${mmNew}-${ddNew}`);
  };

  const handleNextWeek = () => {
    const [yyyy, mm, dd] = activeSunday.split('-').map(Number);
    const activeDate = new Date(yyyy, mm - 1, dd);
    activeDate.setDate(activeDate.getDate() + 7);
    const yyyyNew = activeDate.getFullYear();
    const mmNew = String(activeDate.getMonth() + 1).padStart(2, '0');
    const ddNew = String(activeDate.getDate()).padStart(2, '0');
    setActiveSunday(`${yyyyNew}-${mmNew}-${ddNew}`);
  };

  const handleSaveHours = async () => {
    if (savingHours) return;

    const weekHours = {
      sunday: parseFloat(hoursState.sunday) || 0,
      monday: parseFloat(hoursState.monday) || 0,
      tuesday: parseFloat(hoursState.tuesday) || 0,
      wednesday: parseFloat(hoursState.wednesday) || 0,
      thursday: parseFloat(hoursState.thursday) || 0
    };

    setHoursState({
      sunday: String(weekHours.sunday),
      monday: String(weekHours.monday),
      tuesday: String(weekHours.tuesday),
      wednesday: String(weekHours.wednesday),
      thursday: String(weekHours.thursday)
    });

    const oldWeeklyHours = task.weeklyHours || {};
    let newWeeklyHours = {};

    if (oldWeeklyHours.sunday !== undefined || oldWeeklyHours.monday !== undefined) {
      const currentWeekSunday = getSundayOfWeek(new Date());
      newWeeklyHours[currentWeekSunday] = {
        sunday: oldWeeklyHours.sunday || 0,
        monday: oldWeeklyHours.monday || 0,
        tuesday: oldWeeklyHours.tuesday || 0,
        wednesday: oldWeeklyHours.wednesday || 0,
        thursday: oldWeeklyHours.thursday || 0
      };
    } else {
      newWeeklyHours = { ...oldWeeklyHours };
    }

    newWeeklyHours[activeSunday] = weekHours;

    setSavingHours(true);
    try {
      await updateTask(task.id, { weeklyHours: newWeeklyHours });
      if (onTaskUpdated) {
        onTaskUpdated(task.id, {
          weeklyHours: newWeeklyHours,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Failed to save weekly hours", err);
      alert('השעות לא נשמרו. בדקי את החיבור ונסי שוב.');
    } finally {
      setSavingHours(false);
    }
  };

  const calculateTotalHours = () => {
    const sun = parseFloat(hoursState.sunday) || 0;
    const mon = parseFloat(hoursState.monday) || 0;
    const tue = parseFloat(hoursState.tuesday) || 0;
    const wed = parseFloat(hoursState.wednesday) || 0;
    const thu = parseFloat(hoursState.thursday) || 0;
    return Number((sun + mon + tue + wed + thu).toFixed(2));
  };

  // --- Handlers for Quick Updates (Status) ---

  const handleStatusChange = async (newStatus) => {
    if (savingStatus || newStatus === quickStatus) return;

    const changedAt = new Date().toISOString();
    setSavingStatus(true);
    try {
      if (onStatusChange) {
        const saved = await onStatusChange(task.id, newStatus);
        if (!saved) return;
      } else {
        await updateTask(task.id, { status: newStatus });
      }
      setQuickStatus(newStatus);
      const fetchedComments = await getCommentsForTask(task.id, userId);
      setComments(fetchedComments);
      if (!onStatusChange && onRefresh) {
        await onRefresh();
      }
      if (onTaskUpdated) {
        onTaskUpdated(task.id, { status: newStatus, updatedAt: changedAt });
      }
    } catch (err) {
      console.error("Failed to update status", err);
      if (!onStatusChange) {
        alert('שגיאה בעדכון הסטטוס. נסי שוב בעוד רגע.');
      }
    } finally {
      setSavingStatus(false);
    }
  };

  // --- Handlers for Comments ---

  const normalizeSubtasks = useCallback((items) => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item, index) => {
        if (typeof item === 'string') {
          return {
            id: `legacy-${index}-${item}`,
            text: item,
            completed: false,
            createdAt: task?.createdAt || new Date().toISOString()
          };
        }
        return {
          id: item.id || `legacy-${index}-${item.text || ''}`,
          text: item.text || '',
          completed: Boolean(item.completed),
          createdAt: item.createdAt || task?.createdAt || new Date().toISOString(),
          completedAt: item.completedAt || (item.completed ? (item.createdAt || task?.createdAt || new Date().toISOString()) : null)
        };
      })
      .filter(item => item.text.trim());
  }, [task?.createdAt]);

  useEffect(() => {
    let cancelled = false;

    if (!task) {
      queueMicrotask(() => {
        if (cancelled) return;
        setSubtasksDraft([]);
        setShowCompletedSubtasks(false);
      });
      return () => {
        cancelled = true;
      };
    }
    if (!savingSubtasks) {
      const nextSubtasks = normalizeSubtasks(task.subtasks);
      queueMicrotask(() => {
        if (cancelled) return;
        setSubtasksDraft(nextSubtasks);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [task, savingSubtasks, normalizeSubtasks]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setShowCompletedSubtasks(false);
    });
    return () => {
      cancelled = true;
    };
  }, [task?.id]);

  const persistSubtasks = async (nextSubtasks, previousSubtasks = subtasksDraft) => {
    if (!task) return false;
    setSubtasksDraft(nextSubtasks);
    setSavingSubtasks(true);
    setSubtaskError('');
    try {
      await updateTask(task.id, { subtasks: nextSubtasks });
      if (onTaskUpdated) {
        onTaskUpdated(task.id, {
          subtasks: nextSubtasks,
          updatedAt: new Date().toISOString()
        });
      }
      if (onRefresh) onRefresh();
      return true;
    } catch (err) {
      console.error('Failed to save subtasks', err);
      setSubtasksDraft(previousSubtasks);
      setSubtaskError('השינוי במשימות לא נשמר. נסי שוב בעוד רגע.');
      return false;
    } finally {
      setSavingSubtasks(false);
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    const text = newSubtaskText.trim();
    if (!text) {
      setSubtaskError('נא להזין שם משימה');
      return;
    }

    const nextSubtasks = [
      ...subtasksDraft,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        completed: false,
        createdAt: new Date().toISOString()
      }
    ];

    const saved = await persistSubtasks(nextSubtasks, subtasksDraft);
    if (saved) setNewSubtaskText('');
  };

  const handleToggleSubtask = async (subtaskId) => {
    const nextSubtasks = subtasksDraft.map(item => {
      if (item.id !== subtaskId) return item;
      const completed = !item.completed;
      return {
        ...item,
        completed,
        completedAt: completed ? (item.completedAt || new Date().toISOString()) : null
      };
    });
    await persistSubtasks(nextSubtasks, subtasksDraft);
  };

  const handleDeleteSubtask = async (subtaskId) => {
    const nextSubtasks = subtasksDraft.filter(item => item.id !== subtaskId);
    await persistSubtasks(nextSubtasks, subtasksDraft);
  };

  const handleDeleteComment = (commentId) => {
    setCommentToDelete(commentId);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await deleteComment(commentToDelete, task.id);
      const fetchedComments = await getCommentsForTask(task.id, userId);
      setComments(fetchedComments);
      setCommentToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to delete comment", err);
      alert('שגיאה במחיקת ההערה');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    setCommentError('');

    if (!commentText.trim()) {
      setCommentError('נא להזין תוכן תגובה');
      return;
    }

    try {
      await addComment(
        task.id,
        commentAuthorName,
        commentText,
        attachedFile ? attachedFile.url : null,
        attachedFile ? attachedFile.name : null,
        userId
      );
      setCommentText('');
      setAttachedFile(null);
      const fetchedComments = await getCommentsForTask(task.id, userId);
      setComments(fetchedComments);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to add comment", err);
      setCommentError('שגיאה בהוספת ההערה. נסי שוב בעוד רגע.');
    }
  };

  const handleCommentFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB limit
    if (file.size > MAX_SIZE) {
      setUploadErrorFile('גודל הקובץ עולה על המותר (מקסימום 15MB)');
      setAttachedFile(null);
      e.target.value = '';
      return;
    }

    setUploadingFile(true);
    setUploadProgressFile(0);
    setUploadErrorFile('');
    try {
      const result = await uploadFileToStorage(file, 'comments', (progress) => {
        setUploadProgressFile(progress);
      });
      setAttachedFile(result);
      e.target.value = '';
    } catch (err) {
      console.error(err);
      setUploadErrorFile('שגיאה בהעלאת הקובץ. אנא ודא ש-Storage פעיל.');
    } finally {
      setUploadingFile(false);
    }
  };

  // --- Handlers for Direct Attachments (View Mode) ---

  const handleDeleteAttachmentDirectly = async (indexToDelete) => {
    const currentFiles = task.workOrderFiles || task.attachments || [];
    const newAttachments = currentFiles.filter((_, idx) => idx !== indexToDelete);
    await updateTask(task.id, { workOrderFiles: newAttachments });
    onRefresh();
  };

  const handleUploadFilesDirectly = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB limit
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_SIZE) {
        setUploadError(`גודל הקובץ "${files[i].name}" עולה על המותר (מקסימום 15MB)`);
        e.target.value = '';
        return;
      }
    }

    setUploading(true);
    setUploadError('');
    setTotalUploadCount(files.length);
    try {
      const currentFiles = task.workOrderFiles || task.attachments || [];
      const uploadedList = [...currentFiles];
      for (let i = 0; i < files.length; i++) {
        setCurrentUploadIndex(i + 1);
        setUploadProgress(0);
        const result = await uploadFileToStorage(files[i], 'tasks', (progress) => {
          setUploadProgress(progress);
        });
        uploadedList.push(result);
      }
      await updateTask(task.id, { workOrderFiles: uploadedList });
      e.target.value = '';
      onRefresh();
    } catch (err) {
      console.error(err);
      setUploadError('שגיאה בהעלאת הקבצים. אנא ודא ש-Storage פעיל.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setTotalUploadCount(0);
      setCurrentUploadIndex(0);
    }
  };

  // --- Handlers for Planogram View Mode ---
  const handlePlanogramUploadView = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB limit
    if (file.size > MAX_SIZE) {
      alert('גודל הקובץ עולה על המותר (מקסימום 15MB)');
      e.target.value = '';
      return;
    }

    if (!/\.(jpg|jpeg|png|webp|gif|svg|pdf|xlsx|xls)$/i.test(file.name)) {
      alert('אנא בחרי קובץ תמונה, PDF או Excel');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFileToStorage(file, 'planograms', () => {});
      await updateTask(task.id, { planogramFile: result });
      if (onTaskUpdated) onTaskUpdated(task.id, { planogramFile: result });
      e.target.value = '';
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const handlePlanogramReplaceView = async (file) => {
    if (!file) return;

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB limit
    if (file.size > MAX_SIZE) {
      alert('גודל הקובץ עולה על המותר (מקסימום 15MB)');
      return;
    }

    if (!/\.(jpg|jpeg|png|webp|gif|svg|pdf|xlsx|xls)$/i.test(file.name)) {
      alert('אנא בחרי קובץ תמונה, PDF או Excel');
      return;
    }

    setIsReplacingPlanogram(true);
    try {
      const result = await uploadFileToStorage(file, 'planograms', () => {});
      await updateTask(task.id, { planogramFile: result });
      if (onTaskUpdated) onTaskUpdated(task.id, { planogramFile: result });
      onRefresh();
    } catch (err) {
      console.error('Failed to replace planogram file', err);
      alert('שגיאה בעדכון הקובץ');
    } finally {
      setIsReplacingPlanogram(false);
    }
  };

  const handlePlanogramDeleteView = () => {
    setShowPlanogramDeleteConfirm(true);
  };

  const confirmDeletePlanogram = async () => {
    try {
      await updateTask(task.id, { planogramFile: null });
      setShowPlanogramDeleteConfirm(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete planogram", err);
      alert('שגיאה במחיקת הפלנוגרמה');
    }
  };

  // --- Handlers for Full Form (Create Mode) ---

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUploadFilesCreateMode(e.dataTransfer.files);
    }
  };

  const handleFileChangeCreateMode = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await handleUploadFilesCreateMode(e.target.files);
      e.target.value = '';
    }
  };

  const handleUploadFilesCreateMode = async (files) => {
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB limit
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_SIZE) {
        setUploadError(`גודל הקובץ "${files[i].name}" עולה על המותר (מקסימום 15MB)`);
        return;
      }
    }

    setUploading(true);
    setUploadError('');
    setTotalUploadCount(files.length);
    try {
      const uploadedList = [...createAttachments];
      for (let i = 0; i < files.length; i++) {
        setCurrentUploadIndex(i + 1);
        setUploadProgress(0);
        const result = await uploadFileToStorage(files[i], 'tasks', (progress) => {
          setUploadProgress(progress);
        });
        uploadedList.push(result);
      }
      setCreateAttachments(uploadedList);
    } catch (err) {
      console.error(err);
      setUploadError('שגיאה בהעלאת הקבצים. אנא ודא ש-Storage פעיל.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setTotalUploadCount(0);
      setCurrentUploadIndex(0);
    }
  };

  const handleDeleteAttachmentCreateMode = (indexToDelete) => {
    setCreateAttachments(createAttachments.filter((_, idx) => idx !== indexToDelete));
  };

  const uploadPlanogramCreateFile = async (file) => {
    if (!file) return;

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB limit
    if (file.size > MAX_SIZE) {
      setUploadErrorPlanogram('גודל הקובץ עולה על המותר (מקסימום 15MB)');
      return;
    }

    if (!/\.(jpg|jpeg|png|webp|gif|svg|pdf|xlsx|xls)$/i.test(file.name)) {
      setUploadErrorPlanogram('אנא בחרי קובץ תמונה, PDF או Excel');
      return;
    }

    setUploadingPlanogram(true);
    setUploadProgressPlanogram(0);
    setUploadErrorPlanogram('');
    try {
      const result = await uploadFileToStorage(file, 'planograms', (progress) => {
        setUploadProgressPlanogram(progress);
      });
      setCreatePlanogramFile(result);
    } catch (err) {
      console.error(err);
      setUploadErrorPlanogram('שגיאה בהעלאת הפלנוגרמה');
    } finally {
      setUploadingPlanogram(false);
    }
  };

  const handlePlanogramUploadCreate = async (e) => {
    const file = e.target.files[0];
    await uploadPlanogramCreateFile(file);
    e.target.value = '';
  };

  const handlePlanogramDragCreate = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadingPlanogram) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setPlanogramDragActive(true);
    } else if (e.type === 'dragleave') {
      setPlanogramDragActive(false);
    }
  };

  const handlePlanogramDropCreate = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPlanogramDragActive(false);
    if (uploadingPlanogram) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadPlanogramCreateFile(e.dataTransfer.files[0]);
    }
  };

  const handlePlanogramDeleteCreate = () => {
    setCreatePlanogramFile(null);
  };

  const handleSubmitCreate = (e) => {
    e.preventDefault();

    const formErrors = {};
    if (!createTitle.trim()) {
      formErrors.title = 'שדה שם הפרויקט הוא חובה';
    }

    if (isNewTaskFieldEnabled('supplierContactEmail') && createSupplierContactEmail.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createSupplierContactEmail.trim())) {
        formErrors.supplierContactEmail = 'כתובת אימייל לא תקינה';
      }
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    const taskData = {
      title: createTitle.trim(),
      description: createDescription.trim(),
      supplierName: '',
      status: createStatus,
      boardId: createBoardId || 'active',
      ...(isNewTaskFieldEnabled('contactPerson') ? { contactPerson: createContactPerson.trim() } : {}),
      ...(isNewTaskFieldEnabled('supplierContactEmail') ? { supplierContactEmail: createSupplierContactEmail.trim() } : {}),
      ...(isNewTaskFieldEnabled('diecutsStatus') ? { diecutsStatus: createDiecutsStatus } : {}),
      ...(isNewTaskFieldEnabled('imagesStatus') ? { imagesStatus: createImagesStatus } : {}),
      ...(isNewTaskFieldEnabled('standardsInstituteRequired') ? { standardsInstituteRequired: createStandardsInstituteRequired } : {}),
      ...(isNewTaskFieldEnabled('workOrderFiles') ? { workOrderFiles: createAttachments } : {}),
      ...(isNewTaskFieldEnabled('planogramFile') ? { planogramFile: createPlanogramFile } : {}),
      internalNotes: createInternalNotes.trim(),
      customFields: createCustomFields,
      weeklyHours: {
        sunday: 0,
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0
      }
    };

    onSave(taskData);
  };

  // --- Formatting Helpers ---

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('he-IL', {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${isCreateMode ? 'create-project-modal' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isCreateMode ? '580px' : '1000px',
          transition: 'max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3 className="modal-title" style={{ width: '100%' }}>
              {isCreateMode ? (
                `✨ ${flags.terms.createItem}`
              ) : activeEditField === 'title' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', paddingLeft: '40px' }}>
                  <input
                    type="text"
                    className="form-control"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={(e) => handleAutoSaveBlur(e, 'title', editTitle)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveField('title', editTitle);
                      if (e.key === 'Escape') handleCancelField();
                    }}
                  />
                  <button type="button" data-inline-edit-action="true" className="btn btn-primary btn-icon" style={{ padding: '8px 12px' }} onClick={() => handleSaveField('title', editTitle)}>✔️</button>
                  <button type="button" data-inline-edit-action="true" className="btn btn-secondary btn-icon" style={{ padding: '8px 12px' }} onClick={handleCancelField}>❌</button>
                </div>
              ) : (
                <span className="task-title-with-indicator modal-title-with-indicator">
                  <span
                    className="hover-editable-inline"
                    onClick={() => startEditingField('title', task.title)}
                    title={`לחצי לעריכת שם ה${flags.terms.item}`}
                  >
                    {task.title} ✏️
                  </span>
                  {(task.planogramFile || task.planogram) && <PlanogramIndicator />}
                </span>
              )}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
            {!isCreateMode && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyTaskLink}
                style={{
                  fontSize: '0.85rem',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  backgroundColor: '#e6f7ed',
                  color: '#1e4620',
                  borderColor: '#1e4620',
                  fontWeight: '600'
                }}
                title={`העתק קישור שיתוף ישיר ל${flags.terms.item} זה`}
              >
                {copiedLink ? '✔️ הועתק!' : '🔗 העתקת קישור לשיתוף'}
              </button>
            )}
            <button className="modal-close" onClick={onClose} style={{ marginRight: 0 }}>&times;</button>
          </div>
        </div>

        {/* Modal Body */}
        {isCreateMode ? (
          /* CREATE MODE: Render full form */
          <form onSubmit={handleSubmitCreate} onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              handleSubmitCreate(e);
            }
          }}>
            <div className="modal-body" style={{ maxHeight: 'calc(85vh - 110px)', overflowY: 'auto' }}>

              {/* 1. שם הפרויקט */}
              <div className="form-group">
                <label className="form-label">שם ה{flags.terms.item} *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="לדוגמה: אריזת שוקולד 100 גרם"
                  value={createTitle}
                  autoFocus
                  onChange={(e) => {
                    setCreateTitle(e.target.value);
                    if (errors.title) setErrors({...errors, title: null});
                  }}
                />
                {errors.title && <span className="form-error">{errors.title}</span>}
              </div>

              {/* 2. תיאור ופרטים נוספים */}
              {isNewTaskFieldEnabled('description') && (
                <div className="form-group" style={getNewTaskFieldStyle('description')}>
                  <label className="form-label">{getNewTaskFieldLabel('description')}</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder={`פרטי ה${flags.terms.item}, דגשים והנחיות...`}
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                  />
                </div>
              )}

              {/* 3. לוח */}
              {flags.enableCustomBoards && availableBoards.length > 1 && (
                <div className="form-group">
                  <label className="form-label">{flags.terms.boards}</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {availableBoards.map(b => {
                      const isSelected = (createBoardId || 'active') === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.82rem',
                            fontWeight: isSelected ? '700' : '500',
                            borderRadius: '8px',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => handleSelectCreateBoard(b.id)}
                        >
                          {b.icon ? `${b.icon} ` : '📋 '}{b.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. סטטוס */}
              {isNewTaskFieldEnabled('status') && (
                <div className="form-group" style={getNewTaskFieldStyle('status')}>
                  <label className="form-label">{getNewTaskFieldLabel('status')}</label>
                  <div className="status-chips-container">
                    {(STATUSES.includes(createStatus) ? STATUSES : [...STATUSES, createStatus]).map(st => {
                      const colorClass = STATUS_CLASSES[st] || 'badge-frozen';
                      const isActive = st === createStatus;
                      return (
                        <button
                          key={st}
                          type="button"
                          className={`status-chip-btn ${colorClass} ${isActive ? 'active' : ''}`}
                          onClick={() => setCreateStatus(st)}
                        >
                          {isActive && <span style={{ fontSize: '0.75rem' }}>✓</span>}
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. הערות פנימיות */}
              {isNewTaskFieldEnabled('internalNotes') && (
                <div className="form-group" style={getNewTaskFieldStyle('internalNotes')}>
                  <label className="form-label">{getNewTaskFieldLabel('internalNotes')}</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="הערות לצוות הפנימי (לא יוצגו לספקים חיצוניים)..."
                    value={createInternalNotes}
                    onChange={(e) => setCreateInternalNotes(e.target.value)}
                  />
                </div>
              )}

              {/* שדות מוגדרים נוספים (אם מופעלים) */}
              {isNewTaskFieldEnabled('contactPerson') && (
                <div className="form-group" style={getNewTaskFieldStyle('contactPerson')}>
                  <label className="form-label">{getNewTaskFieldLabel('contactPerson')}</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-control"
                      value={createContactPerson}
                      onChange={(e) => setCreateContactPerson(e.target.value)}
                      list="contacts-list-modal"
                      style={{ flex: 1 }}
                    />
                    {createContactPerson && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        style={{ padding: '6px 8px', fontSize: '0.85rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="פרטי כרטיס איש קשר"
                        onClick={() => handleOpenContactCard(createContactPerson)}
                      >
                        ℹ️
                      </button>
                    )}
                  </div>
                  <datalist id="contacts-list-modal">
                    {Array.from(new Set([
                      ...getNewTaskFieldOptions('contactPerson'),
                      ...CONTACTS.map(c => typeof c === 'string' ? c : c.name)
                    ])).map(name => {
                      const contactObj = CONTACTS.find(c => (typeof c === 'string' ? c : c.name) === name);
                      const role = contactObj && typeof contactObj !== 'string' ? contactObj.role : '';
                      const phone = contactObj && typeof contactObj !== 'string' ? contactObj.phone : '';
                      return (
                        <option key={name} value={name}>
                          {role ? `${role} ${phone ? `(${phone})` : ''}` : ''}
                        </option>
                      );
                    })}
                  </datalist>
                </div>
              )}

              {(isNewTaskFieldEnabled('supplierContactEmail') || isNewTaskFieldEnabled('standardsInstituteRequired')) && (
                <div className="form-row">
                  {isNewTaskFieldEnabled('supplierContactEmail') && (
                    <div className="form-group" style={{ ...getNewTaskFieldStyle('supplierContactEmail'), flex: 1 }}>
                      <label className="form-label">{getNewTaskFieldLabel('supplierContactEmail')}</label>
                      <input
                        type="text"
                        className="form-control text-left direction-ltr"
                        value={createSupplierContactEmail}
                        list="supplier-emails-list-modal"
                        onChange={(e) => {
                          setCreateSupplierContactEmail(e.target.value);
                          if (errors.supplierContactEmail) setErrors({...errors, supplierContactEmail: null});
                        }}
                      />
                      {getNewTaskFieldOptions('supplierContactEmail').length > 0 && (
                        <datalist id="supplier-emails-list-modal">
                          {getNewTaskFieldOptions('supplierContactEmail').map(email => (
                            <option key={email} value={email}>{email}</option>
                          ))}
                        </datalist>
                      )}
                      {errors.supplierContactEmail && <span className="form-error">{errors.supplierContactEmail}</span>}
                    </div>
                  )}

                  {isNewTaskFieldEnabled('standardsInstituteRequired') && (
                    <div className="form-group" style={{ ...getNewTaskFieldStyle('standardsInstituteRequired'), flex: 1 }}>
                      <label className="form-label">{getNewTaskFieldLabel('standardsInstituteRequired')}</label>
                      <select
                        className="form-control"
                        value={createStandardsInstituteRequired}
                        onChange={(e) => setCreateStandardsInstituteRequired(e.target.value)}
                      >
                        {getNewTaskFieldOptions('standardsInstituteRequired').map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {(isNewTaskFieldEnabled('diecutsStatus') || isNewTaskFieldEnabled('imagesStatus')) && (
                <div className="form-row">
                  {isNewTaskFieldEnabled('diecutsStatus') && (
                    <div className="form-group" style={{ ...getNewTaskFieldStyle('diecutsStatus'), flex: 1 }}>
                      <label className="form-label">{getNewTaskFieldLabel('diecutsStatus')}</label>
                      <select
                        className="form-control"
                        value={createDiecutsStatus}
                        onChange={(e) => setCreateDiecutsStatus(e.target.value)}
                      >
                        {getNewTaskFieldOptions('diecutsStatus').map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isNewTaskFieldEnabled('imagesStatus') && (
                    <div className="form-group" style={{ ...getNewTaskFieldStyle('imagesStatus'), flex: 1 }}>
                      <label className="form-label">{getNewTaskFieldLabel('imagesStatus')}</label>
                      <select
                        className="form-control"
                        value={createImagesStatus}
                        onChange={(e) => setCreateImagesStatus(e.target.value)}
                      >
                        {getNewTaskFieldOptions('imagesStatus').map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* הזמנת עבודה */}
              {isNewTaskFieldEnabled('workOrderFiles') && (
                <div className="form-group" style={getNewTaskFieldStyle('workOrderFiles')}>
                  <label className="form-label">
                    {getNewTaskFieldLabel('workOrderFiles')}
                  </label>

                  <div
                    className={`file-upload-zone ${dragActive ? 'drag-active' : ''}`}
                    style={{ padding: '14px' }}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('modal-task-file-input-create').click()}
                  >
                    <div className="file-upload-icon" style={{ fontSize: '1.4rem', marginBottom: '4px' }}>📁</div>
                    <div className="file-upload-text" style={{ fontSize: '0.85rem' }}>
                      <strong>{uploading ? 'מעלה קובץ...' : 'גררי לכאן קבצי הזמנת עבודה'}</strong> או לחצי לבחירה מהמחשב
                    </div>
                    <div className="file-upload-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #718096)' }}>
                      עד 15MB לקובץ
                    </div>
                    <input
                      type="file"
                      id="modal-task-file-input-create"
                      multiple
                      className="file-upload-input"
                      onChange={handleFileChangeCreateMode}
                    />
                  </div>

                  {uploading && (
                    <div style={{ marginTop: '10px', textAlign: 'center', color: 'var(--primary)' }}>
                      <span>🔄 מעלה קובץ {currentUploadIndex} מתוך {totalUploadCount} ({uploadProgress}%)</span>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'var(--border-color, #e2e8f0)',
                        borderRadius: '3px',
                        marginTop: '6px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${uploadProgress}%`,
                          height: '100%',
                          backgroundColor: 'var(--primary)',
                          transition: 'width 0.2s ease-in-out'
                        }} />
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '6px' }}>
                      {uploadError}
                    </div>
                  )}

                  {createAttachments.length > 0 && (
                    <div className="attachments-list" style={{ marginTop: '10px' }}>
                      {createAttachments.map((file, idx) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
                        const isExcel = /\.(xlsx|xls)$/i.test(file.name);
                        const isPdf = /\.pdf$/i.test(file.name);
                        return (
                          <div key={idx} className="attachment-row" style={{ padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="attachment-info"
                              title="צפייה בקובץ מתוך המערכת"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePreviewFile(file);
                              }}
                              style={{ flex: 1, minWidth: 0 }}
                            >
                              <span className="attachment-icon">{isImage ? '🖼️' : isExcel ? '📊' : isPdf ? '📄' : '📎'}</span>
                              <span style={{ direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file.name}
                              </span>
                            </a>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '2px 6px', fontSize: '0.75rem', height: '26px' }}
                                onClick={() => handlePreviewFile(file)}
                                title="צפייה"
                              >
                                👁️
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '2px 6px', fontSize: '0.75rem', height: '26px' }}
                                onClick={(e) => handleDownloadFile(file, e)}
                                title="הורדה"
                              >
                                📥
                              </button>
                              <button
                                type="button"
                                className="attachment-delete-btn"
                                onClick={() => handleDeleteAttachmentCreateMode(idx)}
                                title="הסר קובץ"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* פלנוגרמה Upload */}
              {isNewTaskFieldEnabled('planogramFile') && (
                <div className="form-group" style={getNewTaskFieldStyle('planogramFile')}>
                  <label className="form-label">{getNewTaskFieldLabel('planogramFile')}</label>
                  {createPlanogramFile ? (
                    <PlanogramFileCard 
                      file={createPlanogramFile} 
                      onPreview={handlePreviewFile}
                      onReplace={uploadPlanogramCreateFile}
                      onDelete={handlePlanogramDeleteCreate} 
                      deleteLabel="הסרה"
                      downloadLabel="הורדה"
                      isReplacing={uploadingPlanogram}
                    />
                  ) : (
                    <div
                      className={`file-upload-zone planogram-upload-zone ${planogramDragActive ? 'drag-active' : ''} ${uploadingPlanogram ? 'is-uploading' : ''}`}
                      style={{ padding: '14px' }}
                      onDragEnter={handlePlanogramDragCreate}
                      onDragOver={handlePlanogramDragCreate}
                      onDragLeave={handlePlanogramDragCreate}
                      onDrop={handlePlanogramDropCreate}
                      onClick={() => document.getElementById('planogram-upload-create-input').click()}
                    >
                      <div className="file-upload-icon" style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🗂️</div>
                      <div className="file-upload-text" style={{ fontSize: '0.85rem' }}>
                        <strong>{uploadingPlanogram ? 'מעלה קובץ...' : 'גררי לכאן פלנוגרמה'}</strong> או לחצי לבחירה מהמחשב
                      </div>
                      <div className="file-upload-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #718096)' }}>
                        תמונה, PDF או Excel, עד 15MB
                      </div>
                      <input
                        type="file"
                        id="planogram-upload-create-input"
                        accept="image/*,.pdf,application/pdf,.xlsx,.xls"
                        className="file-upload-input"
                        onChange={handlePlanogramUploadCreate}
                        disabled={uploadingPlanogram}
                      />
                    </div>
                  )}
                  {uploadErrorPlanogram && (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '6px' }}>{uploadErrorPlanogram}</div>
                  )}
                </div>
              )}

              {/* שדות מותאמים אישית ביצירת פרויקט */}
              {customFieldDefinitions.filter(f => isNewTaskFieldEnabled(f.key)).map(f => (
                <div key={f.key} className="form-group" style={getNewTaskFieldStyle(f.key)}>
                  <label className="form-label">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      className="form-control"
                      value={createCustomFields[f.key] ?? (f.defaultValue || '')}
                      onChange={(e) => setCreateCustomFields({ ...createCustomFields, [f.key]: e.target.value })}
                    >
                      <option value="">(ללא בחירה)</option>
                      {(f.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      className="form-control"
                      rows="2"
                      value={createCustomFields[f.key] ?? (f.defaultValue || '')}
                      onChange={(e) => setCreateCustomFields({ ...createCustomFields, [f.key]: e.target.value })}
                    />
                  ) : f.type === 'checkbox' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '6px' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(createCustomFields[f.key] ?? (f.defaultValue === 'true' || f.defaultValue === true))}
                        onChange={(e) => setCreateCustomFields({ ...createCustomFields, [f.key]: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span>{f.label}</span>
                    </label>
                  ) : f.type === 'number' ? (
                    <input
                      type="number"
                      className="form-control"
                      value={createCustomFields[f.key] ?? (f.defaultValue || '')}
                      onChange={(e) => setCreateCustomFields({ ...createCustomFields, [f.key]: e.target.value })}
                    />
                  ) : f.type === 'date' ? (
                    <input
                      type="date"
                      className="form-control"
                      value={createCustomFields[f.key] ?? (f.defaultValue || '')}
                      onChange={(e) => setCreateCustomFields({ ...createCustomFields, [f.key]: e.target.value })}
                    />
                  ) : (
                    <input
                      type="text"
                      className="form-control"
                      value={createCustomFields[f.key] ?? (f.defaultValue || '')}
                      onChange={(e) => setCreateCustomFields({ ...createCustomFields, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                ביטול
              </button>
              <button type="submit" className="btn btn-primary" disabled={uploading || uploadingPlanogram}>
                {flags.terms.createItemButton}
              </button>
            </div>
          </form>
        ) : (
          /* VIEW / INLINE EDIT MODE */
          <>
            <div className="modal-body" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
              <div className="details-grid">

                {/* Main View Area (Left Column) */}
                <div className="details-main">

                  {/* AREA 1: פרטי פרויקט / עבודה */}
                  {(isFieldVisibleForTask('description') || isFieldVisibleForTask('internalNotes')) && (
                    <div className="details-section-card">
                      <h4 className="detail-section-title">📁 {flags.terms.itemDetails}</h4>

                      {/* Field: Description */}
                      {isFieldVisibleForTask('description') && (
                        <div style={{ marginBottom: isFieldVisibleForTask('internalNotes') ? '16px' : '0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <label className="form-label" style={{ fontWeight: '700', margin: 0, fontSize: '0.85rem' }}>
                              {getNewTaskFieldLabel('description')}
                            </label>
                            {flags.enableFieldExclusion && (
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6, padding: '0 4px' }}
                                title={`הסרת ${getNewTaskFieldLabel('description')} מפרויקט זה`}
                                onClick={() => handleExcludeFieldFromTask('description', getNewTaskFieldLabel('description'))}
                              >
                                🗑️ הסרת שדה
                              </button>
                            )}
                          </div>
                          {activeEditField === 'description' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              <textarea
                                className="form-control"
                                rows="4"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                onBlur={(e) => handleAutoSaveBlur(e, 'description', editDescription)}
                                autoFocus
                              />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" data-inline-edit-action="true" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleSaveField('description', editDescription)}>שמירה ✔️</button>
                                <button type="button" data-inline-edit-action="true" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={handleCancelField}>ביטול ❌</button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="description-box hover-editable"
                              onClick={() => startEditingField('description', task.description)}
                              title="לחצי לעריכת תיאור"
                            >
                              {task.description ? (
                                task.description
                              ) : (
                                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                                  {flags.terms?.noDescription || (flags.isLegacy ? 'אין פירוט מדויק לעבודה זו. לחצי להוספת תיאור.' : 'אין פירוט מדויק לפרויקט זה. לחצי להוספת תיאור.')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Field: Internal Notes */}
                      {isFieldVisibleForTask('internalNotes') && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <label className="form-label" style={{ fontWeight: '700', color: 'var(--secondary)', margin: 0, fontSize: '0.85rem' }}>
                              🔒 {getNewTaskFieldLabel('internalNotes')}
                            </label>
                            {flags.enableFieldExclusion && (
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6, padding: '0 4px' }}
                                title={`הסרת ${getNewTaskFieldLabel('internalNotes')} מפרויקט זה`}
                                onClick={() => handleExcludeFieldFromTask('internalNotes', getNewTaskFieldLabel('internalNotes'))}
                              >
                                🗑️ הסרת שדה
                              </button>
                            )}
                          </div>
                          {activeEditField === 'internalNotes' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              <textarea
                                className="form-control"
                                rows="3"
                                value={editInternalNotes}
                                onChange={(e) => setEditInternalNotes(e.target.value)}
                                onBlur={(e) => handleAutoSaveBlur(e, 'internalNotes', editInternalNotes)}
                                autoFocus
                              />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" data-inline-edit-action="true" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleSaveField('internalNotes', editInternalNotes)}>שמירה ✔️</button>
                                <button type="button" data-inline-edit-action="true" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={handleCancelField}>ביטול ❌</button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="description-box hover-editable"
                              style={{ backgroundColor: 'var(--secondary-light)', borderColor: 'var(--border)' }}
                              onClick={() => startEditingField('internalNotes', internalNotes)}
                              title="לחצי לעריכת הערות פנימיות"
                            >
                              {internalNotes ? (
                                internalNotes
                              ) : (
                                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>אין הערות פנימיות. לחצי להוספת הערות.</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AREA 4: הזמנת עבודה ופלנוגרמה */}
                  {(isFieldVisibleForTask('workOrderFiles') || isFieldVisibleForTask('planogramFile')) && (
                    <div className="details-section-card">
                      <h4 className="detail-section-title">📋 {flags.terms.filesSectionTitle || 'הזמנת עבודה ופלנוגרמה'}</h4>
                      <div className="work-order-planogram-grid">

                        {/* הזמנת עבודה */}
                        {isFieldVisibleForTask('workOrderFiles') && (
                          <div className="work-order-column">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <label className="form-label" style={{ fontWeight: '700', margin: 0, fontSize: '0.85rem' }}>
                                {getNewTaskFieldLabel('workOrderFiles')}
                              </label>
                              {flags.enableFieldExclusion && (
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6, padding: '0 4px' }}
                                  title={`הסרת ${getNewTaskFieldLabel('workOrderFiles')} מפרויקט זה`}
                                  onClick={() => handleExcludeFieldFromTask('workOrderFiles', getNewTaskFieldLabel('workOrderFiles'))}
                                >
                                  🗑️ הסרת שדה
                                </button>
                              )}
                            </div>

                            {(() => {
                              const filesList = (Array.isArray(task.workOrderFiles) && task.workOrderFiles.length > 0)
                                ? task.workOrderFiles
                                : (task.workOrderFile ? [task.workOrderFile] : (Array.isArray(task.attachments) ? task.attachments : []));

                              return filesList.length > 0 ? (
                                <div className="attachments-list" style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '12px' }}>
                                  {filesList.map((file, idx) => {
                                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                                    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
                                    const isPdf = /\.pdf$/i.test(file.name);
                                    return (
                                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div
                                          className="attachment-info"
                                          style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, cursor: 'pointer' }}
                                          title={file.name}
                                          onClick={() => handlePreviewFile(file)}
                                        >
                                          <span className="attachment-icon">{isImage ? '🖼️ ' : isExcel ? '📊 ' : isPdf ? '📄 ' : '📎 '}</span>
                                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right', display: 'block', fontWeight: '500' }}>
                                            {file.name}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                          <button
                                            type="button"
                                            className="btn btn-secondary"
                                            style={{ padding: '2px 8px', fontSize: '0.75rem', height: '26px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            onClick={() => handlePreviewFile(file)}
                                            title="צפייה בקובץ מתוך המערכת"
                                          >
                                            👁️ צפייה
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-primary"
                                            style={{ padding: '2px 8px', fontSize: '0.75rem', height: '26px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            onClick={(e) => handleDownloadFile(file, e)}
                                            title="הורדת הקובץ למחשב"
                                          >
                                            📥 הורדה
                                          </button>
                                          <button
                                            type="button"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 4px' }}
                                            onClick={() => handleDeleteAttachmentDirectly(idx)}
                                            title="מחיקת קובץ"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '12px' }}>
                                  אין קבצי הזמנת עבודה
                                </div>
                              );
                            })()}

                            {/* Add file inline */}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <button
                                  type="button"
                                  className="comment-attachment-btn"
                                  style={{ padding: '6px 10px', fontSize: '0.75rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => document.getElementById('view-attachment-file-input-inline').click()}
                                  disabled={uploading}
                                >
                                  {uploading
                                    ? `🔄 מעלה (${currentUploadIndex}/${totalUploadCount}) ${uploadProgress}%`
                                    : '📎 הוספת קובץ'}
                                </button>
                                {!uploading && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(עד 15MB)</span>
                                )}
                              </div>
                              <input
                                type="file"
                                id="view-attachment-file-input-inline"
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleUploadFilesDirectly}
                              />
                              {uploadError && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{uploadError}</div>}
                            </div>
                          </div>
                        )}

                        {/* פלנוגרמה */}
                        {isFieldVisibleForTask('planogramFile') && (
                          <div className="planogram-column">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <label className="form-label" style={{ fontWeight: '700', margin: 0, fontSize: '0.85rem' }}>
                                {getNewTaskFieldLabel('planogramFile')}
                              </label>
                              {flags.enableFieldExclusion && (
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6, padding: '0 4px' }}
                                  title={`הסרת ${getNewTaskFieldLabel('planogramFile')} מפרויקט זה`}
                                  onClick={() => handleExcludeFieldFromTask('planogramFile', getNewTaskFieldLabel('planogramFile'))}
                                >
                                  🗑️ הסרת שדה
                                </button>
                              )}
                            </div>

                            {(() => {
                              const currentPlanogram = task.planogramFile || task.planogram;
                              return currentPlanogram ? (
                                <PlanogramFileCard 
                                  file={currentPlanogram} 
                                  onPreview={handlePreviewFile}
                                  onReplace={handlePlanogramReplaceView}
                                  onDelete={handlePlanogramDeleteView}
                                  isReplacing={isReplacingPlanogram}
                                  deleteLabel="מחיקה"
                                  downloadLabel="הורדה"
                                />
                              ) : (
                                <div
                                  className="planogram-preview-container"
                                  style={{ height: '140px', margin: 0, borderStyle: 'dashed', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', alignItems: 'center' }}
                                >
                                  <span className="planogram-empty-text" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>לא הועלה קובץ</span>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                    onClick={() => document.getElementById('planogram-upload-view-input').click()}
                                    disabled={uploading || isReplacingPlanogram}
                                  >
                                    העלאת קובץ
                                  </button>
                                  <input
                                    type="file"
                                    id="planogram-upload-view-input"
                                    accept="image/*,.pdf,application/pdf,.xlsx,.xls"
                                    style={{ display: 'none' }}
                                    onChange={handlePlanogramUploadView}
                                  />
                                </div>
                              );
                            })()}
                          </div>
                        )}

                      </div>
                    </div>
                  )}

                  {/* שעות עבודה בפרויקט */}
                  {!hideWeeklyHours && (
                    <div className="details-section-card">
                      <h4 className="detail-section-title">🕒 שעות עבודה בפרויקט</h4>

                      {/* week navigation panel */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={handlePrevWeek}
                        >
                          ▶ שבוע קודם
                        </button>

                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b' }}>
                          שבוע: {getDayDate(activeSunday, 0)} - {getDayDate(activeSunday, 4)}
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={handleNextWeek}
                        >
                          שבוע הבא ◀
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
                        {[
                          { key: 'sunday', label: 'ראשון', offset: 0 },
                          { key: 'monday', label: 'שני', offset: 1 },
                          { key: 'tuesday', label: 'שלישי', offset: 2 },
                          { key: 'wednesday', label: 'רביעי', offset: 3 },
                          { key: 'thursday', label: 'חמישי', offset: 4 }
                        ].map(day => (
                          <div key={day.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span>{day.label}</span>
                              <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 'normal', marginTop: '2px' }}>{getDayDate(activeSunday, day.offset)}</span>
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="form-control"
                              style={{ padding: '6px 8px', fontSize: '0.9rem', textAlign: 'center' }}
                              value={hoursState[day.key]}
                              onChange={(e) => handleHourChange(day.key, e.target.value)}
                              onBlur={() => handleSaveHours()}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>סה"כ שעות שבועי:</span>
                          <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--primary)' }}>{calculateTotalHours()}</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '7px 14px', fontSize: '0.85rem' }}
                          onClick={handleSaveHours}
                          disabled={savingHours}
                        >
                          {savingHours ? 'שומר...' : '💾 שמור שעות'}
                        </button>
                      </div>

                      {/* Monthly Summary */}
                      {(() => {
                        const monthlySummary = getMonthlySummary(task.weeklyHours);
                        const hasHours = Object.keys(monthlySummary).length > 0;
                        return (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dotted var(--border)' }}>
                            <div style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>סיכום חודשי מצטבר:</div>
                            {hasHours ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {Object.entries(monthlySummary).map(([month, total]) => (
                                  <div key={month} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span>{month}:</span>
                                    <span style={{ fontWeight: '600' }}>{total} שעות</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>אין שעות עבודה מדווחות עדיין</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* AREA 5: הערות ועדכוני פרויקט */}
                  <div className="comments-section">
                    <h4 className="detail-section-title">💬 הערות ועדכוני פרויקט ({comments.length})</h4>

                    {(() => {
                      const subtasks = subtasksDraft;
                      const openSubtasks = subtasks.filter(item => !item.completed);
                      const completedSubtasks = subtasks.filter(item => item.completed);
                      const renderSubtaskItem = (item) => (
                        <div className="subtask-item" key={item.id}>
                          <label className="subtask-main">
                            <input
                              type="checkbox"
                              className="subtask-checkbox"
                              checked={item.completed}
                              disabled={savingSubtasks}
                              onChange={() => handleToggleSubtask(item.id)}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span className={`subtask-text ${item.completed ? 'completed' : ''}`}>
                                {item.text}
                              </span>
                              {item.completed && (
                                <span className="subtask-completed-date" title={`הושלם ב-${formatDate(item.completedAt || item.createdAt || task?.createdAt)}`}>
                                  הושלם ב-{formatDate(item.completedAt || item.createdAt || task?.createdAt)}
                                </span>
                              )}
                            </div>
                          </label>
                          <button
                            type="button"
                            className="subtask-delete-btn"
                            title="מחיקת משימה"
                            disabled={savingSubtasks}
                            onClick={() => handleDeleteSubtask(item.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      );

                      return (
                        <div className="project-subtasks-panel">
                          <div className="project-subtasks-header">
                            <h5>משימות בפרויקט</h5>
                          </div>

                          {subtasks.length === 0 ? (
                            <div className="subtasks-empty-state">אין משימות בפרויקט עדיין</div>
                          ) : (
                            <div className="project-subtasks-groups">
                              {openSubtasks.length === 0 ? (
                                <div className="subtasks-empty-state">אין משימות פתוחות בפרויקט</div>
                              ) : (
                                <div className="subtask-list compact">
                                  {openSubtasks.map(renderSubtaskItem)}
                                </div>
                              )}

                              {completedSubtasks.length > 0 && (
                                <div className="completed-subtasks-section">
                                  <button
                                    type="button"
                                    className="completed-subtasks-toggle"
                                    onClick={() => setShowCompletedSubtasks(prev => !prev)}
                                    aria-expanded={showCompletedSubtasks}
                                  >
                                    <span>{showCompletedSubtasks ? 'הסתרת משימות שהושלמו' : 'הצגת משימות שהושלמו'}</span>
                                    <span className="completed-subtasks-count">{completedSubtasks.length}</span>
                                  </button>

                                  {showCompletedSubtasks && (
                                    <div className="subtask-list compact completed-subtasks-list">
                                      {completedSubtasks.map(renderSubtaskItem)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <form className="subtask-add-form" onSubmit={handleAddSubtask}>
                            <input
                              type="text"
                              className="subtask-add-input"
                              value={newSubtaskText}
                              onChange={(e) => setNewSubtaskText(e.target.value)}
                              placeholder="משימה חדשה בפרויקט"
                              disabled={savingSubtasks}
                            />
                            <button
                              type="submit"
                              className="btn btn-secondary subtask-add-btn"
                              disabled={savingSubtasks}
                            >
                              הוספה
                            </button>
                          </form>
                          {subtaskError && <div className="subtask-error">{subtaskError}</div>}
                        </div>
                      );
                    })()}

                    {comments.length === 0 ? (
                      <div className="empty-state" style={{ padding: '24px' }}>
                        <div className="empty-state-title">אין הערות עדיין</div>
                      </div>
                    ) : (
                      <div className="comments-list" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {comments.map(c => {
                          const isImage = c.attachmentName && /\.(jpg|jpeg|png|gif|webp)$/i.test(c.attachmentName);
                          const isExcel = c.attachmentName && /\.(xlsx|xls)$/i.test(c.attachmentName);
                          const isPdf = c.attachmentName && /\.pdf$/i.test(c.attachmentName);
                          return (
                            <div key={c.id} className="comment-item">
                              <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span className="comment-author">{c.authorName}</span>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(c.id)}
                                  title="מחיקת הערה"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                    fontSize: '1rem',
                                    color: 'var(--priority-urgent-text)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '4px',
                                    transition: 'background-color 0.2s'
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                              <div className="comment-text" style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div>
                              {c.attachmentUrl && (
                                <div style={{ marginTop: '8px' }}>
                                  {isImage ? (
                                    <a href={c.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={c.attachmentUrl}
                                        alt={c.attachmentName}
                                        className="comment-image-preview"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={c.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="attachment-info"
                                      style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                      title={c.attachmentName}
                                      onClick={(e) => {
                                        if (isExcel) {
                                          e.preventDefault();
                                          setExcelPreviewFile({ url: c.attachmentUrl, name: c.attachmentName });
                                        } else if (isPdf) {
                                          e.preventDefault();
                                          setPdfPreviewFile({ url: c.attachmentUrl, name: c.attachmentName });
                                        }
                                      }}
                                    >
                                      <span className="attachment-icon">{isExcel ? '📊 ' : isPdf ? '📄 ' : '📎 '}</span>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right' }}>
                                        {c.attachmentName}
                                      </span>
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Form to add a comment */}
                    <form onSubmit={handleAddComment} className="comment-form" style={{ marginTop: '16px' }}>
                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                        <div className="form-group" style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className="comment-attachment-btn"
                              style={{ padding: '8px 12px', fontSize: '0.8rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => document.getElementById('comment-file-input').click()}
                              disabled={uploadingFile}
                            >
                              {uploadingFile ? `🔄 מעלה (${uploadProgressFile}%)` : '📎 צרוף קובץ'}
                            </button>
                            {attachedFile && (
                              <span style={{ fontSize: '0.8rem', color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={attachedFile.name}>
                                ✔️ {attachedFile.name}
                              </span>
                            )}
                          </div>
                          <input
                            type="file"
                            id="comment-file-input"
                            style={{ display: 'none' }}
                            onChange={handleCommentFileChange}
                          />
                          {uploadErrorFile && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{uploadErrorFile}</div>}
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <textarea
                          className="form-control"
                          rows="2"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                        />
                      </div>
                      {commentError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '8px' }}>{commentError}</div>}
                      <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }} disabled={uploadingFile}>
                        💬 הוספת הערה
                      </button>
                    </form>
                  </div>

                </div>

                {/* Sidebar View Area (Right Column) */}
                <div className="details-sidebar">

                  {/* AREA 2: ספק ואיש קשר */}
                  {(isFieldVisibleForTask('contactPerson') || isFieldVisibleForTask('supplierContactEmail')) && (
                    <div className="details-section-card">
                      <h4 className="detail-section-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>📇 ספק ואיש קשר</h4>

                      {/* Supplier Contact Person */}
                      {isFieldVisibleForTask('contactPerson') && (
                        <div className="sidebar-row">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                            <span className="sidebar-label">{getNewTaskFieldLabel('contactPerson')}</span>
                            {flags.enableFieldExclusion && (
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6, padding: '0 4px' }}
                                title={`הסרת ${getNewTaskFieldLabel('contactPerson')} מפרויקט זה`}
                                onClick={() => handleExcludeFieldFromTask('contactPerson', getNewTaskFieldLabel('contactPerson'))}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                          {activeEditField === 'contactPerson' ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                              <input
                                type="text"
                                className="form-control"
                                style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                                value={editContactPerson}
                                onChange={(e) => setEditContactPerson(e.target.value)}
                                onBlur={(e) => handleAutoSaveBlur(e, 'contactPerson', editContactPerson)}
                                list="contacts-list-inline"
                                autoFocus
                              />
                              <datalist id="contacts-list-inline">
                                {Array.from(new Set([
                                  ...getNewTaskFieldOptions('contactPerson'),
                                  ...CONTACTS.map(c => typeof c === 'string' ? c : c.name)
                                ])).map(name => {
                                  const contactObj = CONTACTS.find(c => (typeof c === 'string' ? c : c.name) === name);
                                  const role = contactObj && typeof contactObj !== 'string' ? contactObj.role : '';
                                  const phone = contactObj && typeof contactObj !== 'string' ? contactObj.phone : '';
                                  return (
                                    <option key={name} value={name}>
                                      {role ? `${role} ${phone ? `(${phone})` : ''}` : ''}
                                    </option>
                                  );
                                })}
                              </datalist>
                              <button type="button" data-inline-edit-action="true" className="btn btn-primary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={() => handleSaveField('contactPerson', editContactPerson)}>✔️</button>
                              <button type="button" data-inline-edit-action="true" className="btn btn-secondary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={handleCancelField}>❌</button>
                            </div>
                          ) : (() => {
                            const currentContactPerson = task.contactPerson || task.supplierContactName;
                            const cObj = currentContactPerson ? CONTACTS.find(c => (typeof c === 'string' ? c : c?.name)?.trim().toLowerCase() === currentContactPerson.trim().toLowerCase()) : null;
                            const phone = cObj?.phone || task.phone || task.contactPhone || task.supplierContactPhone || '';
                            const role = cObj?.role || task.contactRole || '';
                            const wechat = cObj?.wechat || task.wechat || '';
                            const address = cObj?.address || '';
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span
                                    className="sidebar-value hover-editable-inline"
                                    onClick={() => startEditingField('contactPerson', currentContactPerson)}
                                    title={`לחצי לעריכת ${getNewTaskFieldLabel('contactPerson')}`}
                                    style={{ fontWeight: currentContactPerson ? '600' : 'normal' }}
                                  >
                                    {currentContactPerson || 'לחצי להוספה...'} ✏️
                                  </span>
                                  {currentContactPerson && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-icon"
                                      style={{ padding: '2px 6px', fontSize: '0.75rem', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="פרטי כרטיס איש קשר"
                                      onClick={() => handleOpenContactCard(currentContactPerson)}
                                    >
                                      📇 כרטיס
                                    </button>
                                  )}
                                </div>
                                {role && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    <span>💼 {role}</span>
                                  </div>
                                )}
                                {phone && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    <span>📞</span>
                                    <a
                                      href={`tel:${phone.replace(/\s+/g, '')}`}
                                      className="directory-phone-link direction-ltr"
                                      style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}
                                    >
                                      {phone}
                                    </a>
                                    <a
                                      href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="שליחת הודעת WhatsApp"
                                      style={{ display: 'inline-flex', alignItems: 'center', color: '#25D366', marginRight: '4px' }}
                                    >
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.503-5.714-1.458L0 24zm6.59-1.859c1.6.953 3.41 1.456 5.29 1.457 5.833 0 10.581-4.75 10.584-10.586.002-2.828-1.095-5.485-3.091-7.483-1.996-1.998-4.654-3.093-7.487-3.094-5.838 0-10.584 4.747-10.588 10.585-.001 1.933.503 3.822 1.464 5.488L1.758 22.25l4.89-1.284z" />
                                      </svg>
                                    </a>
                                  </div>
                                )}
                                {wechat && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    <span>💬 WeChat: {wechat}</span>
                                  </div>
                                )}
                                {address && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    <span>📍 {address}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Supplier Contact Email */}
                      {isFieldVisibleForTask('supplierContactEmail') && (
                        <div className="sidebar-row">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                            <span className="sidebar-label">{getNewTaskFieldLabel('supplierContactEmail')}</span>
                            {flags.enableFieldExclusion && (
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6, padding: '0 4px' }}
                                title={`הסרת ${getNewTaskFieldLabel('supplierContactEmail')} מפרויקט זה`}
                                onClick={() => handleExcludeFieldFromTask('supplierContactEmail', getNewTaskFieldLabel('supplierContactEmail'))}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                          {activeEditField === 'supplierContactEmail' ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                              <input
                                type="text"
                                className="form-control text-left direction-ltr"
                                style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                                value={editSupplierContactEmail}
                                list="supplier-emails-list-inline"
                                onChange={(e) => setEditSupplierContactEmail(e.target.value)}
                                onBlur={(e) => handleAutoSaveBlur(e, 'supplierContactEmail', editSupplierContactEmail)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveField('supplierContactEmail', editSupplierContactEmail);
                                }}
                              />
                              {getNewTaskFieldOptions('supplierContactEmail').length > 0 && (
                                <datalist id="supplier-emails-list-inline">
                                  {getNewTaskFieldOptions('supplierContactEmail').map(email => (
                                    <option key={email} value={email}>{email}</option>
                                  ))}
                                </datalist>
                              )}
                              <button type="button" data-inline-edit-action="true" className="btn btn-primary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={() => handleSaveField('supplierContactEmail', editSupplierContactEmail)}>✔️</button>
                              <button type="button" data-inline-edit-action="true" className="btn btn-secondary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={handleCancelField}>❌</button>
                            </div>
                          ) : (() => {
                            const currentContactPerson = task.contactPerson || task.supplierContactName;
                            const cObj = currentContactPerson ? CONTACTS.find(c => (typeof c === 'string' ? c : c?.name)?.trim().toLowerCase() === currentContactPerson.trim().toLowerCase()) : null;
                            const currentContactEmail = task.supplierContactEmail || task.contactEmail || task.email || task.supplierEmail || (cObj ? cObj.email : '');
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'rtl', flexWrap: 'nowrap' }}>
                                <span
                                  className="sidebar-value hover-editable-inline"
                                  onClick={() => startEditingField('supplierContactEmail', currentContactEmail)}
                                  title={`לחצי לעריכת ${getNewTaskFieldLabel('supplierContactEmail')}`}
                                  style={{
                                    color: currentContactEmail ? 'var(--primary)' : 'var(--text-muted)',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <span style={{
                                    textDecoration: currentContactEmail ? 'underline' : 'none',
                                    direction: currentContactEmail ? 'ltr' : 'rtl'
                                  }}>
                                    {currentContactEmail || 'לחצי להוספה...'}
                                  </span>
                                  ✏️
                                </span>
                                {currentContactEmail && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-icon"
                                    style={{ padding: '2px 4px', fontSize: '0.75rem', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                    title={copiedEmail ? "הועתק!" : "העתק אימייל"}
                                    onClick={() => handleCopyEmail(currentContactEmail)}
                                  >
                                    {copiedEmail ? '✔️' : '📋'}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AREA 3: חומרים ואישורים */}
                  <div className="details-section-card">
                    <h4 className="detail-section-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>🧪 שלב ואישורים</h4>

                    {/* Board Selector */}
                    {flags.enableCustomBoards && availableBoards.length > 1 && (
                      <div className="sidebar-row" style={{ display: 'block', marginBottom: '16px' }}>
                        <span className="sidebar-label" style={{ display: 'block', marginBottom: '6px' }}>{flags.terms.boards}</span>
                        <select
                          className="form-control"
                          style={{ padding: '6px 10px', fontSize: '0.85rem', fontWeight: '600' }}
                          value={task?.boardId || 'active'}
                          onChange={async (e) => {
                            const newBoardId = e.target.value;
                            try {
                              const targetConfig = getBoardStatusConfig(settings, newBoardId);
                              const updates = { boardId: newBoardId, updatedAt: new Date().toISOString() };
                              if (!targetConfig.statuses.includes(task.status)) {
                                updates.status = targetConfig.defaultStatus;
                              }
                              await updateTask(task.id, updates);
                              if (onTaskUpdated) onTaskUpdated(task.id, updates);
                            } catch (err) {
                              console.error('Failed to change board', err);
                              alert('שגיאה בהעברת הלוח. נסי שוב.');
                            }
                          }}
                        >
                          {availableBoards.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.icon ? `${b.icon} ` : '📋 '}{b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Status Picker (Grid) */}
                    {isFieldVisibleForTask('status') && (
                      <div className="sidebar-row" style={{ display: 'block', marginBottom: '16px' }}>
                        <span className="sidebar-label" style={{ display: 'block', marginBottom: '6px' }}>{getNewTaskFieldLabel('status')}</span>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '6px'
                          }}
                        >
                          {(STATUSES.includes(quickStatus) ? STATUSES : [...STATUSES, quickStatus]).map(st => {
                            const colorClass = STATUS_CLASSES[st] || 'badge-frozen';
                            const isActive = st === quickStatus;
                            return (
                              <button
                                key={st}
                                type="button"
                                disabled={savingStatus}
                                className={`badge ${colorClass}`}
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '0.75rem',
                                  textAlign: 'center',
                                  cursor: savingStatus ? 'wait' : 'pointer',
                                  width: '100%',
                                  border: isActive ? '2px solid var(--primary)' : '1px solid transparent',
                                  opacity: isActive ? 1 : 0.45,
                                  transform: isActive ? 'scale(1.02)' : 'none',
                                  fontWeight: isActive ? '700' : '500',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={() => handleStatusChange(st)}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                        {(quickStatus === 'אושר לספק' || quickStatus === 'ארכיון' || task?.completedAt) && (
                          <div className="task-completed-date-badge" style={{ marginTop: '8px', textAlign: 'center' }}>
                            הושלם ב-{formatDate(task?.completedAt || task?.updatedAt)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Diecuts Status */}
                    {isFieldVisibleForTask('diecutsStatus') && (
                      <div className="sidebar-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span className="sidebar-label">{getNewTaskFieldLabel('diecutsStatus')}</span>
                          {flags.enableFieldExclusion && (
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6, padding: '0 4px' }}
                              title={`הסרת ${getNewTaskFieldLabel('diecutsStatus')} מפרויקט זה`}
                              onClick={() => handleExcludeFieldFromTask('diecutsStatus', getNewTaskFieldLabel('diecutsStatus'))}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                          {(getNewTaskFieldOptions('diecutsStatus').length > 0 ? getNewTaskFieldOptions('diecutsStatus') : ['אין', 'חלקי', 'יש']).map(val => {
                            const isActive = (task.diecutsStatus || defaultDiecutsStatus) === val;
                            const badgeClass = val === 'יש' || val === 'כן' ? 'badge-approved' : val === 'חלקי' ? 'badge-in-progress' : 'badge-needs-revision';
                            return (
                              <button
                                key={val}
                                type="button"
                                className={`badge ${badgeClass}`}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  border: isActive ? '2px solid var(--primary)' : '1px solid transparent',
                                  opacity: isActive ? 1 : 0.4,
                                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                  fontWeight: isActive ? '700' : '500',
                                  transition: 'all 0.15s ease',
                                  borderRadius: '12px'
                                }}
                                onClick={() => handleSaveField('diecutsStatus', val)}
                                title={`שינוי ${getNewTaskFieldLabel('diecutsStatus')} ל-${val}`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Images Status */}
                    {isFieldVisibleForTask('imagesStatus') && (
                      <div className="sidebar-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span className="sidebar-label">{getNewTaskFieldLabel('imagesStatus')}</span>
                          {flags.enableFieldExclusion && (
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6, padding: '0 4px' }}
                              title={`הסרת ${getNewTaskFieldLabel('imagesStatus')} מפרויקט זה`}
                              onClick={() => handleExcludeFieldFromTask('imagesStatus', getNewTaskFieldLabel('imagesStatus'))}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                          {(getNewTaskFieldOptions('imagesStatus').length > 0 ? getNewTaskFieldOptions('imagesStatus') : ['אין', 'חלקי', 'יש']).map(val => {
                            const isActive = (task.imagesStatus || defaultImagesStatus) === val;
                            const badgeClass = val === 'יש' || val === 'כן' ? 'badge-approved' : val === 'חלקי' ? 'badge-in-progress' : 'badge-needs-revision';
                            return (
                              <button
                                key={val}
                                type="button"
                                className={`badge ${badgeClass}`}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  border: isActive ? '2px solid var(--primary)' : '1px solid transparent',
                                  opacity: isActive ? 1 : 0.4,
                                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                  fontWeight: isActive ? '700' : '500',
                                  transition: 'all 0.15s ease',
                                  borderRadius: '12px'
                                }}
                                onClick={() => handleSaveField('imagesStatus', val)}
                                title={`שינוי ${getNewTaskFieldLabel('imagesStatus')} ל-${val}`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Standards Institute Required */}
                    {isFieldVisibleForTask('standardsInstituteRequired') && (
                      <div className="sidebar-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span className="sidebar-label">{getNewTaskFieldLabel('standardsInstituteRequired')}</span>
                          {flags.enableFieldExclusion && (
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6, padding: '0 4px' }}
                              title={`הסרת ${getNewTaskFieldLabel('standardsInstituteRequired')} מפרויקט זה`}
                              onClick={() => handleExcludeFieldFromTask('standardsInstituteRequired', getNewTaskFieldLabel('standardsInstituteRequired'))}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                          {(getNewTaskFieldOptions('standardsInstituteRequired').length > 0 ? getNewTaskFieldOptions('standardsInstituteRequired') : ['לא', 'כן']).map(val => {
                            const isActive = (task.standardsInstituteRequired || defaultStandardsInstituteRequired) === val;
                            const badgeClass = val === 'כן' || val === 'יש' ? 'badge-waiting-approval' : 'badge-frozen';
                            return (
                              <button
                                key={val}
                                type="button"
                                className={`badge ${badgeClass}`}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  border: isActive ? '2px solid var(--primary)' : '1px solid transparent',
                                  opacity: isActive ? 1 : 0.4,
                                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                  fontWeight: isActive ? '700' : '500',
                                  transition: 'all 0.15s ease',
                                  borderRadius: '12px'
                                }}
                                onClick={() => handleSaveField('standardsInstituteRequired', val)}
                                title={`שינוי ${getNewTaskFieldLabel('standardsInstituteRequired')} ל-${val}`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* AREA: שדות נוספים / מותאמים */}
                  {customFieldDefinitions.some(f => isFieldVisibleForTask(f.key)) && (
                    <div className="details-section-card">
                      <h4 className="detail-section-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>✨ שדות נוספים</h4>
                      {customFieldDefinitions.filter(f => isFieldVisibleForTask(f.key)).map(f => {
                        const val = task.customFields?.[f.key] ?? task[f.key] ?? '';
                        const isEditing = activeEditField === f.key;

                        return (
                          <div key={f.key} className="sidebar-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <span className="sidebar-label">{f.label}</span>
                              {flags.enableFieldExclusion && (
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6, padding: '0 4px' }}
                                  title={`הסרת שדה ${f.label} מפרויקט זה`}
                                  onClick={() => handleExcludeFieldFromTask(f.key, f.label)}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>

                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                                {f.type === 'select' ? (
                                  <select
                                    className="form-control"
                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                    value={editCustomValue}
                                    onChange={(e) => setEditCustomValue(e.target.value)}
                                    autoFocus
                                  >
                                    <option value="">(ללא בחירה)</option>
                                    {(f.options || []).map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                ) : f.type === 'checkbox' ? (
                                  <select
                                    className="form-control"
                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                    value={String(editCustomValue)}
                                    onChange={(e) => setEditCustomValue(e.target.value === 'true')}
                                    autoFocus
                                  >
                                    <option value="true">כן (מסומן)</option>
                                    <option value="false">לא (לא מסומן)</option>
                                  </select>
                                ) : f.type === 'number' ? (
                                  <input
                                    type="number"
                                    className="form-control"
                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                    value={editCustomValue}
                                    onChange={(e) => setEditCustomValue(e.target.value)}
                                    autoFocus
                                  />
                                ) : f.type === 'date' ? (
                                  <input
                                    type="date"
                                    className="form-control"
                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                    value={editCustomValue}
                                    onChange={(e) => setEditCustomValue(e.target.value)}
                                    autoFocus
                                  />
                                ) : f.type === 'textarea' ? (
                                  <textarea
                                    className="form-control"
                                    rows="2"
                                    style={{ fontSize: '0.8rem' }}
                                    value={editCustomValue}
                                    onChange={(e) => setEditCustomValue(e.target.value)}
                                    autoFocus
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                    value={editCustomValue}
                                    onChange={(e) => setEditCustomValue(e.target.value)}
                                    autoFocus
                                  />
                                )}
                                <button
                                  type="button"
                                  data-inline-edit-action="true"
                                  className="btn btn-primary btn-icon"
                                  style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                                  onClick={() => handleSaveCustomField(f.key, editCustomValue)}
                                >
                                  ✔️
                                </button>
                                <button
                                  type="button"
                                  data-inline-edit-action="true"
                                  className="btn btn-secondary btn-icon"
                                  style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                                  onClick={handleCancelField}
                                >
                                  ❌
                                </button>
                              </div>
                            ) : (
                              <span
                                className="sidebar-value hover-editable-inline"
                                onClick={() => {
                                  setEditCustomValue(val);
                                  startEditingField(f.key, val);
                                }}
                                title={`לחצי לעריכת ${f.label}`}
                                style={{ cursor: 'pointer' }}
                              >
                                {f.type === 'checkbox'
                                  ? (val === true || val === 'true' ? '✅ כן' : '❌ לא')
                                  : (val ? String(val) : 'לחצי להוספה...')
                                } ✏️
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* AREA: החזרת שדות שהוסרו מפרויקט זה */}
                  {flags.enableFieldExclusion && excludedFieldsList.length > 0 && (
                    <div className="details-section-card" style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                      <h4 className="detail-section-title" style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#475569' }}>
                        ➕ שדות שהוסרו מפרויקט זה ({excludedFieldsList.length})
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        לחצי על שדה כדי להחזיר אותו לתצוגת פרויקט זה:
                      </p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {excludedFieldsList.map(field => (
                          <button
                            key={field.key}
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '14px' }}
                            onClick={() => handleRestoreFieldToTask(field.key)}
                            title={`החזרת שדה ${field.label} לפרויקט זה`}
                          >
                            ➕ {field.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="sidebar-row" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    <span>נוצר: {formatDate(task.createdAt)}</span>
                    <span>עודכן: {formatDate(task.updatedAt)}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => onDelete(task.id)}
              >
                🗑️ מחיקת {flags.terms.item}
              </button>

              <button type="button" className="btn btn-secondary" onClick={onClose}>
                סגור
              </button>
            </div>
          </>
        )}
      </div>

      {activeInfoCard && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setActiveInfoCard(null)}>
          <div className="modal-content" style={{ maxWidth: '450px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 className="modal-title" style={{ fontSize: '1.15rem' }}>{activeInfoCard.title}</h3>
              <button className="modal-close" onClick={() => setActiveInfoCard(null)} style={{ marginRight: 0 }}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeInfoCard.fields.map((f, idx) => (
                <div
                  key={idx}
                  className={(activeInfoCard.type === 'contact' || activeInfoCard.type === 'supplier') && activeCardEditField !== idx ? 'hover-editable' : ''}
                  onClick={() => (activeInfoCard.type === 'contact' || activeInfoCard.type === 'supplier') && setActiveCardEditField(idx)}
                  title={(activeInfoCard.type === 'contact' || activeInfoCard.type === 'supplier') ? 'לחצו לעריכה' : undefined}
                  style={{
                    borderBottom: idx === activeInfoCard.fields.length - 1 ? 'none' : '1px solid #f1f5f9',
                    padding: (activeInfoCard.type === 'contact' || activeInfoCard.type === 'supplier') ? '6px 8px 10px' : '0 0 8px',
                    borderRadius: '6px',
                    cursor: (activeInfoCard.type === 'contact' || activeInfoCard.type === 'supplier') && activeCardEditField !== idx ? 'pointer' : 'default'
                  }}
                >
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>
                    {f.label}
                  </span>
                  {(activeInfoCard.type === 'contact' || activeInfoCard.type === 'supplier') && activeCardEditField === idx ? (
                    f.isMultiline ? (
                      <textarea
                        className="form-control"
                        rows="3"
                        autoFocus
                        value={f.value || ''}
                        onChange={(e) => updateInfoCardField(idx, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <input
                        className={`form-control ${f.isLtr ? 'direction-ltr text-left' : ''}`}
                        type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
                        autoFocus
                        value={f.value || ''}
                        onChange={(e) => updateInfoCardField(idx, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setActiveCardEditField(null);
                        }}
                      />
                    )
                  ) : f.isMultiline ? (
                    <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: 'var(--text-dark)' }}>
                      {f.value || '-'}
                    </p>
                  ) : f.type === 'phone' && f.value ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a href={`tel:${f.value}`} className="direction-ltr text-left" style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600', textDecoration: 'underline' }}>
                        {f.value}
                      </a>
                      <a
                        href={`https://wa.me/${f.value.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="שליחת הודעת WhatsApp"
                        style={{ display: 'inline-flex', alignItems: 'center', color: '#25D366' }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.503-5.714-1.458L0 24zm6.59-1.859c1.6.953 3.41 1.456 5.29 1.457 5.833 0 10.581-4.75 10.584-10.586.002-2.828-1.095-5.485-3.091-7.483-1.996-1.998-4.654-3.093-7.487-3.094-5.838 0-10.584 4.747-10.588 10.585-.001 1.933.503 3.822 1.464 5.488L1.758 22.25l4.89-1.284z" />
                        </svg>
                      </a>
                    </div>
                  ) : f.type === 'email' && f.value ? (
                    <a href={`mailto:${f.value}`} className="direction-ltr text-left" style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600', textDecoration: 'underline' }}>
                      {f.value}
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: '500' }}>
                      {f.value || '-'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveInfoCard(null)}>
                {(activeInfoCard.type === 'contact' || activeInfoCard.type === 'supplier') ? 'ביטול' : 'סגור'}
              </button>
              {(activeInfoCard.type === 'contact' || activeInfoCard.type === 'supplier') && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isSavingInfoCard || !activeInfoCard.fields[0].value?.trim()}
                  onClick={saveInfoCard}
                >
                  {isSavingInfoCard ? 'שומר...' : 'שמור שינויים'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {commentToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={(e) => { e.stopPropagation(); setCommentToDelete(null); }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '12px' }}>מחיקת הערה</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>האם את בטוחה שברצונך למחוק הערה זו לצמיתות? לא ניתן לבטל פעולה זו.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCommentToDelete(null)}
                style={{ flex: 1 }}
              >
                ביטול
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDeleteComment}
                style={{ flex: 1 }}
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlanogramDeleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={(e) => { e.stopPropagation(); setShowPlanogramDeleteConfirm(false); }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '12px' }}>מחיקת פלנוגרמה</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>האם את בטוחה שברצונך למחוק את הפלנוגרמה? לא ניתן לבטל פעולה זו.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPlanogramDeleteConfirm(false)}
                style={{ flex: 1 }}
              >
                ביטול
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDeletePlanogram}
                style={{ flex: 1 }}
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Exclusion Confirmation Modal */}
      {fieldToExclude && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setFieldToExclude(null)}>
          <div className="modal-content confirm-dialog" style={{ maxWidth: '420px', textAlign: 'center', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '10px' }}>הסרת שדה מפרויקט זה</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5, fontSize: '0.9rem' }}>
              האם את/ה בטוח/ה שברצונך להסיר את השדה <strong style={{ color: '#1e293b' }}>"{fieldToExclude.label}"</strong> מפרויקט זה?
              <br />
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>השדה יוסר מתצוגת פרויקט זה בלבד. תוכל/י להחזיר אותו בכל עת מתחתית הכרטיס.</span>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFieldToExclude(null)}
                style={{ flex: 1 }}
              >
                ביטול
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmExcludeFieldFromTask}
                style={{ flex: 1 }}
              >
                הסר שדה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Preview Modal */}
      <React.Suspense fallback={null}>
        <ExcelPreviewModal
          isOpen={!!excelPreviewFile}
          onClose={() => setExcelPreviewFile(null)}
          fileUrl={excelPreviewFile?.url}
          fileName={excelPreviewFile?.name}
        />
      </React.Suspense>

      {/* PDF Preview Modal */}
      <React.Suspense fallback={null}>
        <PdfPreviewModal
          isOpen={!!pdfPreviewFile}
          onClose={() => setPdfPreviewFile(null)}
          fileUrl={pdfPreviewFile?.url}
          fileName={pdfPreviewFile?.name}
        />
      </React.Suspense>

      {/* Image Preview Modal */}
      <React.Suspense fallback={null}>
        <ImagePreviewModal
          isOpen={!!imagePreviewFile}
          onClose={() => setImagePreviewFile(null)}
          fileUrl={imagePreviewFile?.url}
          fileName={imagePreviewFile?.name}
        />
      </React.Suspense>
    </div>
  );
}
