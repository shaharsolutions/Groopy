import { useState, useEffect } from 'react';
import { getPrivateNotes, uploadFileToStorage } from '../utils/storage';

export default function TaskFormModal({ task, settings, onClose, onSave }) {
  const {
    statuses: STATUSES = [],
    priorities: PRIORITIES = [],
    workTypes: WORK_TYPES = [],
    stores: STORES = [],
    importManagers: IMPORT_MANAGERS = [],
    defaultStatus: DEFAULT_STATUS = 'חדש',
    statusColors: STATUS_COLORS = {},
    suppliers: SUPPLIERS = [],
    contacts: CONTACTS = []
  } = settings || {};

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState(WORK_TYPES[0] || 'אריזה');
  const [storeName, setStoreName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [importManager, setImportManager] = useState('');
  const [status, setStatus] = useState(DEFAULT_STATUS || 'חדש');
  const [priority, setPriority] = useState(PRIORITIES[0] || 'רגילה');
  const [deadline, setDeadline] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setUploadError('');
    setUploading(false);
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setWorkType(task.workType || WORK_TYPES[0] || 'אריזה');
      setStoreName(task.storeName || '');
      setSupplierName(task.supplierName || '');
      setContactPerson(task.contactPerson || '');
      setImportManager(task.importManager || '');
      setStatus(task.status || DEFAULT_STATUS || 'חדש');
      setPriority(task.priority || PRIORITIES[0] || 'רגילה');
      setDeadline(task.deadline || '');
      setDriveLink(task.driveLink || '');
      setAttachments(task.attachments || []);
      setInternalNotes('');
      
      const loadPrivateNotes = async () => {
        const notes = await getPrivateNotes(task.id);
        setInternalNotes(notes);
      };
      loadPrivateNotes();
    } else {
      // Set default empty state for creation
      setTitle('');
      setDescription('');
      setWorkType(WORK_TYPES[0] || 'אריזה');
      setStoreName('');
      setSupplierName('');
      setContactPerson('');
      setImportManager('');
      setStatus(DEFAULT_STATUS || 'חדש');
      setPriority(PRIORITIES[0] || 'רגילה');
      setDeadline('');
      setDriveLink('');
      setAttachments([]);
      setInternalNotes('');
    }
  }, [task, settings, DEFAULT_STATUS, PRIORITIES, WORK_TYPES]);

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
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await handleUploadFiles(e.target.files);
    }
  };

  const handleUploadFiles = async (files) => {
    setUploading(true);
    setUploadError('');
    try {
      const uploadedList = [...attachments];
      for (let i = 0; i < files.length; i++) {
        const result = await uploadFileToStorage(files[i], 'tasks');
        uploadedList.push(result);
      }
      setAttachments(uploadedList);
    } catch (err) {
      console.error(err);
      setUploadError('שגיאה בהעלאת הקבצים. אנא ודא ש-Storage פעיל.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = (indexToDelete) => {
    setAttachments(attachments.filter((_, idx) => idx !== indexToDelete));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate
    const formErrors = {};
    if (!title.trim()) {
      formErrors.title = 'שדה כותרת העבודה הוא חובה';
    }
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      workType,
      storeName: storeName.trim(),
      supplierName: supplierName.trim(),
      contactPerson: contactPerson.trim(),
      importManager: importManager.trim(),
      status,
      priority,
      deadline,
      driveLink: driveLink.trim(),
      attachments,
      internalNotes: internalNotes.trim()
    };

    onSave(taskData);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {task ? `עריכת עבודה: ${task.jobNumber}` : 'יצירת עבודה חדשה'}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          <div className="modal-body">
            
            <div className="form-group">
              <label className="form-label">כותרת העבודה *</label>
              <input 
                type="text"
                className="form-control"
                placeholder="לדוגמה: אריזה מעוצבת למשקל דיגיטלי"
                value={title}
                autoFocus
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors({...errors, title: null});
                }}
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">תיאור ופרטים נוספים</label>
              <textarea 
                className="form-control"
                rows="3"
                placeholder="פירוט המשימה, דרישות מיוחדות מהמעצבת..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Work Type (Buttons) */}
            <div className="form-group">
              <label className="form-label">סוג עבודה</label>
              <div className="work-type-group">
                {WORK_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`work-type-btn ${workType === type ? 'active' : ''}`}
                    onClick={() => setWorkType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Form row: Status & Deadline */}
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
                  {(STATUSES.includes(status) ? STATUSES : [...STATUSES, status]).map(st => {
                    const colorClass = STATUS_COLORS[st] || 'badge-frozen';
                    const isActive = st === status;
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
                        onClick={() => setStatus(st)}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">תאריך יעד (דדליין)</label>
                <input 
                  type="date"
                  className="form-control"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            {/* Priority (Buttons) */}
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
                      className={`segmented-control-btn ${priority === pr ? `active ${priorityClass}` : ''}`}
                      onClick={() => setPriority(pr)}
                    >
                      {pr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form row: Store Name & Supplier Name */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">שם החנות / רשת</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="לדוגמה: סניף אילת / כלל הרשת"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  list="stores-list"
                />
                <datalist id="stores-list">
                  {STORES.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">שם הספק בסין / בארץ</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="לדוגמה: Shenzhen Printing Ltd"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  list="suppliers-list"
                />
                <datalist id="suppliers-list">
                  {SUPPLIERS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>

            {/* Form row: Contact Person & Import Manager */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">איש קשר אצל הספק</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="לדוגמה: Mr. Li"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  list="contacts-list"
                />
                <datalist id="contacts-list">
                  {CONTACTS.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.role ? `${c.role} ${c.phone ? `(${c.phone})` : ''}` : ''}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">מנהל יבוא אחראי</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="לדוגמה: אלון ישראלי"
                  value={importManager}
                  onChange={(e) => setImportManager(e.target.value)}
                  list="managers-list"
                />
                <datalist id="managers-list">
                  {IMPORT_MANAGERS.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>
            </div>

            {/* Drive Link */}
            <div className="form-group">
              <label className="form-label">קישור לתיקיית דרייב</label>
              <input 
                type="url"
                className="form-control text-left direction-ltr"
                placeholder="https://drive.google.com/..."
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
              />
            </div>

            {/* File Upload / Attachments */}
            <div className="form-group">
              <label className="form-label">קבצים מצורפים (תמונות, קובצי PDF או מסמכי עבודה)</label>
              
              <div 
                className={`file-upload-zone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('task-file-input').click()}
              >
                <div className="file-upload-icon">📁</div>
                <div className="file-upload-text">
                  <strong>גררי לכאן קבצים</strong> או לחצי לבחירה מהמחשב
                </div>
                <input 
                  type="file" 
                  id="task-file-input" 
                  multiple 
                  className="file-upload-input" 
                  onChange={handleFileChange}
                />
              </div>

              {uploading && (
                <div style={{ marginTop: '10px', textAlign: 'center', color: 'var(--primary)' }}>
                  <span>🔄 מעלה קבצים לענן...</span>
                </div>
              )}

              {uploadError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '6px' }}>
                  {uploadError}
                </div>
              )}

              {attachments.length > 0 && (
                <div className="attachments-list" style={{ marginTop: '12px' }}>
                  {attachments.map((file, idx) => {
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
                          onClick={() => handleDeleteAttachment(idx)}
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

            {/* Internal Notes */}
            <div className="form-group">
              <label className="form-label">הערות פנימיות למעצבת (לא יוצגו לצופים חיצוניים)</label>
              <textarea 
                className="form-control"
                rows="2"
                placeholder="פרטי לוגיסטיקה, סיסמאות לקבצים, הערות תמחור..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
            </div>

          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? 'שמירת שינויים' : 'יצירת עבודה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
