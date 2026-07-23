export const DEFAULT_NEW_TASK_FIELDS = {
  status: { enabled: true, label: 'סטטוס', style: 'standard' },
  contactPerson: { enabled: true, label: 'איש קשר אצל הספק', style: 'standard' },
  supplierContactEmail: { enabled: true, label: 'מייל איש קשר ספק', style: 'standard' },
  standardsInstituteRequired: { enabled: true, label: 'דרישות מכון תקנים', style: 'standard', options: ['לא', 'כן'], defaultValue: 'לא' },
  diecutsStatus: { enabled: true, label: 'דייקאטים', style: 'standard', options: ['אין', 'יש', 'חלקי'], defaultValue: 'אין' },
  imagesStatus: { enabled: true, label: 'תמונות', style: 'standard', options: ['אין', 'יש', 'חלקי'], defaultValue: 'אין' },
  workOrderFiles: { enabled: true, label: 'הזמנת עבודה (קבצים מצורפים כגון תעודות, הוראות עבודה, PDF)', style: 'standard' },
  planogramFile: { enabled: true, label: 'העלאת פלנוגרמה', style: 'standard' }
};

export const NEW_TASK_FIELD_STYLES = [
  { value: 'standard', label: 'רגיל' },
  { value: 'highlighted', label: 'מודגש' },
  { value: 'compact', label: 'קומפקטי' }
];

export const NEW_TASK_FIELD_DEFINITIONS = [
  { key: 'status', label: 'סטטוס', description: 'רשימת הסטטוסים מנוהלת בהמשך עמוד ההגדרות' },
  { key: 'contactPerson', label: 'איש קשר אצל הספק' },
  { key: 'supplierContactEmail', label: 'מייל איש קשר ספק' },
  {
    key: 'standardsInstituteRequired',
    label: 'דרישות מכון תקנים',
    options: ['לא', 'כן']
  },
  {
    key: 'diecutsStatus',
    label: 'דייקאטים',
    options: ['אין', 'יש', 'חלקי']
  },
  {
    key: 'imagesStatus',
    label: 'תמונות',
    options: ['אין', 'יש', 'חלקי']
  },
  {
    key: 'workOrderFiles',
    label: 'הזמנת עבודה',
    description: 'קבצים מצורפים כגון תעודות, הוראות עבודה ו-PDF'
  },
  { key: 'planogramFile', label: 'העלאת פלנוגרמה' }
];

export const normalizeNewTaskFields = (fields = {}) => Object.fromEntries(
  Object.entries(DEFAULT_NEW_TASK_FIELDS).map(([key, defaults]) => [
    key,
    (() => {
      const merged = { ...defaults, ...(fields[key] || {}) };
      const options = Array.isArray(merged.options)
        ? merged.options.map(option => String(option).trim()).filter(Boolean)
        : defaults.options;
      return {
        ...merged,
        label: String(merged.label || defaults.label).trim() || defaults.label,
        style: NEW_TASK_FIELD_STYLES.some(style => style.value === merged.style) ? merged.style : 'standard',
        ...(options ? {
          options,
          defaultValue: options.includes(merged.defaultValue) ? merged.defaultValue : options[0]
        } : {})
      };
    })()
  ])
);
