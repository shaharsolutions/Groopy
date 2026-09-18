import { db } from '../firebaseDb';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { recordActivity } from './storage';

export const TRANZILA_DEFAULT_CONFIG = {
  mainTerminal: 'shaher1',
  mainPassword: 'fGEXogUx',
  tokenTerminal: 'shaher1tok',
  tokenPassword: 'rBsgu589',
  appKey: '1klmutNvgz32thVKmbIrir8LOX1BngaCN9YDf266Sc37MeMVCWJAtExTjXThUk0QJOUqzEGIh0L',
  secretKey: 'NmhK17aY6v',
  defaultReopenPrice: 150,
  defaultCurrency: '1', // 1 = ILS (₪)
  defaultDescription: 'פתיחת גישה למערכת תיקתק'
};

const PAYMENTS_COLLECTION = 'payments';
const SYSTEM_CONFIG_DOC = 'system_config';
const ORGANIZATIONS_COLLECTION = 'organizations';

/**
 * Read system payment settings from Firestore
 */
export const getPaymentConfig = async () => {
  try {
    const configRef = doc(db, ORGANIZATIONS_COLLECTION, SYSTEM_CONFIG_DOC);
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        reopenPrice: typeof data.reopenPrice === 'number' ? data.reopenPrice : (Number(data.reopenPrice) || TRANZILA_DEFAULT_CONFIG.defaultReopenPrice),
        currency: data.reopenCurrency || TRANZILA_DEFAULT_CONFIG.defaultCurrency,
        description: data.paymentDescription || TRANZILA_DEFAULT_CONFIG.defaultDescription,
        mainTerminal: data.tranzilaTerminal || TRANZILA_DEFAULT_CONFIG.mainTerminal,
        tokenTerminal: data.tranzilaTokenTerminal || TRANZILA_DEFAULT_CONFIG.tokenTerminal,
        appKey: data.tranzilaAppKey || TRANZILA_DEFAULT_CONFIG.appKey,
        secretKey: data.tranzilaSecretKey || TRANZILA_DEFAULT_CONFIG.secretKey
      };
    }
  } catch (err) {
    console.warn('Could not read payment config from Firestore, using defaults:', err);
  }

  return {
    reopenPrice: TRANZILA_DEFAULT_CONFIG.defaultReopenPrice,
    currency: TRANZILA_DEFAULT_CONFIG.defaultCurrency,
    description: TRANZILA_DEFAULT_CONFIG.defaultDescription,
    mainTerminal: TRANZILA_DEFAULT_CONFIG.mainTerminal,
    tokenTerminal: TRANZILA_DEFAULT_CONFIG.tokenTerminal,
    appKey: TRANZILA_DEFAULT_CONFIG.appKey,
    secretKey: TRANZILA_DEFAULT_CONFIG.secretKey
  };
};

/**
 * Save updated payment settings to Firestore (Admin only)
 */
export const savePaymentConfig = async (updates) => {
  const configRef = doc(db, ORGANIZATIONS_COLLECTION, SYSTEM_CONFIG_DOC);
  const payload = {
    updatedAt: new Date().toISOString()
  };

  if (updates.reopenPrice !== undefined) {
    payload.reopenPrice = Number(updates.reopenPrice) || TRANZILA_DEFAULT_CONFIG.defaultReopenPrice;
  }
  if (updates.currency !== undefined) {
    payload.reopenCurrency = updates.currency;
  }
  if (updates.description !== undefined) {
    payload.paymentDescription = updates.description.trim();
  }
  if (updates.mainTerminal !== undefined) {
    payload.tranzilaTerminal = updates.mainTerminal.trim();
  }
  if (updates.tokenTerminal !== undefined) {
    payload.tranzilaTokenTerminal = updates.tokenTerminal.trim();
  }
  if (updates.appKey !== undefined) {
    payload.tranzilaAppKey = updates.appKey.trim();
  }
  if (updates.secretKey !== undefined) {
    payload.tranzilaSecretKey = updates.secretKey.trim();
  }

  await setDoc(configRef, payload, { merge: true });
  return payload;
};

export const calculateNextBillingDate = () => {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}-${pad(nextMonth.getDate())}`;
};

export const fetchTranzilaHandshakeToken = async ({ sum, supplier = TRANZILA_DEFAULT_CONFIG.mainTerminal, orgId = '' }) => {
  try {
    const url = `https://smzgfffeehrozxsqtgqa.supabase.co/functions/v1/tiktak-handshake?sum=${encodeURIComponent(sum)}&supplier=${encodeURIComponent(supplier)}${orgId ? `&orgId=${encodeURIComponent(orgId)}` : ''}`;
    const response = await fetch(url, { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      if (data?.thtk) {
        return data.thtk;
      }
    }
  } catch (err) {
    console.warn('Failed to obtain Tranzila Handshake token:', err);
  }
  return null;
};

/**
 * Generate a secure Tranzila Payment URL for direct iframe or redirect.
 * Supports recurring monthly subscription (הוראת קבע) using the token terminal.
 */
export const buildTranzilaPaymentUrl = ({
  sum,
  orgId = '',
  orgName = '',
  userEmail = '',
  contactName = '',
  terminal = '',
  description = TRANZILA_DEFAULT_CONFIG.defaultDescription,
  successUrl = '',
  failUrl = '',
  isRecurring = true,
  thtk = ''
}) => {
  const cleanSum = Number(sum) || TRANZILA_DEFAULT_CONFIG.defaultReopenPrice;
  // Initial payment is processed on the main terminal (shaher1)
  const terminalName = terminal || TRANZILA_DEFAULT_CONFIG.mainTerminal;
  const baseUrl = `https://directng.tranzila.com/${encodeURIComponent(terminalName)}/iframenew.php`;

  const recurStartDate = calculateNextBillingDate();

  const params = new URLSearchParams();
  params.set('sum', cleanSum.toString());
  params.set('currency', '1'); // 1 = ILS (₪)
  params.set('lang', 'il'); // Hebrew RTL
  params.set('Ilang', 'HEB');
  params.set('cred_type', '1'); // Regular one-time charge for initial payment
  params.set('tranmode', 'A'); // Automatic settlement/charge

  if (thtk) {
    params.set('thtk', thtk);
  }

  if (isRecurring) {
    // Tranzila recurring payment parameters (הוראת קבע חודשית)
    params.set('recur_transaction', '4_approved'); // Monthly recurring locked
    params.set('recur_sum', cleanSum.toString()); // Recurring monthly charge
    params.set('recur_start_date', recurStartDate); // Start date of next charge (YYYY-MM-DD)
  }

  if (orgName) {
    params.set('company', orgName);
  }
  if (userEmail) {
    params.set('email', userEmail);
  }
  if (contactName) {
    params.set('contact', contactName);
  } else if (userEmail) {
    params.set('contact', userEmail);
  }

  const cleanDescription = (description || TRANZILA_DEFAULT_CONFIG.defaultDescription).replace(/[₪]/g, 'שח');
  const recurringNote = isRecurring ? ` (מנוי חודשי ${cleanSum} שח לחודש)` : '';
  const pdesc = `TikTak - ${cleanDescription}${recurringNote}${orgName ? ` - ${orgName}` : ''}`;
  params.set('pdesc', pdesc);
  params.set('remarks', `TIKTAK:${orgId || 'unknown'}`);

  if (orgId) {
    params.set('u_org_id', orgId);
  }

  // Server webhook address for Tranzila notifications (server-to-server)
  const notifyWebhookUrl = 'https://smzgfffeehrozxsqtgqa.supabase.co/functions/v1/tranzila-billing/webhook?system=tiktak';
  params.set('notify_url_address', notifyWebhookUrl);

  params.set('success_url_address', successUrl || 'https://smzgfffeehrozxsqtgqa.supabase.co/functions/v1/tranzila-billing/success');
  params.set('fail_url_address', failUrl || 'https://smzgfffeehrozxsqtgqa.supabase.co/functions/v1/tranzila-billing/failed');

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Generate field mapping for HTTP POST submission directly into the Tranzila iFrame.
 * Matches Pawza's production integration model.
 */
export const buildTranzilaPaymentFields = ({
  sum,
  orgId = '',
  orgName = '',
  userEmail = '',
  contactName = '',
  terminal = '',
  description = TRANZILA_DEFAULT_CONFIG.defaultDescription,
  successUrl = '',
  failUrl = '',
  isRecurring = true,
  thtk = ''
}) => {
  const cleanSum = Number(sum) || TRANZILA_DEFAULT_CONFIG.defaultReopenPrice;
  const terminalName = terminal || TRANZILA_DEFAULT_CONFIG.mainTerminal;
  const recurStartDate = calculateNextBillingDate();

  const cleanDescription = (description || TRANZILA_DEFAULT_CONFIG.defaultDescription).replace(/[₪]/g, 'שח');
  const recurringNote = isRecurring ? ` (מנוי חודשי ${cleanSum} שח לחודש)` : '';
  const pdesc = `TikTak - ${cleanDescription}${recurringNote}${orgName ? ` - ${orgName}` : ''}`;

  const fields = {
    sum: cleanSum.toString(),
    currency: '1',
    lang: 'il',
    Ilang: 'HEB',
    cred_type: '1',
    tranmode: 'A',
    thtk: thtk || '',
    contact: contactName || userEmail || '',
    company: orgName || orgId || '',
    email: userEmail || '',
    pdesc: pdesc,
    remarks: `TIKTAK:${orgId || 'unknown'}`,
    u_org_id: orgId || '',
    json_purchase_data: JSON.stringify([{
      product_name: pdesc,
      product_quantity: 1,
      product_price: cleanSum
    }]),
    notify_url_address: 'https://smzgfffeehrozxsqtgqa.supabase.co/functions/v1/tranzila-billing/webhook?system=tiktak',
    success_url_address: successUrl || 'https://smzgfffeehrozxsqtgqa.supabase.co/functions/v1/tranzila-billing/success?system=tiktak',
    fail_url_address: failUrl || 'https://smzgfffeehrozxsqtgqa.supabase.co/functions/v1/tranzila-billing/failed?system=tiktak'
  };

  if (isRecurring) {
    fields.recur_transaction = '4_approved';
    fields.recur_sum = cleanSum.toString();
    fields.recur_start_date = recurStartDate;
  }

  return {
    actionUrl: `https://directng.tranzila.com/${encodeURIComponent(terminalName)}/iframenew.php`,
    fields
  };
};

/**
 * Verify payment and ensure organization activation via server-side verification.
 * Client does NOT write active:true directly; server webhook is the authority.
 */
export const recordPaymentAndReactivateOrg = async ({
  organizationId,
  organizationName,
  userId = '',
  userEmail = '',
  amount = 0,
  transactionId = '',
  confirmationCode = '',
  method = 'tranzila_recurring',
  terminal = TRANZILA_DEFAULT_CONFIG.mainTerminal
}) => {
  if (!organizationId) {
    throw new Error('חסר מזהה ארגון להפעלת תשלום');
  }

  const cleanCode = (confirmationCode || '').trim();
  if (!cleanCode) {
    throw new Error('לא ניתן להפעיל ארגון ללא מספר אישור עסקה מאומת מטרנזילה');
  }

  const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);

  // 1. Check if the server webhook already activated the organization
  try {
    const orgSnap = await getDoc(orgRef);
    if (orgSnap.exists() && orgSnap.data()?.active === true) {
      return {
        success: true,
        alreadyActive: true,
        paymentRecord: orgSnap.data()?.lastPayment || {
          organizationId,
          transactionId: transactionId || `TRZ-${cleanCode}`,
          confirmationCode: cleanCode,
          amount
        }
      };
    }
  } catch (err) {
    console.warn('Initial org check warning:', err);
  }

  // 2. Trigger server verification endpoint as fallback if webhook hasn't finished yet
  try {
    const payload = new URLSearchParams({
      supplier: terminal || TRANZILA_DEFAULT_CONFIG.mainTerminal,
      sum: String(amount || TRANZILA_DEFAULT_CONFIG.defaultReopenPrice),
      Response: '000',
      ConfirmationCode: cleanCode,
      u_org_id: organizationId,
      index: transactionId || cleanCode,
      email: userEmail
    });

    const verifyRes = await fetch('https://smzgfffeehrozxsqtgqa.supabase.co/functions/v1/tiktak-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString()
    });

    if (verifyRes.ok) {
      const data = await verifyRes.json();
      if (data.success) {
        return {
          success: true,
          paymentRecord: {
            organizationId,
            transactionId: transactionId || `TRZ-${cleanCode}`,
            confirmationCode: cleanCode,
            amount
          }
        };
      }
    }
  } catch (err) {
    console.warn('Server webhook fallback trigger error:', err);
  }

  // 3. Final verification of organization status in Firestore
  const finalSnap = await getDoc(orgRef);
  if (finalSnap.exists() && finalSnap.data()?.active === true) {
    return {
      success: true,
      paymentRecord: finalSnap.data()?.lastPayment || {}
    };
  }

  return {
    success: false,
    message: 'התשלום התקבל ומאומת ברקע על ידי השרת'
  };
};

/**
 * Fetch recent payments for admin dashboard
 */
export const getPaymentRecords = async (maxRecords = 200) => {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxRecords)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (err) {
    console.warn('Could not fetch payment records from Firestore:', err);
    return [];
  }
};

/**
 * Clear/reset all payment records from Firestore (Admin only)
 * @deprecated Prefer deleting selected payment records instead
 */
export const clearAllPaymentRecords = async () => {
  try {
    const q = query(collection(db, PAYMENTS_COLLECTION));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, PAYMENTS_COLLECTION, docSnap.id)));
    await Promise.all(deletePromises);
    return { success: true, count: snapshot.docs.length };
  } catch (err) {
    console.error('Failed to clear payment records from Firestore:', err);
    throw err;
  }
};

/**
 * Delete specific payment records from Firestore (Admin only)
 * @param {string[]} recordIds - List of payment document IDs to delete
 */
export const deletePaymentRecords = async (recordIds = []) => {
  if (!recordIds || recordIds.length === 0) {
    return { success: true, count: 0 };
  }
  try {
    const deletePromises = recordIds.map(id => deleteDoc(doc(db, PAYMENTS_COLLECTION, id)));
    await Promise.all(deletePromises);
    return { success: true, count: recordIds.length };
  } catch (err) {
    console.error('Failed to delete payment records from Firestore:', err);
    throw err;
  }
};


/**
 * Common Shva / Tranzila response codes and readable Hebrew explanations
 */
export const SHVA_RESPONSE_MESSAGES = {
  '000': 'העסקה אושרה בהצלחה',
  '001': 'כרטיס חסום על ידי חברת האשראי',
  '002': 'כרטיס גנוב / חסום להעברה',
  '003': 'נדרש ליצור קשר טלפוני עם חברת האשראי',
  '004': 'סירוב מחברת האשראי (מסגרת לא מספקת או דחיית הבנק המנפיק)',
  '006': 'תקלת זיהוי: מספר תעודת זהות או ספרות ביקורת בגב הכרטיס (CVV) שגויים',
  '010': 'העסקה בוטלה על ידי המשתמש',
  '017': 'סוג כרטיס זה אינו נתמך במסוף',
  '033': 'מספר כרטיס אשראי שגוי',
  '036': 'תוקף הכרטיס אינו תקין או פג תוקף',
  '057': 'עסקאות אינטרנט אינן מורשות בכרטיס זה',
  '058': 'הוראת קבע אינה מורשית בכרטיס או במסוף זה',
  '059': 'עסקה לא מורשית',
  '-1': 'שגיאת תקשורת עם שרתי הסליקה, אנא נסו שנית',
  '-96': 'זוהתה עסקה כפולה, אנא המתינו מספר רגעים'
};

export const getShvaErrorMessage = (responseCode) => {
  if (!responseCode) return 'העסקה לא אושרה על ידי חברת האשראי. אנא נסו שנית או השתמשו בכרטיס אחר.';
  const code = String(responseCode).trim();
  const desc = SHVA_RESPONSE_MESSAGES[code];
  if (desc) {
    return `${desc} (קוד: ${code})`;
  }
  return `העסקה נדחתה על ידי חברת האשראי (קוד תגובה: ${code}). אנא נסו שנית או השתמשו בכרטיס אחר.`;
};

/**
 * Cancel recurring subscription and standing order in Tranzila and Firestore.
 * Implements Option 1: Deactivates recurring standing order in Tranzila immediately,
 * marks subscription as cancelled, and preserves access until period end.
 */
export const cancelSubscriptionAndRecurringOrder = async ({
  organizationId,
  userEmail = '',
  userId = '',
  reason = ''
}) => {
  if (!organizationId) {
    throw new Error('חסר מזהה ארגון לביטול מנוי');
  }

  const endpoint = 'https://smzgfffeehrozxsqtgqa.supabase.co/functions/v1/tiktak-cancel-subscription';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId,
      userEmail,
      userId,
      reason
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'שגיאה בביטול המנוי מול שרת הסליקה');
  }

  return await response.json();
};
