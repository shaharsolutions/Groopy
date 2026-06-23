import React, { useState, useEffect } from 'react';
import { getCommentsForTask, addComment, deleteComment, updateTask, getPrivateNotes, uploadFileToStorage, addContact, updateContact, addSupplier, updateSupplier } from '../utils/storage';
import ExcelPreviewModal from './ExcelPreviewModal';
import PdfPreviewModal from './PdfPreviewModal';
import PlanogramFileCard from './PlanogramFileCard';

export default function AdminDetailsModal({ 
  task, 
  settings, 
  suppliers: SUPPLIERS = [],
  contacts: CONTACTS = [],
  onSaveSettings,
  onClose, 
  onSave, 
  onDelete,
  onRefresh,
  onTaskUpdated,
  onStatusChange,
  startInEditMode = false,
  userId
}) {
  const {
    statuses: STATUSES = ['חדש', 'בטיפול', 'נשלח לספק', 'אושר לספק'],
    workTypes: WORK_TYPES = ['אריזה', 'מדבקה', 'קטלוג', 'לוגו', 'תיקון קובץ', 'קובץ להדפסה', 'אחר'],
    defaultStatus: DEFAULT_STATUS = 'חדש',
    statusColors: STATUS_CLASSES = {
      'חדש': 'badge-new',
      'בטיפול': 'badge-in-progress',
      'נשלח לספק': 'badge-waiting-approval',
      'אושר לספק': 'badge-approved'
    }
  } = settings || {};

  const isCreateMode = !task;

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [excelPreviewFile, setExcelPreviewFile] = useState(null);
  const [pdfPreviewFile, setPdfPreviewFile] = useState(null);

  const handleCopyTaskLink = () => {
    if (!task) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?mode=viewer&userId=${userId}&taskId=${task.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy link", err);
      });
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
  const [authorName, setAuthorName] = useState(() => {
    return localStorage.getItem('tiktak_comment_author_admin') || 'מנהל/ת תיקתק';
  });
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadErrorFile, setUploadErrorFile] = useState('');
  const [uploadProgressFile, setUploadProgressFile] = useState(0);

  // Inline Editing Mode States
  const [activeEditField, setActiveEditField] = useState(null);
  const [activeInfoCard, setActiveInfoCard] = useState(null);
  const [activeCardEditField, setActiveCardEditField] = useState(null);
  const [isSavingInfoCard, setIsSavingInfoCard] = useState(false);

  const handleOpenSupplierCard = (supplierName) => {
    if (!supplierName) return;
    setActiveCardEditField(null);
    const sup = SUPPLIERS.find(s => (typeof s === 'string' ? s : s.name) === supplierName);
    const supObj = typeof sup === 'string' ? { name: sup } : (sup || { name: supplierName });
    setActiveInfoCard({
      type: 'supplier',
      title: `📇 כרטיס ספק: ${supObj.name}`,
      supplierId: supObj.id,
      fields: [
        { key: 'name', label: 'שם הספק', value: supObj.name },
        { key: 'contactPerson', label: 'איש קשר אצל הספק', value: supObj.contactPerson || '' },
        { key: 'phone', label: 'טלפון', value: supObj.phone || '', isLtr: true, type: 'phone' },
        { key: 'email', label: 'אימייל', value: supObj.email || '', isLtr: true, type: 'email' },
        { key: 'address', label: 'כתובת', value: supObj.address || '' },
        { key: 'wechat', label: 'WeChat / WhatsApp', value: supObj.wechat || '', isLtr: true, type: 'whatsapp' },
        { key: 'notes', label: 'הערות ומידע נוסף', value: supObj.notes || '', isMultiline: true }
      ]
    });
  };

  const handleOpenContactCard = (contactName) => {
    if (!contactName) return;
    setActiveCardEditField(null);
    const contact = CONTACTS.find(c => c.name === contactName);
    const contactObj = contact || { name: contactName };
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
  const [editWorkType, setEditWorkType] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editSupplierContactEmail, setEditSupplierContactEmail] = useState('');
  const [editDiecutsStatus, setEditDiecutsStatus] = useState('אין');
  const [editImagesStatus, setEditImagesStatus] = useState('אין');
  const [editStandardsInstituteRequired, setEditStandardsInstituteRequired] = useState('לא');
  const [editInternalNotes, setEditInternalNotes] = useState('');

  // States for CREATE mode (full form)
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createWorkType, setCreateWorkType] = useState(WORK_TYPES[0] || 'אריזה');
  const [createContactPerson, setCreateContactPerson] = useState('');
  const [createSupplierContactEmail, setCreateSupplierContactEmail] = useState('');
  const [createDiecutsStatus, setCreateDiecutsStatus] = useState('אין');
  const [createImagesStatus, setCreateImagesStatus] = useState('אין');
  const [createStandardsInstituteRequired, setCreateStandardsInstituteRequired] = useState('לא');
  const [createStatus, setCreateStatus] = useState(DEFAULT_STATUS || 'חדש');
  const [createInternalNotes, setCreateInternalNotes] = useState('');
  const [createAttachments, setCreateAttachments] = useState([]);
  const [createPlanogramFile, setCreatePlanogramFile] = useState(null);

  // Common upload/error states for files
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [totalUploadCount, setTotalUploadCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});

  // Quick-edit states for View Mode (Status)
  const [quickStatus, setQuickStatus] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');

  // Planogram creation upload states
  const [uploadingPlanogram, setUploadingPlanogram] = useState(false);
  const [uploadErrorPlanogram, setUploadErrorPlanogram] = useState('');
  const [uploadProgressPlanogram, setUploadProgressPlanogram] = useState(0);

  // Sync with task updates
  useEffect(() => {
    if (task) {
      setQuickStatus(task.status || '');
      
      const loadComments = async () => {
        const fetchedComments = await getCommentsForTask(task.id, userId);
        setComments(fetchedComments);
      };
      const loadPrivateNotes = async () => {
        const notes = await getPrivateNotes(task.id, userId);
        setInternalNotes(notes);
      };
      loadComments();
      loadPrivateNotes();
      
      // If we clicked edit directly from table
      if (startInEditMode && activeEditField === null) {
        startEditingField('title', task.title);
      }
    } else {
      // Seed default creation form
      setCreateTitle('');
      setCreateDescription('');
      setCreateWorkType(WORK_TYPES[0] || 'אריזה');
      setCreateContactPerson('');
      setCreateSupplierContactEmail('');
      setCreateDiecutsStatus('אין');
      setCreateImagesStatus('אין');
      setCreateStandardsInstituteRequired('לא');
      setCreateStatus(DEFAULT_STATUS || 'חדש');
      setCreateAttachments([]);
      setCreatePlanogramFile(null);
      setCreateInternalNotes('');
      setErrors({});
    }
  }, [task, startInEditMode, settings, DEFAULT_STATUS, WORK_TYPES]);

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

  if (!task && !isCreateMode) return null;

  // --- Inline Field Handlers ---

  const startEditingField = (fieldKey, value) => {
    setActiveEditField(fieldKey);
    if (fieldKey === 'title') setEditTitle(value || '');
    if (fieldKey === 'description') setEditDescription(value || '');
    if (fieldKey === 'workType') setEditWorkType(value || '');
    if (fieldKey === 'contactPerson') setEditContactPerson(value || '');
    if (fieldKey === 'supplierContactEmail') setEditSupplierContactEmail(value || '');
    if (fieldKey === 'diecutsStatus') setEditDiecutsStatus(value || 'אין');
    if (fieldKey === 'imagesStatus') setEditImagesStatus(value || 'אין');
    if (fieldKey === 'standardsInstituteRequired') setEditStandardsInstituteRequired(value || 'לא');
    if (fieldKey === 'internalNotes') setEditInternalNotes(value || '');
  };

  const handleCancelField = () => {
    setActiveEditField(null);
  };

  const handleSaveField = async (fieldKey, value) => {
    const trimmedVal = typeof value === 'string' ? value.trim() : value;
    if (fieldKey === 'title' && !trimmedVal) {
      alert('שם העבודה הוא שדה חובה');
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

  const handleAutoSaveBlur = (event, fieldKey, value) => {
    if (event.relatedTarget?.closest?.('[data-inline-edit-action="true"]')) return;
    void handleSaveField(fieldKey, value);
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

  const handleDeleteComment = (commentId) => {
    setCommentToDelete(commentId);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await deleteComment(commentToDelete, task.id);
      const fetchedComments = await getCommentsForTask(task.id);
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

    if (!authorName.trim()) {
      setCommentError('נא להזין שם כותב');
      return;
    }
    if (!commentText.trim()) {
      setCommentError('נא להזין תוכן תגובה');
      return;
    }

    try {
      await addComment(
        task.id,
        authorName,
        commentText,
        attachedFile ? attachedFile.url : null,
        attachedFile ? attachedFile.name : null,
        userId
      );
      if (authorName.trim()) {
        localStorage.setItem('tiktak_comment_author_admin', authorName.trim());
      } else {
        localStorage.removeItem('tiktak_comment_author_admin');
      }
      setCommentText('');
      setAttachedFile(null);
      const fetchedComments = await getCommentsForTask(task.id);
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

    if (!/\.(jpg|jpeg|png|webp|gif|pdf)$/i.test(file.name)) {
      alert('אנא בחרי קובץ תמונה או PDF');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFileToStorage(file, 'planograms', () => {});
      await updateTask(task.id, { planogramFile: result });
      e.target.value = '';
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('שגיאה בהעלאת הפלנוגרמה');
    } finally {
      setUploading(false);
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

  const handlePlanogramUploadCreate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB limit
    if (file.size > MAX_SIZE) {
      setUploadErrorPlanogram('גודל הקובץ עולה על המותר (מקסימום 15MB)');
      e.target.value = '';
      return;
    }

    if (!/\.(jpg|jpeg|png|webp|gif|pdf)$/i.test(file.name)) {
      setUploadErrorPlanogram('אנא בחרי קובץ תמונה או PDF');
      e.target.value = '';
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
      e.target.value = '';
    } catch (err) {
      console.error(err);
      setUploadErrorPlanogram('שגיאה בהעלאת הפלנוגרמה');
    } finally {
      setUploadingPlanogram(false);
    }
  };

  const handlePlanogramDeleteCreate = () => {
    setCreatePlanogramFile(null);
  };

  const handleSubmitCreate = (e) => {
    e.preventDefault();
    
    const formErrors = {};
    if (!createTitle.trim()) {
      formErrors.title = 'שדה שם העבודה הוא חובה';
    }

    if (createSupplierContactEmail.trim()) {
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
      workType: createWorkType,
      supplierName: '',
      contactPerson: createContactPerson.trim(),
      supplierContactEmail: createSupplierContactEmail.trim(),
      diecutsStatus: createDiecutsStatus,
      imagesStatus: createImagesStatus,
      standardsInstituteRequired: createStandardsInstituteRequired,
      status: createStatus,
      workOrderFiles: createAttachments,
      planogramFile: createPlanogramFile,
      internalNotes: createInternalNotes.trim()
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
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: isCreateMode ? '820px' : '1000px', 
          transition: 'max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)' 
        }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3 className="modal-title" style={{ width: '100%' }}>
              {isCreateMode ? (
                'יצירת עבודה חדשה'
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
                <span 
                  className="hover-editable-inline" 
                  onClick={() => startEditingField('title', task.title)}
                  title="לחצי לעריכת שם העבודה"
                >
                  {task.title} ✏️
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
                title="העתק קישור שיתוף ישיר לפרויקט זה"
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
            <div className="modal-body" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
              
              <div className="form-group">
                <label className="form-label">שם העבודה *</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="לדוגמה: אריזה מעוצבת למשקל דיגיטלי"
                  value={createTitle}
                  autoFocus
                  onChange={(e) => {
                    setCreateTitle(e.target.value);
                    if (errors.title) setErrors({...errors, title: null});
                  }}
                />
                {errors.title && <span className="form-error">{errors.title}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">תיאור ופרטים נוספים</label>
                <textarea 
                  className="form-control"
                  rows="3"
                  placeholder="פירוט המשימה, דרישות מיוחדות מהמעצבת..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>



              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">סטטוס</label>
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: '8px',
                      marginTop: '4px'
                    }}
                  >
                    {(STATUSES.includes(createStatus) ? STATUSES : [...STATUSES, createStatus]).map(st => {
                      const colorClass = STATUS_CLASSES[st] || 'badge-frozen';
                      const isActive = st === createStatus;
                      return (
                        <button
                          key={st}
                          type="button"
                          className={`badge ${colorClass}`}
                          style={{
                            padding: '8px 10px',
                            fontSize: '0.75rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            width: '100%',
                            border: isActive ? '2px solid var(--primary)' : '1px solid transparent',
                            opacity: isActive ? 1 : 0.5,
                            transform: isActive ? 'scale(1.03)' : 'none',
                            boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                            fontWeight: isActive ? '700' : '500',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => setCreateStatus(st)}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">איש קשר אצל הספק</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="לדוגמה: Mr. Li"
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
                    {CONTACTS.map(c => {
                      const name = typeof c === 'string' ? c : c.name;
                      const role = typeof c === 'string' ? '' : c.role;
                      const phone = typeof c === 'string' ? '' : c.phone;
                      return (
                        <option key={name} value={name}>
                          {role ? `${role} ${phone ? `(${phone})` : ''}` : ''}
                        </option>
                      );
                    })}
                  </datalist>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">מייל איש קשר ספק</label>
                  <input 
                    type="text"
                    className="form-control text-left direction-ltr"
                    placeholder="example@supplier.com"
                    value={createSupplierContactEmail}
                    onChange={(e) => {
                      setCreateSupplierContactEmail(e.target.value);
                      if (errors.supplierContactEmail) setErrors({...errors, supplierContactEmail: null});
                    }}
                  />
                  {errors.supplierContactEmail && <span className="form-error">{errors.supplierContactEmail}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">דרישות מכון תקנים</label>
                  <select 
                    className="form-control"
                    value={createStandardsInstituteRequired}
                    onChange={(e) => setCreateStandardsInstituteRequired(e.target.value)}
                  >
                    <option value="לא">לא</option>
                    <option value="כן">כן</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">דייקאטים</label>
                  <select 
                    className="form-control"
                    value={createDiecutsStatus}
                    onChange={(e) => setCreateDiecutsStatus(e.target.value)}
                  >
                    <option value="אין">אין</option>
                    <option value="יש">יש</option>
                    <option value="חלקי">חלקי</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">תמונות</label>
                  <select 
                    className="form-control"
                    value={createImagesStatus}
                    onChange={(e) => setCreateImagesStatus(e.target.value)}
                  >
                    <option value="אין">אין</option>
                    <option value="יש">יש</option>
                    <option value="חלקי">חלקי</option>
                  </select>
                </div>
              </div>

              {/* הזמנת עבודה (קבצים מצורפים) */}
              <div className="form-group">
                <label className="form-label">
                  הזמנת עבודה (קבצים מצורפים כגון תעודות, הוראות עבודה, PDF)
                </label>
                
                <div 
                  className={`file-upload-zone ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('modal-task-file-input-create').click()}
                >
                  <div className="file-upload-icon">📁</div>
                  <div className="file-upload-text">
                    <strong>גררי לכאן קבצים</strong> או לחצי לבחירה מהמחשב
                  </div>
                  <div className="file-upload-subtext" style={{ fontSize: '0.8rem', color: 'var(--text-muted, #718096)' }}>
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
                  <div className="attachments-list" style={{ marginTop: '12px' }}>
                    {createAttachments.map((file, idx) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                      return (
                        <div key={idx} className="attachment-row">
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="attachment-info"
                            title="צפייה בקובץ"
                          >
                            <span className="attachment-icon">{isImage ? '🖼️' : '📄'}</span>
                            <span style={{ direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {file.name}
                            </span>
                          </a>
                          <button 
                            type="button" 
                            className="attachment-delete-btn"
                            onClick={() => handleDeleteAttachmentCreateMode(idx)}
                            title="הסר קובץ"
                          >
                            🗑️
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* פלנוגרמה Upload */}
              <div className="form-group">
                <label className="form-label">העלאת פלנוגרמה</label>
                {createPlanogramFile ? (
                  <PlanogramFileCard file={createPlanogramFile} onDelete={handlePlanogramDeleteCreate} deleteLabel="הסרה" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => document.getElementById('planogram-upload-create-input').click()}
                      disabled={uploadingPlanogram}
                    >
                      {uploadingPlanogram ? `🔄 מעלה...` : 'בחירת פלנוגרמה'}
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(תמונה או PDF, עד 15MB)</span>
                    <input 
                      type="file" 
                      id="planogram-upload-create-input" 
                      accept="image/*,.pdf,application/pdf"
                      style={{ display: 'none' }}
                      onChange={handlePlanogramUploadCreate}
                    />
                  </div>
                )}
                {uploadErrorPlanogram && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '6px' }}>{uploadErrorPlanogram}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">הערות פנימיות למעצבת (לא יוצגו לצופים חיצוניים)</label>
                <textarea 
                  className="form-control"
                  rows="2"
                  placeholder="פרטי לוגיסטיקה, סיסמאות לקבצים, הערות תמחור..."
                  value={createInternalNotes}
                  onChange={(e) => setCreateInternalNotes(e.target.value)}
                />
              </div>

            </div>
            
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                ביטול
              </button>
              <button type="submit" className="btn btn-primary" disabled={uploading || uploadingPlanogram}>
                יצירת עבודה
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
                  
                  {/* AREA 1: פרטי עבודה */}
                  <div className="details-section-card">
                    <h4 className="detail-section-title">📁 פרטי עבודה</h4>
                    


                    {/* Field: Description */}
                    <div style={{ marginBottom: '16px' }}>
                      <label className="form-label" style={{ fontWeight: '700', marginBottom: '4px', display: 'block', fontSize: '0.85rem' }}>תיאור העבודה</label>
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
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>אין תיאור מפורט לעבודה זו. לחצי להוספת תיאור.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Field: Internal Notes */}
                    <div>
                      <label className="form-label" style={{ fontWeight: '700', color: 'var(--secondary)', display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>🔒 הערות פנימיות למעצבת (לא יוצגו לצופים חיצוניים)</label>
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
                  </div>

                  {/* AREA 4: הזמנת עבודה ופלנוגרמה */}
                  <div className="details-section-card">
                    <h4 className="detail-section-title">📋 הזמנת עבודה ופלנוגרמה</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      
                      {/* הזמנת עבודה */}
                      <div>
                        <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block', fontSize: '0.85rem' }}>
                          הזמנת עבודה (קבצים מצורפים)
                        </label>
                        
                        {(() => {
                          const filesList = task.workOrderFiles || task.attachments || [];
                          return filesList.length > 0 ? (
                            <div className="attachments-list" style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '12px' }}>
                              {filesList.map((file, idx) => {
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                                const isExcel = /\.(xlsx|xls)$/i.test(file.name);
                                const isPdf = /\.pdf$/i.test(file.name);
                                return (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                    <a 
                                      href={file.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="attachment-info"
                                      style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}
                                      title={file.name}
                                      onClick={(e) => {
                                        if (isExcel) {
                                          e.preventDefault();
                                          setExcelPreviewFile({ url: file.url, name: file.name });
                                        } else if (isPdf) {
                                          e.preventDefault();
                                          setPdfPreviewFile({ url: file.url, name: file.name });
                                        }
                                      }}
                                    >
                                      <span className="attachment-icon">{isImage ? '🖼️ ' : isExcel ? '📊 ' : isPdf ? '📄 ' : '📎 '}</span>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right', display: 'block' }}>
                                        {file.name}
                                      </span>
                                    </a>
                                    <button 
                                      type="button" 
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '2px' }}
                                      onClick={() => handleDeleteAttachmentDirectly(idx)}
                                      title="מחיקת קובץ"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '12px' }}>
                              אין קבצים מצורפים
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

                      {/* פלנוגרמה */}
                      <div>
                        <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block', fontSize: '0.85rem' }}>
                          פלנוגרמה
                        </label>
                        
                        {task.planogramFile ? (
                          <PlanogramFileCard file={task.planogramFile} onDelete={handlePlanogramDeleteView} />
                        ) : (
                          <div 
                            className="planogram-preview-container" 
                            style={{ height: '140px', margin: 0, borderStyle: 'dashed', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', alignItems: 'center' }}
                          >
                            <span className="planogram-empty-text" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>לא הועלתה פלנוגרמה</span>
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => document.getElementById('planogram-upload-view-input').click()}
                              disabled={uploading}
                            >
                              העלאת פלנוגרמה
                            </button>
                            <input 
                              type="file" 
                              id="planogram-upload-view-input" 
                              accept="image/*,.pdf,application/pdf"
                              style={{ display: 'none' }}
                              onChange={handlePlanogramUploadView}
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* AREA 5: הערות ועדכוני עבודה */}
                  <div className="comments-section">
                    <h4 className="detail-section-title">💬 הערות ועדכוני עבודה ({comments.length})</h4>
                    
                    {comments.length === 0 ? (
                      <div className="empty-state" style={{ padding: '24px' }}>
                        <div className="empty-state-title">אין הערות עדיין</div>
                        <div className="empty-state-text font-size-sm">היה הראשון להוסיף הערה או לעדכן לגבי התקדמות העבודה.</div>
                      </div>
                    ) : (
                      <div className="comments-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
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
                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group" style={{ marginBottom: '8px' }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>שם כותב/ת ההערה</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={authorName} 
                            onChange={(e) => setAuthorName(e.target.value)} 
                          />
                        </div>
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
                          placeholder="כתבי הערה כאן... (ההערה תוצג גם לצופה החיצוני)"
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
                  <div className="details-section-card">
                    <h4 className="detail-section-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>📇 ספק ואיש קשר</h4>
                    
                    {/* Supplier Contact Person */}
                    <div className="sidebar-row">
                      <span className="sidebar-label">איש קשר אצל הספק</span>
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
                            {CONTACTS.map(c => {
                              const name = typeof c === 'string' ? c : c.name;
                              const role = typeof c === 'string' ? '' : c.role;
                              const phone = typeof c === 'string' ? '' : c.phone;
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
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span 
                            className="sidebar-value hover-editable-inline" 
                            onClick={() => startEditingField('contactPerson', task.contactPerson)}
                            title="לחצי לעריכת איש קשר ספק"
                          >
                            {task.contactPerson || 'לחצי להוספה...'} ✏️
                          </span>
                          {task.contactPerson && (
                            <button 
                              type="button" 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '2px 4px', fontSize: '0.75rem', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="פרטי כרטיס איש קשר"
                              onClick={() => handleOpenContactCard(task.contactPerson)}
                            >
                              ℹ️
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Supplier Contact Email */}
                    <div className="sidebar-row">
                      <span className="sidebar-label">מייל איש קשר ספק</span>
                      {activeEditField === 'supplierContactEmail' ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                          <input 
                            type="text" 
                            className="form-control text-left direction-ltr" 
                            style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                            value={editSupplierContactEmail} 
                            onChange={(e) => setEditSupplierContactEmail(e.target.value)} 
                            onBlur={(e) => handleAutoSaveBlur(e, 'supplierContactEmail', editSupplierContactEmail)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveField('supplierContactEmail', editSupplierContactEmail);
                            }}
                          />
                          <button type="button" data-inline-edit-action="true" className="btn btn-primary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={() => handleSaveField('supplierContactEmail', editSupplierContactEmail)}>✔️</button>
                          <button type="button" data-inline-edit-action="true" className="btn btn-secondary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={handleCancelField}>❌</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'rtl', flexWrap: 'nowrap' }}>
                          <span 
                            className="sidebar-value hover-editable-inline" 
                            onClick={() => startEditingField('supplierContactEmail', task.supplierContactEmail)}
                            title="לחצי לעריכת מייל איש קשר ספק"
                            style={{ 
                              color: task.supplierContactEmail ? 'var(--primary)' : 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span style={{ 
                              textDecoration: task.supplierContactEmail ? 'underline' : 'none',
                              direction: task.supplierContactEmail ? 'ltr' : 'rtl'
                            }}>
                              {task.supplierContactEmail || 'לחצי להוספה...'}
                            </span>
                            ✏️
                          </span>
                          {task.supplierContactEmail && (
                            <button 
                              type="button" 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '2px 4px', fontSize: '0.75rem', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                              title={copiedEmail ? "הועתק!" : "העתק אימייל"}
                              onClick={() => handleCopyEmail(task.supplierContactEmail)}
                            >
                              {copiedEmail ? '✔️' : '📋'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AREA 3: חומרים ואישורים */}
                  <div className="details-section-card">
                    <h4 className="detail-section-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>🧪 חומרים ואישורים</h4>
                    
                    {/* Status Picker (Grid) */}
                    <div className="sidebar-row" style={{ display: 'block', marginBottom: '16px' }}>
                      <span className="sidebar-label" style={{ display: 'block', marginBottom: '6px' }}>סטטוס עבודה</span>
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
                    </div>

                    {/* Diecuts Status */}
                    <div className="sidebar-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <span className="sidebar-label">דייקאטים</span>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                        {[
                          { val: 'אין', label: 'אין', class: 'badge-needs-revision' },
                          { val: 'חלקי', label: 'חלקי', class: 'badge-in-progress' },
                          { val: 'יש', label: 'יש', class: 'badge-approved' }
                        ].map(item => {
                          const isActive = (task.diecutsStatus || 'אין') === item.val;
                          return (
                            <button
                              key={item.val}
                              type="button"
                              className={`badge ${item.class}`}
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
                              onClick={() => handleSaveField('diecutsStatus', item.val)}
                              title={`שינוי דייקאטים ל-${item.label}`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Images Status */}
                    <div className="sidebar-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <span className="sidebar-label">תמונות</span>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                        {[
                          { val: 'אין', label: 'אין', class: 'badge-needs-revision' },
                          { val: 'חלקי', label: 'חלקי', class: 'badge-in-progress' },
                          { val: 'יש', label: 'יש', class: 'badge-approved' }
                        ].map(item => {
                          const isActive = (task.imagesStatus || 'אין') === item.val;
                          return (
                            <button
                              key={item.val}
                              type="button"
                              className={`badge ${item.class}`}
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
                              onClick={() => handleSaveField('imagesStatus', item.val)}
                              title={`שינוי תמונות ל-${item.label}`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Standards Institute Required */}
                    <div className="sidebar-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <span className="sidebar-label">דרישות מכון תקנים</span>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                        {[
                          { val: 'לא', label: 'לא', class: 'badge-frozen' },
                          { val: 'כן', label: 'כן', class: 'badge-waiting-approval' }
                        ].map(item => {
                          const isActive = (task.standardsInstituteRequired || 'לא') === item.val;
                          return (
                            <button
                              key={item.val}
                              type="button"
                              className={`badge ${item.class}`}
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
                              onClick={() => handleSaveField('standardsInstituteRequired', item.val)}
                              title={`שינוי מכון תקנים ל-${item.label}`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>

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
                🗑️ מחיקת עבודה
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

      {/* Excel Preview Modal */}
      <ExcelPreviewModal 
        isOpen={!!excelPreviewFile} 
        onClose={() => setExcelPreviewFile(null)} 
        fileUrl={excelPreviewFile?.url} 
        fileName={excelPreviewFile?.name} 
      />

      {/* PDF Preview Modal */}
      <PdfPreviewModal 
        isOpen={!!pdfPreviewFile} 
        onClose={() => setPdfPreviewFile(null)} 
        fileUrl={pdfPreviewFile?.url} 
        fileName={pdfPreviewFile?.name} 
      />
    </div>
  );
}
