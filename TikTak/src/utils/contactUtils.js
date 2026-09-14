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
