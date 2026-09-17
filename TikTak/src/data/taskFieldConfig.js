export const FIELD_TYPES = [
  { value: 'text', label: 'טקסט קצר' },
  { value: 'textarea', label: 'טקסט ארוך' },
  { value: 'select', label: 'בחירה מרשימה (Dropdown)' },
  { value: 'number', label: 'מספר' },
  { value: 'date', label: 'תאריך' },
  { value: 'checkbox', label: 'תיבת סימון (כן/לא)' }
];

export const NEW_TASK_FIELD_STYLES = [
  { value: 'standard', label: 'רגיל' },
  { value: 'highlighted', label: 'מודגש' },
  { value: 'compact', label: 'קומפקטי' }
];

export const DEFAULT_NEW_TASK_FIELDS = {
  status: { enabled: true, label: 'סטטוס', icon: '📊', type: 'select', style: 'standard', isCustom: false },
  contactPerson: { enabled: true, label: 'איש קשר', icon: '👤', type: 'text', style: 'standard', options: [], defaultValue: '', isCustom: false },
  supplierContactEmail: { enabled: true, label: 'אימייל איש קשר', icon: '✉️', type: 'text', style: 'standard', options: [], defaultValue: '', isCustom: false },
  contactPhone: { enabled: true, label: 'טלפון איש קשר', icon: '📞', type: 'text', style: 'standard', options: [], defaultValue: '', isCustom: false },
  standardsInstituteRequired: { enabled: true, label: 'דרישות מכון תקנים', icon: '🏛️', type: 'select', style: 'standard', options: ['לא', 'כן'], defaultValue: 'לא', isCustom: false },
  diecutsStatus: { enabled: true, label: 'דייקאטים', icon: '📐', type: 'select', style: 'standard', options: ['אין', 'יש', 'חלקי'], defaultValue: 'אין', isCustom: false },
  imagesStatus: { enabled: true, label: 'תמונות', icon: '🖼️', type: 'select', style: 'standard', options: ['אין', 'יש', 'חלקי'], defaultValue: 'אין', isCustom: false },
  description: { enabled: true, label: 'תיאור ופרטים נוספים', icon: '📝', type: 'textarea', style: 'standard', isCustom: false },
  internalNotes: { enabled: true, label: 'הערות פנימיות', icon: '🔒', type: 'textarea', style: 'standard', isCustom: false },
  workOrderFiles: { enabled: true, label: 'הזמנת עבודה', icon: '📋', type: 'file', style: 'standard', isCustom: false },
  planogramFile: { enabled: true, label: 'פלנוגרמה', icon: '🗺️', type: 'file', style: 'standard', isCustom: false }
};

export const NEW_TASK_FIELD_DEFINITIONS = [
  { key: 'status', label: 'סטטוס', icon: '📊', type: 'select', description: 'רשימת הסטטוסים מנוהלת בהמשך עמוד ההגדרות', isCustom: false },
  { key: 'contactPerson', label: 'איש קשר', icon: '👤', type: 'text', options: [], isCustom: false },
  { key: 'supplierContactEmail', label: 'אימייל איש קשר', icon: '✉️', type: 'text', options: [], isCustom: false },
  { key: 'contactPhone', label: 'טלפון איש קשר', icon: '📞', type: 'text', options: [], isCustom: false },
  {
    key: 'standardsInstituteRequired',
    label: 'דרישות מכון תקנים',
    icon: '🏛️',
    type: 'select',
    options: ['לא', 'כן'],
    isCustom: false
  },
  {
    key: 'diecutsStatus',
    label: 'דייקאטים',
    icon: '📐',
    type: 'select',
    options: ['אין', 'יש', 'חלקי'],
    isCustom: false
  },
  {
    key: 'imagesStatus',
    label: 'תמונות',
    icon: '🖼️',
    type: 'select',
    options: ['אין', 'יש', 'חלקי'],
    isCustom: false
  },
  { key: 'description', label: 'תיאור ופרטים נוספים', icon: '📝', type: 'textarea', isCustom: false },
  { key: 'internalNotes', label: 'הערות פנימיות', icon: '🔒', type: 'textarea', isCustom: false },
  {
    key: 'workOrderFiles',
    label: 'הזמנת עבודה',
    icon: '📋',
    type: 'file',
    description: 'קבצי הזמנת עבודה ומסמכים מצורפים',
    isCustom: false
  },
  { key: 'planogramFile', label: 'פלנוגרמה', icon: '🗺️', type: 'file', description: 'קובץ פלנוגרמה (תמונה או PDF)', isCustom: false }
];

export const createCustomFieldConfig = ({ label, icon = '✨', type = 'text', style = 'standard', options = [], defaultValue = '' }) => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const key = `custom_${timestamp}_${randomSuffix}`;
  return {
    key,
    label: label.trim() || 'שדה חדש',
    icon: icon || '✨',
    type,
    style,
    options: Array.isArray(options) ? options : [],
    defaultValue: defaultValue ?? '',
    enabled: true,
    deleted: false,
    isCustom: true
  };
};

export const normalizeNewTaskFields = (fields = {}, { includeDeleted = false, isLegacy = false } = {}) => {
  const normalized = {};

  // 1. Process default built-in fields
  for (const [key, defaults] of Object.entries(DEFAULT_NEW_TASK_FIELDS)) {
    const customOverride = fields?.[key] || (key === 'contactPhone' ? fields?.['phone'] : undefined);
    const isDeleted = customOverride?.deleted === true;

    if (isDeleted && !includeDeleted) {
      if (!isLegacy || (key !== 'workOrderFiles' && key !== 'planogramFile')) {
        continue; // Field was deleted from org and we are not including deleted fields
      }
    }

    const merged = { ...defaults, ...(customOverride || {}) };
    const hasDefinedOptions = defaults.options !== undefined || Array.isArray(customOverride?.options);
    const options = Array.isArray(merged.options)
      ? merged.options.map(option => String(option).trim()).filter(Boolean)
      : (defaults.options ? defaults.options : undefined);

    let defaultValue = merged.defaultValue !== undefined ? String(merged.defaultValue).trim() : (defaults.defaultValue ?? '');
    if (options && options.length > 0) {
      if (!options.includes(defaultValue) && defaults.defaultValue && options.includes(defaults.defaultValue)) {
        defaultValue = defaults.defaultValue;
      }
    }

    let label = String(customOverride?.label || defaults.label).trim() || defaults.label;
    if (isLegacy) {
      if (label === 'איש קשר אצל הספק') label = 'איש קשר';
      if (label === 'מייל איש קשר ספק' || label === 'אימייל ספק') label = 'אימייל איש קשר';
      if (label === 'טלפון ספק' || label === 'טלפון איש קשר ספק' || label === 'טלפון') label = 'טלפון איש קשר';
      if (key === 'planogramFile') {
        label = 'פלנוגרמה';
      }
      if (key === 'workOrderFiles') {
        label = 'הזמנת עבודה';
      }
    } else if (!customOverride?.label) {
      if (key === 'planogramFile' && (label.includes('הזמנת עבודה') || label.includes('/'))) {
        label = 'פלנוגרמה';
      }
      if (key === 'workOrderFiles' && (label.includes('הזמנת עבודה / פלנוגרמה') || label.startsWith('הזמנת עבודה ('))) {
        label = 'הזמנת עבודה';
      }
    }

    const isLockedLegacyField = isLegacy && (key === 'workOrderFiles' || key === 'planogramFile');
    const enabled = isLockedLegacyField ? true : (isDeleted ? false : merged.enabled !== false);
    const deleted = isLockedLegacyField ? false : isDeleted;

    normalized[key] = {
      ...merged,
      key,
      label,
      type: merged.type || defaults.type || 'text',
      style: NEW_TASK_FIELD_STYLES.some(style => style.value === merged.style) ? merged.style : 'standard',
      icon: merged.icon || defaults.icon || '📌',
      enabled,
      deleted,
      isCustom: false,
      ...(hasDefinedOptions ? {
        options: options || [],
        defaultValue
      } : {})
    };
  }

  // 2. Process custom user-created fields
  if (fields && typeof fields === 'object') {
    for (const [key, fieldConfig] of Object.entries(fields)) {
      if (DEFAULT_NEW_TASK_FIELDS[key] || !fieldConfig || key === 'workType' || key === 'phone') {
        continue;
      }

      const isDeleted = fieldConfig.deleted === true;
      if (isDeleted && !includeDeleted) {
        continue;
      }

      const options = Array.isArray(fieldConfig.options)
        ? fieldConfig.options.map(option => String(option).trim()).filter(Boolean)
        : (fieldConfig.type === 'select' ? [] : undefined);

      let defaultValue = fieldConfig.defaultValue !== undefined ? fieldConfig.defaultValue : '';

      normalized[key] = {
        key,
        label: String(fieldConfig.label || 'שדה מותאם').trim(),
        type: FIELD_TYPES.some(t => t.value === fieldConfig.type) ? fieldConfig.type : 'text',
        style: NEW_TASK_FIELD_STYLES.some(s => s.value === fieldConfig.style) ? fieldConfig.style : 'standard',
        icon: fieldConfig.icon || '✨',
        enabled: isDeleted ? false : fieldConfig.enabled !== false,
        deleted: isDeleted,
        isCustom: true,
        options: options || [],
        defaultValue
      };
    }
  }

  return normalized;
};

export const getAllTaskFieldDefinitions = (newTaskFields = {}, { includeDeleted = false, taskFieldOrder = [], isLegacy = false } = {}) => {
  const normalized = normalizeNewTaskFields(newTaskFields, { includeDeleted, isLegacy });
  const definitionsMap = new Map();

  // 1. Index built-ins
  for (const def of NEW_TASK_FIELD_DEFINITIONS) {
    if (normalized[def.key]) {
      definitionsMap.set(def.key, {
        ...def,
        ...normalized[def.key]
      });
    }
  }

  // 2. Index custom fields
  for (const [key, field] of Object.entries(normalized)) {
    if (field.isCustom) {
      definitionsMap.set(key, field);
    }
  }

  // 3. If taskFieldOrder is provided, sort accordingly
  if (Array.isArray(taskFieldOrder) && taskFieldOrder.length > 0) {
    const result = [];
    const seen = new Set();

    // First add fields according to taskFieldOrder
    for (const key of taskFieldOrder) {
      if (definitionsMap.has(key)) {
        result.push(definitionsMap.get(key));
        seen.add(key);
      }
    }

    // Then add any remaining fields that weren't in taskFieldOrder
    for (const [key, field] of definitionsMap.entries()) {
      if (!seen.has(key)) {
        result.push(field);
      }
    }

    return result;
  }

  return Array.from(definitionsMap.values());
};
