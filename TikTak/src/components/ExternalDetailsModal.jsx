import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { getCommentsForTask, addComment, getContacts } from '../utils/storage';
import { getBoardStatusConfig } from '../utils/boardStatusHelper';
import { getFeatureFlags } from '../utils/featureFlags';
import { normalizeNewTaskFields, getAllTaskFieldDefinitions } from '../data/taskFieldConfig';
const ExcelPreviewModal = lazy(() => import('./ExcelPreviewModal'));
const PdfPreviewModal = lazy(() => import('./PdfPreviewModal'));
const ImagePreviewModal = lazy(() => import('./ImagePreviewModal'));
import PlanogramFileCard from './PlanogramFileCard';
import PlanogramIndicator from './PlanogramIndicator';

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

function getWeeklyHoursForSunday(weeklyHoursObj, sundayStr) {
  if (!weeklyHoursObj) return { sunday: 0, monday: 0, tuesday: 0, wednesday: 0, thursday: 0 };
  if (weeklyHoursObj.sunday !== undefined || weeklyHoursObj.monday !== undefined) {
    const currentWeekSunday = getSundayOfWeek(new Date());
    if (sundayStr === currentWeekSunday) {
      return {
        sunday: weeklyHoursObj.sunday || 0,
        monday: weeklyHoursObj.monday || 0,
        tuesday: weeklyHoursObj.tuesday || 0,
        wednesday: weeklyHoursObj.wednesday || 0,
        thursday: weeklyHoursObj.thursday || 0
      };
    } else {
      return { sunday: 0, monday: 0, tuesday: 0, wednesday: 0, thursday: 0 };
    }
  }
  const weekData = weeklyHoursObj[sundayStr] || {};
  return {
    sunday: weekData.sunday || 0,
    monday: weekData.monday || 0,
    tuesday: weekData.tuesday || 0,
    wednesday: weekData.wednesday || 0,
    thursday: weekData.thursday || 0
  };
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

export default function ExternalDetailsModal({ task, settings, onClose, isSingleProjectView = false, userId }) {
  const boardStatusConfig = useMemo(() => (
    getBoardStatusConfig(settings, task?.boardId)
  ), [settings, task?.boardId]);
  const STATUS_CLASSES = boardStatusConfig.statusColors;

  const {
    hideWeeklyHours = false
  } = settings || {};
  const flags = getFeatureFlags(settings);
  const newTaskFields = useMemo(() => normalizeNewTaskFields(settings?.newTaskFields), [settings?.newTaskFields]);
  const allFieldDefinitions = useMemo(() => getAllTaskFieldDefinitions(settings?.newTaskFields, {
    taskFieldOrder: settings?.taskFieldOrder
  }), [settings?.newTaskFields, settings?.taskFieldOrder]);
  const customFieldDefinitions = useMemo(() => allFieldDefinitions.filter(f => f.isCustom), [allFieldDefinitions]);

  const isNewTaskFieldEnabled = (fieldKey) => Boolean(newTaskFields[fieldKey] && newTaskFields[fieldKey].enabled !== false && !newTaskFields[fieldKey].deleted);
  const isFieldExcludedForTask = (fieldKey) => Boolean(flags.enableFieldExclusion && Array.isArray(task?.excludedFields) && task.excludedFields.includes(fieldKey));
  const isFieldVisibleForTask = (fieldKey) => {
    if (isFieldExcludedForTask(fieldKey)) return false;
    if (task) {
      if (fieldKey === 'contactPerson' && (task.contactPerson || task.supplierContactName)) return true;
      if (fieldKey === 'supplierContactEmail' && (task.supplierContactEmail || task.contactEmail || task.email || task.supplierEmail)) return true;
      if (fieldKey === 'planogramFile' && (task.planogramFile || task.planogram)) return true;
      if (fieldKey === 'workOrderFiles' && (task.workOrderFile || (Array.isArray(task.workOrderFiles) ? task.workOrderFiles.length > 0 : Array.isArray(task.attachments) && task.attachments.length > 0))) return true;
    }
    return isNewTaskFieldEnabled(fieldKey);
  };
  const getNewTaskFieldLabel = (fieldKey) => newTaskFields[fieldKey]?.label || fieldKey;
  const [comments, setComments] = useState([]);
  const commentAuthorName = 'משתמש/ת חיצוני/ת';
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [excelPreviewFile, setExcelPreviewFile] = useState(null);
  const [pdfPreviewFile, setPdfPreviewFile] = useState(null);
  const [imagePreviewFile, setImagePreviewFile] = useState(null);

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

  // External viewers have no entry point that can open additional info cards.
  const [activeInfoCard, setActiveInfoCard] = useState(null);

  // Close modal or cancel actions on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!isSingleProjectView) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSingleProjectView, onClose]);

  const handleCopyTaskLink = () => {
    if (!task) return;
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('taskId', task.id);
    navigator.clipboard.writeText(shareUrl.toString())
      .then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy link", err);
      });
  };

  const [contacts, setContacts] = useState([]);
  const [activeSunday, setActiveSunday] = useState(() => getSundayOfWeek(new Date()));

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

  useEffect(() => {
    if (userId) {
      const loadContacts = async () => {
        const conts = await getContacts(userId);
        setContacts(conts);
      };
      loadContacts();
    }
  }, [userId]);

  useEffect(() => {
    if (task) {
      const loadComments = async () => {
        const fetchedComments = await getCommentsForTask(task.id, userId);
        setComments(fetchedComments);
      };
      loadComments();
      const timer = setTimeout(() => {
        setActiveSunday(getSundayOfWeek(new Date()));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [task, userId]);

  if (!task) return null;

  const handleAddComment = async (e) => {
    e.preventDefault();
    const trimmedCommentText = commentText.trim();

    if (!trimmedCommentText) {
      setCommentError('נא לכתוב את תוכן ההערה');
      return;
    }

    setIsSubmittingComment(true);
    setCommentError('');
    try {
      const newComment = await addComment(task.id, commentAuthorName, trimmedCommentText, null, null, userId);
      setComments(currentComments => [...currentComments, newComment]);
      setCommentText('');
    } catch (err) {
      console.error('Failed to add external comment', err);
      setCommentError('שגיאה בהוספת ההערה. נסו שוב בעוד רגע.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

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
    <div className="modal-overlay" onClick={isSingleProjectView ? null : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              <span className="task-title-with-indicator modal-title-with-indicator">
                <span>{task.title}</span>
                {(task.planogramFile || task.planogram) && <PlanogramIndicator />}
              </span>
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
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
            {!isSingleProjectView && <button className="modal-close" onClick={onClose} style={{ marginRight: 0 }}>&times;</button>}
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
          <div className="details-grid">

            {/* Main Content Area (Left Column) */}
            <div className="details-main">

              {/* AREA 1: פרטי פרויקט / עבודה */}
              {isFieldVisibleForTask('description') && (
                <div className="details-section-card">
                  <h4 className="detail-section-title">📁 {flags.terms.itemDetails}</h4>

                  {/* Description */}
                  <div style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontWeight: '700', marginBottom: '6px', display: 'block', fontSize: '0.85rem' }}>
                      {getNewTaskFieldLabel('description')}
                    </label>
                    {task.description ? (
                      <div className="description-box" style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', minHeight: '60px', backgroundColor: '#fdfdfd' }}>
                        {task.description}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                        {flags.terms?.noDescriptionViewer || (flags.isLegacy ? 'אין פירוט מדויק לעבודה זו.' : 'אין פירוט מדויק לפרויקט זה.')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* AREA 4: הזמנת עבודה ופלנוגרמה */}
              {(isFieldVisibleForTask('workOrderFiles') || isFieldVisibleForTask('planogramFile')) && (
                <div className="details-section-card">
                  <h4 className="detail-section-title">📋 {flags.terms.filesSectionTitle || 'הזמנת עבודה ופלנוגרמה'}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: (isFieldVisibleForTask('workOrderFiles') && isFieldVisibleForTask('planogramFile')) ? '1fr 1fr' : '1fr', gap: '20px' }}>

                    {/* הזמנת עבודה */}
                    {isFieldVisibleForTask('workOrderFiles') && (
                      <div>
                        <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block', fontSize: '0.85rem' }}>
                          {getNewTaskFieldLabel('workOrderFiles')}
                        </label>

                        {(() => {
                          const filesList = (Array.isArray(task.workOrderFiles) && task.workOrderFiles.length > 0)
                            ? task.workOrderFiles
                            : (task.workOrderFile ? [task.workOrderFile] : (Array.isArray(task.attachments) ? task.attachments : []));

                          return filesList.length > 0 ? (
                            <div className="attachments-list" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                              {filesList.map((file, idx) => {
                                const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
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
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                              אין קבצי הזמנת עבודה
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* פלנוגרמה */}
                    {isFieldVisibleForTask('planogramFile') && (
                      <div>
                        <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block', fontSize: '0.85rem' }}>
                          {getNewTaskFieldLabel('planogramFile')}
                        </label>

                        {(() => {
                          const currentPlanogram = task.planogramFile || task.planogram;
                          return currentPlanogram ? (
                            <PlanogramFileCard file={currentPlanogram} onPreview={handlePreviewFile} />
                          ) : (
                            <div
                              className="planogram-preview-container"
                              style={{ height: '140px', margin: 0, borderStyle: 'dashed' }}
                            >
                              <span className="planogram-empty-text">לא הועלה קובץ</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* שעות עבודה */}
              {!hideWeeklyHours && (
                <div className="details-section-card">
                  <h4 className="detail-section-title">🕒 שעות עבודה ב{flags.terms.item}</h4>

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
                    ].map(day => {
                      const wh = getWeeklyHoursForSunday(task.weeklyHours, activeSunday);
                      const hoursVal = wh[day.key] !== undefined ? wh[day.key] : 0;
                      return (
                        <div key={day.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span>{day.label}</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 'normal', marginTop: '2px' }}>{getDayDate(activeSunday, day.offset)}</span>
                          </span>
                          <span style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            backgroundColor: '#f8fafc',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            minWidth: '40px',
                            textAlign: 'center',
                            border: '1px solid var(--border)'
                          }}>
                            {hoursVal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>סה"כ שעות שבועי:</span>
                    <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--primary)' }}>
                      {(() => {
                        const wh = getWeeklyHoursForSunday(task.weeklyHours, activeSunday);
                        const sun = parseFloat(wh.sunday) || 0;
                        const mon = parseFloat(wh.monday) || 0;
                        const tue = parseFloat(wh.tuesday) || 0;
                        const wed = parseFloat(wh.wednesday) || 0;
                        const thu = parseFloat(wh.thursday) || 0;
                        return Number((sun + mon + tue + wed + thu).toFixed(2));
                      })()}
                    </span>
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
                                  {isExcel ? '📊' : isPdf ? '📄' : '📎'} {c.attachmentName || 'קובץ מצורף'}
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleAddComment} className="comment-form">
                  <h5 style={{ fontWeight: '600' }}>הוספת הערה</h5>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor={`external-comment-text-${task.id}`}>תוכן ההערה *</label>
                    <textarea
                      id={`external-comment-text-${task.id}`}
                      className="form-control"
                      rows="2"
                      value={commentText}
                      onChange={(e) => {
                        setCommentText(e.target.value);
                        if (commentError) setCommentError('');
                      }}
                      maxLength={5000}
                      disabled={isSubmittingComment}
                    />
                  </div>

                  {commentError && <span className="form-error">{commentError}</span>}

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={isSubmittingComment}>
                    {isSubmittingComment ? 'שומר...' : 'הוספת הערה'}
                  </button>
                </form>

              </div>

            </div>

            {/* Sidebar View Area (Right Column) */}
            <div className="details-sidebar">

              {/* AREA 2: ספק ואיש קשר */}
              {(isFieldVisibleForTask('contactPerson') || isFieldVisibleForTask('supplierContactEmail')) && (
                <div className="details-section-card" style={{ marginBottom: '16px' }}>
                  <h4 className="detail-section-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>🏭 ספק ואיש קשר</h4>

                  {/* Supplier Contact Name */}
                  {isFieldVisibleForTask('contactPerson') && (() => {
                    const currentContactPerson = task.contactPerson || task.supplierContactName;
                    const cObj = currentContactPerson ? contacts.find(c => (typeof c === 'string' ? c : c?.name)?.trim().toLowerCase() === currentContactPerson.trim().toLowerCase()) : null;
                    const phone = cObj?.phone || task.phone || task.contactPhone || task.supplierContactPhone || '';
                    const role = cObj?.role || task.contactRole || '';
                    const wechat = cObj?.wechat || task.wechat || '';
                    const address = cObj?.address || '';
                    return (
                      <div className="sidebar-row">
                        <span className="sidebar-label">{getNewTaskFieldLabel('contactPerson')}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="sidebar-value" style={{ fontWeight: currentContactPerson ? '600' : 'normal' }}>
                              {currentContactPerson || '-'}
                            </span>
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
                                style={{ color: 'var(--primary, #4f46e5)', textDecoration: 'none', fontWeight: '500' }}
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
                      </div>
                    );
                  })()}

                  {/* Supplier Contact Email */}
                  {isFieldVisibleForTask('supplierContactEmail') && (() => {
                    const currentContactPerson = task.contactPerson || task.supplierContactName;
                    const cObj = currentContactPerson ? contacts.find(c => (typeof c === 'string' ? c : c?.name)?.trim().toLowerCase() === currentContactPerson.trim().toLowerCase()) : null;
                    const currentContactEmail = task.supplierContactEmail || task.contactEmail || task.email || task.supplierEmail || (cObj ? cObj.email : '');
                    return (
                      <div className="sidebar-row">
                        <span className="sidebar-label">{getNewTaskFieldLabel('supplierContactEmail')}</span>
                        {currentContactEmail ? (
                          <a href={`mailto:${currentContactEmail}`} className="sidebar-value direction-ltr text-left" style={{ color: 'var(--primary, #4f46e5)', textDecoration: 'underline' }}>
                            {currentContactEmail}
                          </a>
                        ) : (
                          <span className="sidebar-value">-</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* AREA 3: חומרים ואישורים */}
              {(isFieldVisibleForTask('status') || isFieldVisibleForTask('diecutsStatus') || isFieldVisibleForTask('imagesStatus') || isFieldVisibleForTask('standardsInstituteRequired')) && (
                <div className="details-section-card">
                  <h4 className="detail-section-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>🧪 שלב ואישורים</h4>

                  {/* Status */}
                  {isFieldVisibleForTask('status') && (
                    <div className="sidebar-row">
                      <span className="sidebar-label">{getNewTaskFieldLabel('status')}</span>
                      <div style={{ marginTop: '4px' }}>
                        <span className={`badge ${STATUS_CLASSES[task.status] || ''}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Diecuts Status */}
                  {isFieldVisibleForTask('diecutsStatus') && (
                    <div className="sidebar-row">
                      <span className="sidebar-label">{getNewTaskFieldLabel('diecutsStatus')}</span>
                      <span className="sidebar-value">{task.diecutsStatus || 'אין'}</span>
                    </div>
                  )}

                  {/* Images Status */}
                  {isFieldVisibleForTask('imagesStatus') && (
                    <div className="sidebar-row">
                      <span className="sidebar-label">{getNewTaskFieldLabel('imagesStatus')}</span>
                      <span className="sidebar-value">{task.imagesStatus || 'אין'}</span>
                    </div>
                  )}

                  {/* Standards Institute Required */}
                  {isFieldVisibleForTask('standardsInstituteRequired') && (
                    <div className="sidebar-row">
                      <span className="sidebar-label">{getNewTaskFieldLabel('standardsInstituteRequired')}</span>
                      <span className="sidebar-value">{task.standardsInstituteRequired || 'לא'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* AREA: שדות נוספים / מותאמים */}
              {customFieldDefinitions.some(f => isFieldVisibleForTask(f.key)) && (
                <div className="details-section-card" style={{ marginTop: '16px' }}>
                  <h4 className="detail-section-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>✨ שדות נוספים</h4>
                  {customFieldDefinitions.filter(f => isFieldVisibleForTask(f.key)).map(f => {
                    const val = task.customFields?.[f.key] ?? task[f.key] ?? '';
                    return (
                      <div key={f.key} className="sidebar-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginBottom: '8px' }}>
                        <span className="sidebar-label">{f.label}</span>
                        <span className="sidebar-value">
                          {f.type === 'checkbox'
                            ? (val === true || val === 'true' ? '✅ כן' : '❌ לא')
                            : (val ? String(val) : '-')
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="sidebar-row" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '16px' }}>
                <span>עודכן לאחרונה: {formatDate(task.updatedAt)}</span>
              </div>
            </div>

          </div>
        </div>

        {!isSingleProjectView && (
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              סגור
            </button>
          </div>
        )}
      </div>
      {/* Read-only Info Card Popup */}
      {activeInfoCard && (
        <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={() => setActiveInfoCard(null)}>
          <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'right', direction: 'rtl', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: '700' }}>{activeInfoCard.title}</h3>
              <button className="modal-close" onClick={() => setActiveInfoCard(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 0 }}>
              {activeInfoCard.type === 'contact' ? (
                activeInfoCard.fields.map((field, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: '8px',
                      borderRadius: '4px',
                      padding: '4px 6px'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '2px' }}>{field.label}</div>
                    {field.isMultiline ? (
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: '600', whiteSpace: 'pre-wrap' }}>
                        {field.value || '-'}
                      </div>
                    ) : field.type === 'phone' && field.value ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: '600' }} className="direction-ltr text-left">
                        <a href={`tel:${field.value.replace(/\s+/g, '')}`} style={{ color: 'var(--primary, #4f46e5)', textDecoration: 'underline' }}>
                          {field.value}
                        </a>
                        {(() => {
                          const digitsOnly = field.value.replace(/\D/g, '');
                          if (digitsOnly.length >= 9) {
                            let cleanVal = digitsOnly;
                            if (cleanVal.startsWith('05') && cleanVal.length === 10) {
                              cleanVal = '972' + cleanVal.substring(1);
                            }
                            return (
                              <a
                                href={`https://wa.me/${cleanVal}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="פתיחת צ'אט בוואטסאפ"
                                style={{ display: 'inline-flex', alignItems: 'center', transition: 'transform 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#10b981" viewBox="0 0 16 16">
                                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.615zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                                </svg>
                              </a>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : field.type === 'email' && field.value ? (
                      <div style={{ fontSize: '0.95rem', fontWeight: '600' }} className="direction-ltr text-left">
                        <a href={`mailto:${field.value}`} style={{ color: 'var(--primary, #4f46e5)', textDecoration: 'underline' }}>
                          {field.value}
                        </a>
                      </div>
                    ) : (
                      <div
                        className={field.isLtr ? 'direction-ltr text-left' : ''}
                        style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: '600' }}
                      >
                        {field.value || '-'}
                      </div>
                    )}
                  </div>
                ))
              ) : activeInfoCard.fields.some(f => f.value && f.value.trim()) ? (
                activeInfoCard.fields.map((field, idx) => {
                  if (!field.value || !field.value.trim()) return null;
                  return (
                    <div key={idx} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '2px' }}>{field.label}</div>
                      <div
                        className={field.isLtr ? 'direction-ltr text-left' : ''}
                        style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: '600', whiteSpace: field.isMultiline ? 'pre-wrap' : 'normal' }}
                      >
                        {field.type === 'phone' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <a href={`tel:${field.value.replace(/\s+/g, '')}`} style={{ color: 'var(--primary, #4f46e5)', textDecoration: 'underline' }}>
                              {field.value}
                            </a>
                            {(() => {
                              const digitsOnly = field.value.replace(/\D/g, '');
                              if (digitsOnly.length >= 9) {
                                let cleanVal = digitsOnly;
                                if (cleanVal.startsWith('05') && cleanVal.length === 10) {
                                  cleanVal = '972' + cleanVal.substring(1);
                                }
                                return (
                                  <a
                                    href={`https://wa.me/${cleanVal}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="פתיחת צ'אט בוואטסאפ"
                                    style={{ display: 'inline-flex', alignItems: 'center', transition: 'transform 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#10b981" viewBox="0 0 16 16">
                                      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.615zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                                    </svg>
                                  </a>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : field.type === 'email' ? (
                          <a href={`mailto:${field.value}`} style={{ color: 'var(--primary, #4f46e5)', textDecoration: 'underline' }}>
                            {field.value}
                          </a>
                        ) : field.type === 'whatsapp' ? (() => {
                          const digitsOnly = field.value.replace(/\D/g, '');
                          if (digitsOnly.length >= 9) {
                            let cleanVal = digitsOnly;
                            if (cleanVal.startsWith('05') && cleanVal.length === 10) {
                              cleanVal = '972' + cleanVal.substring(1);
                            }
                            return (
                              <a
                                href={`https://wa.me/${cleanVal}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#10b981', fontWeight: 'bold', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'transform 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#10b981" viewBox="0 0 16 16" style={{ marginLeft: '4px' }}>
                                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.907h.004c4.368 0 7.926-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.615zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-3.146c-.202-.1-.1.202-.455-.382-.072-.121-.382-.072-.51-.17l-.613-.3a1.1 1.1 0 0 0-.737-.039a3 3 0 0 1-.948.595 5.3 5.3 0 0 1-1.1-.072a4.3 4.3 0 0 1-1.363-.927a3.6 3.6 0 0 1-.94-.99a.96.96 0 0 1 .184-1.258l.15-.16a1.2 1.2 0 0 0 .227-.38c.079-.19-.008-.39-.092-.559l-.368-.84c-.208-.474-.385-.467-.526-.474a3.5 3.5 0 0 0-.708-.007c-.233 0-.612.088-.933.437A3.27 3.27 0 0 0 3 6.9c0 1.43.94 2.813 1.07 2.997.132.182 1.844 2.815 4.467 3.946c.623.268 1.11.428 1.488.548c.624.198 1.192.17 1.64.103c.5-.075 1.543-.63 1.761-1.243c.218-.613.218-1.138.152-1.248c-.066-.111-.242-.211-.45-.311"/>
                                </svg>
                                {field.value}
                              </a>
                            );
                          }
                          return field.value;
                        })() : (
                          field.value
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  אין פרטים נוספים שמורים עבור גורם זה במערכת.
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: '20px', padding: 0, borderTop: 'none', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveInfoCard(null)} style={{ minWidth: '80px' }}>
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Preview Modal */}
      <Suspense fallback={null}>
        <ExcelPreviewModal
          isOpen={!!excelPreviewFile}
          onClose={() => setExcelPreviewFile(null)}
          fileUrl={excelPreviewFile?.url}
          fileName={excelPreviewFile?.name}
        />
      </Suspense>

      {/* PDF Preview Modal */}
      <Suspense fallback={null}>
        <PdfPreviewModal
          isOpen={!!pdfPreviewFile}
          onClose={() => setPdfPreviewFile(null)}
          fileUrl={pdfPreviewFile?.url}
          fileName={pdfPreviewFile?.name}
        />
      </Suspense>

      {/* Image Preview Modal */}
      <Suspense fallback={null}>
        <ImagePreviewModal
          isOpen={!!imagePreviewFile}
          onClose={() => setImagePreviewFile(null)}
          fileUrl={imagePreviewFile?.url}
          fileName={imagePreviewFile?.name}
        />
      </Suspense>
    </div>
  );
}
