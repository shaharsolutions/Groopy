import React, { useState, useEffect } from 'react';
import { getCommentsForTask, addComment, deleteComment, updateTask, getPrivateNotes, uploadFileToStorage } from '../utils/storage';
import CustomDatePicker from './CustomDatePicker';

export default function AdminDetailsModal({ 
  task, 
  settings, 
  onClose, 
  onSave, 
  onDelete, 
  onRefresh, 
  startInEditMode = false 
}) {
  const {
    statuses: STATUSES = [],
    priorities: PRIORITIES = [],
    workTypes: WORK_TYPES = [],
    stores: STORES = [],
    importManagers: IMPORT_MANAGERS = [],
    defaultStatus: DEFAULT_STATUS = 'חדש',
    statusColors: STATUS_CLASSES = {},
    priorityColors: PRIORITY_CLASSES = {},
    suppliers: SUPPLIERS = [],
    contacts: CONTACTS = []
  } = settings || {};

  const isCreateMode = !task;

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyTaskLink = () => {
    if (!task) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?mode=viewer&taskId=${task.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy link", err);
      });
  };

  // View state: comments
  const [comments, setComments] = useState([]);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [authorName, setAuthorName] = useState('מנהל/ת תיקתק');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [subtaskError, setSubtaskError] = useState('');
  
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadErrorFile, setUploadErrorFile] = useState('');

  // Inline Editing Mode States
  const [activeEditField, setActiveEditField] = useState(null);

  // States for temporary field values while editing inline
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWorkType, setEditWorkType] = useState('');
  const [editStoreName, setEditStoreName] = useState('');
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editImportManager, setEditImportManager] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editDriveLink, setEditDriveLink] = useState('');
  const [editInternalNotes, setEditInternalNotes] = useState('');

  // States for CREATE mode (full form)
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createWorkType, setCreateWorkType] = useState(WORK_TYPES[0] || 'אריזה');
  const [createStoreName, setCreateStoreName] = useState('');
  const [createSupplierName, setCreateSupplierName] = useState('');
  const [createContactPerson, setCreateContactPerson] = useState('');
  const [createImportManager, setCreateImportManager] = useState('');
  const [createStatus, setCreateStatus] = useState(DEFAULT_STATUS || 'חדש');
  const [createPriority, setCreatePriority] = useState(PRIORITIES[0] || 'רגילה');
  const [createDeadline, setCreateDeadline] = useState('');
  const [createDriveLink, setCreateDriveLink] = useState('');
  const [createInternalNotes, setCreateInternalNotes] = useState('');
  const [createAttachments, setCreateAttachments] = useState([]);

  // Sub-tasks state for Create Mode
  const [createSubtasks, setCreateSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Sub-tasks state for View/Edit Mode
  const [newSubtaskViewTitle, setNewSubtaskViewTitle] = useState('');

  // Common upload/error states for files
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgressFile, setUploadProgressFile] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [totalUploadCount, setTotalUploadCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});

  // Quick-edit states for View Mode (Status/Priority)
  const [quickStatus, setQuickStatus] = useState('');
  const [quickPriority, setQuickPriority] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Sync with task updates
  useEffect(() => {
    if (task) {
      setQuickStatus(task.status || '');
      setQuickPriority(task.priority || '');
      
      const loadComments = async () => {
        const fetchedComments = await getCommentsForTask(task.id);
        setComments(fetchedComments);
      };
      const loadPrivateNotes = async () => {
        const notes = await getPrivateNotes(task.id);
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
      setCreateStoreName('');
      setCreateSupplierName('');
      setCreateContactPerson('');
      setCreateImportManager('');
      setCreateStatus(DEFAULT_STATUS || 'חדש');
      setCreatePriority(PRIORITIES[0] || 'רגילה');
      setCreateDeadline('');
      setCreateDriveLink('');
      setCreateAttachments([]);
      setCreateSubtasks([]);
      setNewSubtaskTitle('');
      setNewSubtaskViewTitle('');
      setCreateInternalNotes('');
      setComments([]);
    }
  }, [task, startInEditMode, settings, DEFAULT_STATUS, PRIORITIES, WORK_TYPES]);

  if (!task && !isCreateMode) return null;

  // --- Inline Field Handlers ---

  const startEditingField = (fieldKey, value) => {
    setActiveEditField(fieldKey);
    if (fieldKey === 'title') setEditTitle(value || '');
    if (fieldKey === 'description') setEditDescription(value || '');
    if (fieldKey === 'workType') setEditWorkType(value || '');
    if (fieldKey === 'storeName') setEditStoreName(value || '');
    if (fieldKey === 'supplierName') setEditSupplierName(value || '');
    if (fieldKey === 'contactPerson') setEditContactPerson(value || '');
    if (fieldKey === 'importManager') setEditImportManager(value || '');
    if (fieldKey === 'deadline') setEditDeadline(value || '');
    if (fieldKey === 'driveLink') setEditDriveLink(value || '');
    if (fieldKey === 'internalNotes') setEditInternalNotes(value || '');
  };

  const handleCancelField = () => {
    setActiveEditField(null);
  };

  const handleSaveField = async (fieldKey, value) => {
    const trimmedVal = typeof value === 'string' ? value.trim() : value;
    if (fieldKey === 'title' && !trimmedVal) {
      alert('כותרת העבודה היא שדה חובה');
      return;
    }

    let updateData = {};
    if (fieldKey === 'internalNotes') {
      updateData = { internalNotes: trimmedVal };
      setInternalNotes(trimmedVal);
    } else {
      updateData = { [fieldKey]: trimmedVal };
    }

    await updateTask(task.id, updateData);
    setActiveEditField(null);
    onRefresh(); // Refresh parent dashboard
  };

  // --- Handlers for Quick Updates (Status / Priority) ---

  const handleStatusChange = async (newStatus) => {
    setQuickStatus(newStatus);
    await updateTask(task.id, { status: newStatus });
    onRefresh();
  };

  const handlePriorityChange = async (newPriority) => {
    setQuickPriority(newPriority);
    await updateTask(task.id, { priority: newPriority });
    onRefresh();
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

    await addComment(
      task.id, 
      authorName, 
      commentText, 
      attachedFile ? attachedFile.url : null, 
      attachedFile ? attachedFile.name : null
    );
    setCommentText('');
    setAttachedFile(null);
    const fetchedComments = await getCommentsForTask(task.id);
    setComments(fetchedComments);
  };

  const handleCommentFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const MAX_SIZE = 70 * 1024 * 1024; // 70MB limit
    if (file.size > MAX_SIZE) {
      setUploadErrorFile('גודל הקובץ עולה על המותר (מקסימום 70MB)');
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
    const newAttachments = task.attachments.filter((_, idx) => idx !== indexToDelete);
    await updateTask(task.id, { attachments: newAttachments });
    onRefresh();
  };

  const handleUploadFilesDirectly = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SIZE = 70 * 1024 * 1024; // 70MB limit
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_SIZE) {
        setUploadError(`גודל הקובץ "${files[i].name}" עולה על המותר (מקסימום 70MB)`);
        e.target.value = '';
        return;
      }
    }

    setUploading(true);
    setUploadError('');
    setTotalUploadCount(files.length);
    try {
      const uploadedList = [...(task.attachments || [])];
      for (let i = 0; i < files.length; i++) {
        setCurrentUploadIndex(i + 1);
        setUploadProgress(0);
        const result = await uploadFileToStorage(files[i], 'tasks', (progress) => {
          setUploadProgress(progress);
        });
        uploadedList.push(result);
      }
      await updateTask(task.id, { attachments: uploadedList });
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
    const MAX_SIZE = 70 * 1024 * 1024; // 70MB limit
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_SIZE) {
        setUploadError(`גודל הקובץ "${files[i].name}" עולה על המותר (מקסימום 70MB)`);
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

  // --- Handlers for Sub-tasks in Create Mode ---
  const handleAddSubtaskCreate = (e) => {
    if (e) e.preventDefault();
    setSubtaskError('');
    if (!newSubtaskTitle.trim()) {
      setSubtaskError('אנא הזינו כותרת לתת-המשימה');
      return;
    }
    const newSub = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      title: newSubtaskTitle.trim(),
      completed: false
    };
    setCreateSubtasks([...createSubtasks, newSub]);
    setNewSubtaskTitle('');
  };

  const handleDeleteSubtaskCreate = (id) => {
    setCreateSubtasks(createSubtasks.filter(sub => sub.id !== id));
  };

  // --- Handlers for Sub-tasks in View/Edit Mode ---
  const handleToggleSubtask = async (subtaskId) => {
    const currentSubtasks = task.subtasks || [];
    const updatedSubtasks = currentSubtasks.map(sub => 
      sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
    );
    await updateTask(task.id, { subtasks: updatedSubtasks });
    onRefresh();
  };

  const handleAddSubtaskView = async (e) => {
    if (e) e.preventDefault();
    setSubtaskError('');
    if (!newSubtaskViewTitle.trim()) {
      setSubtaskError('אנא הזינו כותרת לתת-המשימה');
      return;
    }
    const newSub = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      title: newSubtaskViewTitle.trim(),
      completed: false
    };
    const currentSubtasks = task.subtasks || [];
    const updatedSubtasks = [...currentSubtasks, newSub];
    await updateTask(task.id, { subtasks: updatedSubtasks });
    setNewSubtaskViewTitle('');
    onRefresh();
  };

  const handleDeleteSubtaskView = async (subtaskId) => {
    const currentSubtasks = task.subtasks || [];
    const updatedSubtasks = currentSubtasks.filter(sub => sub.id !== subtaskId);
    await updateTask(task.id, { subtasks: updatedSubtasks });
    onRefresh();
  };

  const handleSubmitCreate = (e) => {
    e.preventDefault();
    
    const formErrors = {};
    if (!createTitle.trim()) {
      formErrors.title = 'שדה כותרת העבודה הוא חובה';
    }
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    const taskData = {
      title: createTitle.trim(),
      description: createDescription.trim(),
      workType: createWorkType,
      storeName: createStoreName.trim(),
      supplierName: createSupplierName.trim(),
      contactPerson: createContactPerson.trim(),
      importManager: createImportManager.trim(),
      status: createStatus,
      priority: createPriority,
      deadline: createDeadline,
      driveLink: createDriveLink.trim(),
      attachments: createAttachments,
      subtasks: createSubtasks,
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

  const renderDeadline = (deadlineStr) => {
    if (!deadlineStr) return 'לא נקבע';
    try {
      const deadlineDate = new Date(deadlineStr);
      const today = new Date();
      today.setHours(0,0,0,0);
      deadlineDate.setHours(0,0,0,0);
      
      const diffTime = deadlineDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const formattedDate = new Date(deadlineStr).toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      if (diffDays < 0) {
        return (
          <span className="deadline-danger" title="הדדליין עבר!">
            ⚠️ עבר ({formattedDate})
          </span>
        );
      } else if (diffDays === 0) {
        return (
          <span className="deadline-danger" title="היום!">
            ⏰ היום! ({formattedDate})
          </span>
        );
      } else if (diffDays <= 3) {
        return (
          <span className="deadline-warning" title={`נותרו עוד ${diffDays} ימים`}>
            ⏳ עוד {diffDays} ימים ({formattedDate})
          </span>
        );
      }
      return formattedDate;
    } catch (e) {
      return deadlineStr;
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
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveField('title', editTitle);
                      if (e.key === 'Escape') handleCancelField();
                    }}
                  />
                  <button type="button" className="btn btn-primary btn-icon" style={{ padding: '8px 12px' }} onClick={() => handleSaveField('title', editTitle)}>✔️</button>
                  <button type="button" className="btn btn-secondary btn-icon" style={{ padding: '8px 12px' }} onClick={handleCancelField}>❌</button>
                </div>
              ) : (
                <span 
                  className="hover-editable-inline" 
                  onClick={() => startEditingField('title', task.title)}
                  title="לחצי לעריכת כותרת"
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
            <div className="modal-body">
              
              <div className="form-group">
                <label className="form-label">כותרת העבודה *</label>
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

              <div className="form-group">
                <label className="form-label">סוג עבודה</label>
                <div className="work-type-group">
                  {WORK_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`work-type-btn ${createWorkType === type ? 'active' : ''}`}
                      onClick={() => setCreateWorkType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
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
                
                <div className="form-group">
                  <label className="form-label">תאריך יעד (דדליין)</label>
                  <CustomDatePicker
                    value={createDeadline}
                    onChange={(val) => setCreateDeadline(val)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">עדיפות</label>
                <div className="segmented-control">
                  {PRIORITIES.map(pr => {
                    let priorityClass = '';
                    if (pr === 'רגילה') priorityClass = 'priority-normal';
                    if (pr === 'גבוהה') priorityClass = 'priority-high';
                    if (pr === 'דחופה') priorityClass = 'priority-urgent';
                    return (
                      <button
                        key={pr}
                        type="button"
                        className={`segmented-control-btn ${createPriority === pr ? `active ${priorityClass}` : ''}`}
                        onClick={() => setCreatePriority(pr)}
                      >
                        {pr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">שם החנות / רשת</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="לדוגמה: סניף אילת / כלל הרשת"
                    value={createStoreName}
                    onChange={(e) => setCreateStoreName(e.target.value)}
                    list="stores-list-modal"
                  />
                  <datalist id="stores-list-modal">
                    {STORES.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                
                <div className="form-group">
                  <label className="form-label">שם הספק בסין / בארץ</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="לדוגמה: Shenzhen Printing Ltd"
                    value={createSupplierName}
                    onChange={(e) => setCreateSupplierName(e.target.value)}
                    list="suppliers-list-modal"
                  />
                  <datalist id="suppliers-list-modal">
                    {SUPPLIERS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">איש קשר אצל הספק</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="לדוגמה: Mr. Li"
                    value={createContactPerson}
                    onChange={(e) => setCreateContactPerson(e.target.value)}
                    list="contacts-list-modal"
                  />
                  <datalist id="contacts-list-modal">
                    {CONTACTS.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.role ? `${c.role} ${c.phone ? `(${c.phone})` : ''}` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>
                
                <div className="form-group">
                  <label className="form-label">איש קשר</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="לדוגמה: אלון ישראלי"
                    value={createImportManager}
                    onChange={(e) => setCreateImportManager(e.target.value)}
                    list="managers-list-modal"
                  />
                  <datalist id="managers-list-modal">
                    {IMPORT_MANAGERS.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">קישור לתיקיית דרייב</label>
                <input 
                  type="url"
                  className="form-control text-left direction-ltr"
                  placeholder="https://drive.google.com/..."
                  value={createDriveLink}
                  onChange={(e) => setCreateDriveLink(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  קבצים מצורפים (תמונות, קובצי PDF או מסמכי עבודה) <span style={{ fontWeight: 'normal', fontSize: '0.85em', color: 'var(--text-muted, #718096)' }}>(עד 70MB לקובץ)</span>
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
                    עד 70MB לקובץ
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

              <div className="form-group">
                <label className="form-label">תתי-משימות לעבודה (Checklist)</label>
                <div className="subtask-add-form" style={{ marginBottom: '12px' }}>
                  <input 
                    type="text"
                    className="subtask-add-input"
                    placeholder="הוספת תת-משימה... (לדוגמה: הגדרת צבעי פנטון)"
                    value={newSubtaskTitle}
                    onChange={(e) => {
                      setNewSubtaskTitle(e.target.value);
                      if (subtaskError) setSubtaskError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtaskCreate();
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-primary subtask-add-btn"
                    style={{ padding: '8px 14px' }}
                    onClick={handleAddSubtaskCreate}
                  >
                    ➕ הוספה
                  </button>
                </div>
                {subtaskError && (
                  <div className="form-error" style={{ marginTop: '-6px', marginBottom: '12px', fontSize: '0.8rem' }}>
                    ⚠️ {subtaskError}
                  </div>
                )}

                {createSubtasks.length > 0 ? (
                  <div className="subtask-list" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px', backgroundColor: '#f8fafc' }}>
                    {createSubtasks.map((sub) => (
                      <div key={sub.id} className="subtask-item">
                        <span className="subtask-text">{sub.title}</span>
                        <button 
                          type="button" 
                          className="subtask-delete-btn"
                          onClick={() => handleDeleteSubtaskCreate(sub.id)}
                          title="מחק תת-משימה"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="subtasks-empty-state" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' }}>
                    לא הוגדרו תתי-משימות לעבודה זו עדיין.
                  </div>
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
              <button type="submit" className="btn btn-primary" disabled={uploading}>
                יצירת עבודה
              </button>
            </div>
          </form>
        ) : (
          /* VIEW / INLINE EDIT MODE */
          <>
            <div className="modal-body">
              <div className="details-grid">
                
                {/* Main View Area */}
                <div className="details-main">
                  
                  {/* Field: Description */}
                  <div>
                    <h4 className="detail-section-title">תיאור העבודה</h4>
                    {activeEditField === 'description' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <textarea 
                          className="form-control" 
                          rows="4" 
                          value={editDescription} 
                          onChange={(e) => setEditDescription(e.target.value)} 
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleSaveField('description', editDescription)}>שמירה ✔️</button>
                          <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={handleCancelField}>ביטול ❌</button>
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
                    <h4 className="detail-section-title" style={{ color: 'var(--secondary)', borderColor: 'var(--secondary)' }}>
                      🔒 הערות פנימיות (מנהלת בלבד)
                    </h4>
                    {activeEditField === 'internalNotes' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <textarea 
                          className="form-control" 
                          rows="3" 
                          value={editInternalNotes} 
                          onChange={(e) => setEditInternalNotes(e.target.value)} 
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleSaveField('internalNotes', editInternalNotes)}>שמירה ✔️</button>
                          <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={handleCancelField}>ביטול ❌</button>
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

                  {/* Sub-tasks Section */}
                  <div className="subtasks-container">
                    <div className="subtasks-header">
                      <h4>📋 תתי-משימות לעבודה</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                        {task.subtasks && task.subtasks.length > 0 
                          ? `${task.subtasks.filter(s => s.completed).length} מתוך ${task.subtasks.length} הושלמו`
                          : 'אין תתי-משימות'
                        }
                      </span>
                    </div>

                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="subtask-progress-bar-container">
                        <div 
                          className="subtask-progress-bar" 
                          style={{ 
                            width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` 
                          }}
                        />
                      </div>
                    )}

                    {task.subtasks && task.subtasks.length > 0 ? (
                      <div className="subtask-list">
                        {task.subtasks.map((sub) => (
                          <div key={sub.id} className="subtask-item">
                            <div className="subtask-main">
                              <input 
                                type="checkbox" 
                                className="subtask-checkbox" 
                                checked={sub.completed}
                                onChange={() => handleToggleSubtask(sub.id)}
                              />
                              <span className={`subtask-text ${sub.completed ? 'completed' : ''}`} title={sub.title}>
                                {sub.title}
                              </span>
                            </div>
                            <button 
                              type="button" 
                              className="subtask-delete-btn"
                              onClick={() => handleDeleteSubtaskView(sub.id)}
                              title="מחיקת תת-משימה"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="subtasks-empty-state">
                        אין תתי-משימות לעבודה זו. הוסיפי תת-משימה למטה כדי להתחיל!
                      </div>
                    )}

                    <form onSubmit={handleAddSubtaskView} className="subtask-add-form">
                      <input 
                        type="text" 
                        className="subtask-add-input"
                        placeholder="הוספת תת-משימה חדשה..."
                        value={newSubtaskViewTitle}
                        onChange={(e) => {
                          setNewSubtaskViewTitle(e.target.value);
                          if (subtaskError) setSubtaskError('');
                        }}
                      />
                      <button type="submit" className="btn btn-primary subtask-add-btn">
                        ➕ הוספה
                      </button>
                    </form>
                    {subtaskError && (
                      <div className="form-error" style={{ marginTop: '6px', fontSize: '0.8rem' }}>
                        ⚠️ {subtaskError}
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  <div className="comments-section">
                    <h4 className="detail-section-title">💬 הערות ועדכונים חיצוניים ({comments.length})</h4>
                    
                    {comments.length === 0 ? (
                      <div className="empty-state" style={{ padding: '24px' }}>
                        <div className="empty-state-title">אין הערות עדיין</div>
                        <div className="empty-state-text">ספקים ומנהלים יכולים להוסיף הערות בדף הצפייה החיצוני.</div>
                      </div>
                    ) : (
                      <div className="comments-list">
                        {comments.map(c => {
                          const isImage = c.attachmentName && /\.(jpg|jpeg|png|gif|webp)$/i.test(c.attachmentName);
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
                                  {isImage && (
                                    <a href={c.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                      <img 
                                        src={c.attachmentUrl} 
                                        alt={c.attachmentName} 
                                        className="comment-image-preview" 
                                      />
                                    </a>
                                  )}
                                  <div>
                                    <a 
                                      href={c.attachmentUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="comment-attachment-link"
                                    >
                                      📎 {c.attachmentName || 'קובץ מצורף'}
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Comment Form */}
                    <form onSubmit={handleAddComment} className="comment-form">
                      <h5 style={{ fontWeight: '600' }}>הוספת הערה במערכת</h5>
                      <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">שם כותב ההערה</label>
                          <input 
                            type="text"
                            className="form-control"
                            value={authorName}
                            onChange={(e) => {
                              setAuthorName(e.target.value);
                              if (commentError) setCommentError('');
                            }}
                            placeholder="שם המעצבת או תפקיד"
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">תוכן ההערה</label>
                        <textarea 
                          className="form-control"
                          rows="2"
                          value={commentText}
                          onChange={(e) => {
                            setCommentText(e.target.value);
                            if (commentError) setCommentError('');
                          }}
                          placeholder="הוסף עדכון..."
                        />
                      </div>
                      
                      {/* Comment File Attachment */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                          צירוף קובץ או תמונה (אופציונלי) <span style={{ fontWeight: 'normal', fontSize: '0.85em', color: 'var(--text-muted, #718096)' }}>(עד 70MB)</span>
                        </label>
                        {attachedFile ? (
                          <div className="comment-attachment-preview-chip">
                            <span>📎 {attachedFile.name}</span>
                            <button type="button" onClick={() => setAttachedFile(null)} title="הסר קובץ">&times;</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                            <button 
                              type="button" 
                              className="comment-attachment-btn"
                              onClick={() => document.getElementById('comment-file-input-modal').click()}
                              disabled={uploadingFile}
                            >
                              {uploadingFile ? `🔄 מעלה (${uploadProgressFile}%)` : '📎 בחירת קובץ'}
                            </button>
                            {!uploadingFile && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #718096)' }}>(עד 70MB)</span>
                            )}
                            {uploadingFile && (
                              <div style={{ 
                                flexGrow: 1, 
                                height: '6px', 
                                backgroundColor: 'var(--border-color, #e2e8f0)', 
                                borderRadius: '3px', 
                                overflow: 'hidden',
                                maxWidth: '120px'
                              }}>
                                <div style={{ 
                                  width: `${uploadProgressFile}%`, 
                                  height: '100%', 
                                  backgroundColor: 'var(--primary)', 
                                  transition: 'width 0.2s ease-in-out' 
                                }} />
                              </div>
                            )}
                            <input 
                              type="file" 
                              id="comment-file-input-modal"
                              style={{ display: 'none' }}
                              onChange={handleCommentFileChange}
                            />
                            {uploadErrorFile && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{uploadErrorFile}</span>}
                          </div>
                        )}
                      </div>

                      {commentError && <span className="form-error">{commentError}</span>}
                      <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={uploadingFile}>
                        שליחת הערה
                      </button>
                    </form>
                  </div>

                </div>

                {/* Sidebar View Area */}
                <div className="details-sidebar">
                  
                  {/* Field: Work Type */}
                  <div className="sidebar-row">
                    <span className="sidebar-label">סוג עבודה</span>
                    {activeEditField === 'workType' ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                        <select 
                          className="form-control" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                          value={editWorkType} 
                          onChange={(e) => setEditWorkType(e.target.value)}
                          autoFocus
                        >
                          {WORK_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-primary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={() => handleSaveField('workType', editWorkType)}>✔️</button>
                        <button type="button" className="btn btn-secondary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={handleCancelField}>❌</button>
                      </div>
                    ) : (
                      <span 
                        className="sidebar-value hover-editable-inline" 
                        onClick={() => startEditingField('workType', task.workType)}
                        title="לחצי לעריכת סוג עבודה"
                      >
                        {task.workType} ✏️
                      </span>
                    )}
                  </div>

                  {/* Field: Status picker (Instant Update) */}
                  <div className="sidebar-row">
                    <span className="sidebar-label">סטטוס משימה</span>
                    <div 
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        marginTop: '6px'
                      }}
                    >
                      {(STATUSES.includes(quickStatus) ? STATUSES : [...STATUSES, quickStatus]).map(st => {
                        const colorClass = STATUS_CLASSES[st] || 'badge-frozen';
                        const isActive = st === quickStatus;
                        return (
                          <button
                            key={st}
                            type="button"
                            className={`badge ${colorClass}`}
                            style={{
                              padding: '6px 8px',
                              fontSize: '0.75rem',
                              textAlign: 'center',
                              cursor: 'pointer',
                              width: '100%',
                              border: isActive ? '2px solid var(--primary)' : '1px solid transparent',
                              opacity: isActive ? 1 : 0.45,
                              transform: isActive ? 'scale(1.03)' : 'none',
                              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
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

                  {/* Field: Priority (Instant Update) */}
                  <div className="sidebar-row">
                    <span className="sidebar-label">עדיפות</span>
                    <div className="segmented-control" style={{ marginTop: '4px' }}>
                      {PRIORITIES.map(pr => {
                        let priorityClass = '';
                        if (pr === 'רגילה') priorityClass = 'priority-normal';
                        if (pr === 'גבוהה') priorityClass = 'priority-high';
                        if (pr === 'דחופה') priorityClass = 'priority-urgent';
                        return (
                          <button
                            key={pr}
                            type="button"
                            className={`segmented-control-btn ${quickPriority === pr ? `active ${priorityClass}` : ''}`}
                            onClick={() => handlePriorityChange(pr)}
                            style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                          >
                            {pr}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Field: Deadline */}
                  <div className="sidebar-row">
                    <span className="sidebar-label">תאריך יעד</span>
                    {activeEditField === 'deadline' ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                        <CustomDatePicker
                          value={editDeadline}
                          onChange={(val) => setEditDeadline(val)}
                          inputStyle={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                        />
                        <button 
                          type="button" 
                          className="btn btn-primary btn-icon" 
                          style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                          onClick={() => handleSaveField('deadline', editDeadline)}
                          title="שמירה"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-icon" 
                          style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                          onClick={handleCancelField}
                          title="ביטול"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span 
                        className="sidebar-value hover-editable-inline" 
                        onClick={() => startEditingField('deadline', task.deadline)}
                        title="לחצי לעריכת תאריך יעד"
                      >
                        {renderDeadline(task.deadline)} ✏️
                      </span>
                    )}
                  </div>

                  {/* Field: Store Name */}
                  <div className="sidebar-row">
                    <span className="sidebar-label">חנות / רשת</span>
                    {activeEditField === 'storeName' ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                          value={editStoreName} 
                          onChange={(e) => setEditStoreName(e.target.value)} 
                          list="stores-list-inline"
                          autoFocus
                        />
                        <datalist id="stores-list-inline">
                          {STORES.map(s => <option key={s} value={s} />)}
                        </datalist>
                        <button type="button" className="btn btn-primary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={() => handleSaveField('storeName', editStoreName)}>✔️</button>
                        <button type="button" className="btn btn-secondary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={handleCancelField}>❌</button>
                      </div>
                    ) : (
                      <span 
                        className="sidebar-value hover-editable-inline" 
                        onClick={() => startEditingField('storeName', task.storeName)}
                        title="לחצי לעריכת חנות"
                      >
                        {task.storeName || 'לחצי להוספה...'} ✏️
                      </span>
                    )}
                  </div>

                  {/* Field: Supplier Name */}
                  <div className="sidebar-row">
                    <span className="sidebar-label">ספק</span>
                    {activeEditField === 'supplierName' ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                          value={editSupplierName} 
                          onChange={(e) => setEditSupplierName(e.target.value)} 
                          list="suppliers-list-inline"
                          autoFocus
                        />
                        <datalist id="suppliers-list-inline">
                          {SUPPLIERS.map(s => <option key={s} value={s} />)}
                        </datalist>
                        <button type="button" className="btn btn-primary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={() => handleSaveField('supplierName', editSupplierName)}>✔️</button>
                        <button type="button" className="btn btn-secondary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={handleCancelField}>❌</button>
                      </div>
                    ) : (
                      <span 
                        className="sidebar-value hover-editable-inline" 
                        onClick={() => startEditingField('supplierName', task.supplierName)}
                        title="לחצי לעריכת ספק"
                      >
                        {task.supplierName || 'לחצי להוספה...'} ✏️
                      </span>
                    )}
                  </div>

                  {/* Field: Contact Person */}
                  <div className="sidebar-row">
                    <span className="sidebar-label">איש קשר</span>
                    {activeEditField === 'contactPerson' ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                          value={editContactPerson} 
                          onChange={(e) => setEditContactPerson(e.target.value)} 
                          list="contacts-list-inline"
                          autoFocus
                        />
                        <datalist id="contacts-list-inline">
                          {CONTACTS.map(c => (
                            <option key={c.name} value={c.name}>
                              {c.role ? `${c.role} ${c.phone ? `(${c.phone})` : ''}` : ''}
                            </option>
                          ))}
                        </datalist>
                        <button type="button" className="btn btn-primary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={() => handleSaveField('contactPerson', editContactPerson)}>✔️</button>
                        <button type="button" className="btn btn-secondary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={handleCancelField}>❌</button>
                      </div>
                    ) : (
                      <span 
                        className="sidebar-value hover-editable-inline" 
                        onClick={() => startEditingField('contactPerson', task.contactPerson)}
                        title="לחצי לעריכת איש קשר"
                      >
                        {task.contactPerson || 'לחצי להוספה...'} ✏️
                      </span>
                    )}
                  </div>

                  {/* Field: Import Manager */}
                  <div className="sidebar-row">
                    <span className="sidebar-label">איש קשר</span>
                    {activeEditField === 'importManager' ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                          value={editImportManager} 
                          onChange={(e) => setEditImportManager(e.target.value)} 
                          list="managers-list-inline"
                          autoFocus
                        />
                        <datalist id="managers-list-inline">
                          {IMPORT_MANAGERS.map(m => <option key={m} value={m} />)}
                        </datalist>
                        <button type="button" className="btn btn-primary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={() => handleSaveField('importManager', editImportManager)}>✔️</button>
                        <button type="button" className="btn btn-secondary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={handleCancelField}>❌</button>
                      </div>
                    ) : (
                      <span 
                        className="sidebar-value hover-editable-inline" 
                        onClick={() => startEditingField('importManager', task.importManager)}
                        title="לחצי לעריכת איש קשר"
                      >
                        {task.importManager || 'לחצי להוספה...'} ✏️
                      </span>
                    )}
                  </div>

                  {/* Field: Drive Link */}
                  <div className="sidebar-row">
                    <span className="sidebar-label">תיקיית דרייב</span>
                    {activeEditField === 'driveLink' ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                        <input 
                          type="url" 
                          className="form-control text-left direction-ltr" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                          placeholder="https://drive.google.com/..."
                          value={editDriveLink} 
                          onChange={(e) => setEditDriveLink(e.target.value)} 
                          autoFocus
                        />
                        <button type="button" className="btn btn-primary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={() => handleSaveField('driveLink', editDriveLink)}>✔️</button>
                        <button type="button" className="btn btn-secondary btn-icon" style={{ padding: '4px 6px', fontSize: '0.75rem' }} onClick={handleCancelField}>❌</button>
                      </div>
                    ) : task.driveLink ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <a href={task.driveLink} target="_blank" rel="noopener noreferrer" className="drive-link">
                          🔗 מעבר לדרייב
                        </a>
                        <button type="button" className="edit-inline-trigger-btn" onClick={() => startEditingField('driveLink', task.driveLink)} title="עריכת קישור">✏️</button>
                      </div>
                    ) : (
                      <span 
                        className="sidebar-value hover-editable-inline" 
                        onClick={() => startEditingField('driveLink', '')}
                        title="לחצי להוספת קישור דרייב"
                      >
                        לא צורף קישור ✏️
                      </span>
                    )}
                  </div>

                  {/* Field: Attachments (Direct upload and deletion) */}
                  <div className="sidebar-row">
                    <span className="sidebar-label">קבצים שהועלו</span>
                    {task.attachments && task.attachments.length > 0 ? (
                      <div className="attachments-list" style={{ marginTop: '4px' }}>
                        {task.attachments.map((file, idx) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                          return (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
                              <a 
                                href={file.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="attachment-info"
                                style={{ fontSize: '0.8rem', padding: '4px 0', flex: 1, minWidth: 0 }}
                                title={file.name}
                              >
                                <span className="attachment-icon">{isImage ? '🖼️' : '📄'}</span>
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
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>אין קבצים מצורפים</span>
                    )}
                    
                    {/* Add attachment directly */}
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <button 
                          type="button" 
                          className="comment-attachment-btn"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => document.getElementById('view-attachment-file-input-inline').click()}
                          disabled={uploading}
                        >
                          {uploading 
                            ? `🔄 מעלה (${currentUploadIndex}/${totalUploadCount}) ${uploadProgress}%` 
                            : '📎 הוספת קובץ'}
                        </button>
                        {!uploading && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #718096)' }}>(עד 70MB)</span>
                        )}
                        {uploading && (
                          <div style={{ 
                            flexGrow: 1, 
                            height: '6px', 
                            backgroundColor: 'var(--border-color, #e2e8f0)', 
                            borderRadius: '3px', 
                            overflow: 'hidden',
                            maxWidth: '120px'
                          }}>
                            <div style={{ 
                              width: `${uploadProgress}%`, 
                              height: '100%', 
                              backgroundColor: 'var(--primary)', 
                              transition: 'width 0.2s ease-in-out' 
                            }} />
                          </div>
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
                className="btn btn-primary" 
                style={{ flex: 1, backgroundColor: 'var(--priority-urgent-bg)', color: 'var(--priority-urgent-text)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                onClick={confirmDeleteComment}
              >
                מחיקה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
