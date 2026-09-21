/**
 * Utility functions for resolving and formatting contact person details
 * from contacts directory, suppliers directory, and task fields.
 */

export function resolveContactDetails(contactName, task, contacts = [], suppliers = []) {
  const norm = (s) => (typeof s === 'string' ? s : (s?.name || '')).trim().toLowerCase();
  const target = norm(contactName || task?.contactPerson || task?.supplierContactName || '');

  let cObj = null;
  if (target) {
    // 1. Exact or trimmed match in contacts
    cObj = contacts.find(c => norm(c) === target);
    // 2. Contains / partial match if not found
    if (!cObj) {
      cObj = contacts.find(c => {
        const cNorm = norm(c);
        return cNorm && (cNorm.includes(target) || target.includes(cNorm));
      });
    }
  }

  let sObj = null;
  if (target) {
    // Check in suppliers list (contactPerson or supplier name)
    sObj = suppliers.find(s => {
      const sContact = norm(s?.contactPerson);
      const sName = norm(s?.name);
      return (sContact && (sContact === target || sContact.includes(target) || target.includes(sContact))) ||
             (sName && (sName === target || sName.includes(target) || target.includes(sName)));
    });
  }

  const taskSupplier = task?.supplierName
    ? suppliers.find(s => norm(s?.name) === norm(task.supplierName))
    : null;

  const phone = (
    task?.phone ||
    task?.contactPhone ||
    (typeof cObj === 'object' ? cObj?.phone : '') ||
    task?.supplierContactPhone ||
    task?.supplierPhone ||
    sObj?.phone ||
    taskSupplier?.phone ||
    ''
  ).trim();

  const email = (
    task?.supplierContactEmail ||
    task?.contactEmail ||
    task?.email ||
    (typeof cObj === 'object' ? cObj?.email : '') ||
    task?.supplierEmail ||
    sObj?.email ||
    taskSupplier?.email ||
    ''
  ).trim();

  const role = (
    (typeof cObj === 'object' ? cObj?.role : '') ||
    task?.contactRole ||
    task?.role ||
    sObj?.role ||
    ''
  ).trim();

  const wechat = (
    (typeof cObj === 'object' ? cObj?.wechat : '') ||
    task?.wechat ||
    sObj?.wechat ||
    ''
  ).trim();

  const address = (
    (typeof cObj === 'object' ? cObj?.address : '') ||
    task?.address ||
    task?.supplierAddress ||
    sObj?.address ||
    taskSupplier?.address ||
    ''
  ).trim();

  const notes = (
    (typeof cObj === 'object' ? cObj?.notes : '') ||
    task?.contactNotes ||
    task?.notes ||
    sObj?.notes ||
    ''
  ).trim();

  return {
    contactObj: cObj,
    supplierObj: sObj,
    name: contactName || (typeof cObj === 'object' ? cObj?.name : '') || task?.contactPerson || task?.supplierContactName || '',
    phone,
    email,
    role,
    wechat,
    address,
    notes
  };
}

/**
 * Normalizes a phone number (especially Israeli numbers) into standard digits for WhatsApp URL.
 * WhatsApp requires the international number format without '+', leading zeros, or symbols.
 * Examples:
 *   "052-8366744" -> "972528366744"
 *   "052-836-6744" -> "972528366744"
 *   "+972 52 836 6744" -> "972528366744"
 *   "+972-052-8366744" -> "972528366744"
 *   "03-1234567" -> "97231234567"
 *   "077-1234567" -> "972771234567"
 *   "528366744" -> "972528366744"
 *   "+1 (555) 234-5678" -> "15552345678"
 */
export function normalizePhoneForWhatsApp(phone) {
  if (!phone) return null;
  let str = String(phone).trim();
  if (!str) return null;

  // If parentheses contain letters (Hebrew or Latin), remove parenthesized comment (e.g. "(שחר)", "(נייד)")
  // If parentheses only contain digits/symbols (e.g. "(555)", "(03)"), keep the digits!
  str = str.replace(/\([^)]*[a-zA-Z\u0590-\u05FF][^)]*\)/g, '').replace(/[()]/g, ' ').trim();

  // If multiple numbers separated by slash, comma, semicolon, or newline, take the first one
  if (str.includes('/') || str.includes(',') || str.includes(';') || str.includes('\n')) {
    str = str.split(/[/,;\n]/)[0].trim();
  }

  // Remove trailing extension indications like "שלוחה 1" or "ext. 1"
  str = str.split(/(?:שלוחה|ext\.?)/i)[0].trim();

  const hasPlus = str.startsWith('+');

  // Strip all non-digit characters
  let digits = str.replace(/\D/g, '');
  if (!digits) return null;

  // Remove leading international access code 00
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // If started with + or 00:
  if (hasPlus) {
    // If user mistakenly entered +9720...
    if (digits.startsWith('9720')) {
      digits = '972' + digits.substring(4);
    }
    return digits.length >= 7 ? digits : null;
  }

  // If starts with 972
  if (digits.startsWith('972')) {
    if (digits.startsWith('9720')) {
      digits = '972' + digits.substring(4);
    }
    return digits.length >= 11 ? digits : null;
  }

  // Israeli numbers starting with 0:
  // Mobile (e.g. 050..., 052... - 10 digits)
  // Landline (e.g. 02..., 03..., 04..., 08..., 09..., 077... - 9 or 10 digits)
  if (digits.startsWith('0')) {
    digits = '972' + digits.substring(1);
    return digits.length >= 11 ? digits : null;
  }

  // Israeli 9-digit mobile entered without leading 0 (e.g. 528366744, 501234567)
  if (digits.length === 9 && digits.startsWith('5')) {
    digits = '972' + digits;
    return digits;
  }

  // Israeli 8-digit landline entered without leading 0 (e.g. 31234567)
  if (digits.length === 8 && /^[23489]/.test(digits)) {
    digits = '972' + digits;
    return digits;
  }

  // Fallback for other valid international digit strings
  return digits.length >= 8 ? digits : null;
}

/**
 * Returns a full https://wa.me/<number> URL for a phone number or null if invalid
 */
export function formatWhatsAppUrl(phone) {
  const normalized = normalizePhoneForWhatsApp(phone);
  return normalized ? `https://wa.me/${normalized}` : null;
}

