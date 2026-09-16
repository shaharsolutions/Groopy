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

export const fetchTranzilaHandshakeToken = async ({ sum, supplier = TRANZILA_DEFAULT_CONFIG.mainTerminal }) => {
  try {
    const url = `https://smzgfffeehrozxsqtgqa.supabase.co/functions/v1/tiktak-handshake?sum=${encodeURIComponent(sum)}&supplier=${encodeURIComponent(supplier)}`;
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
  const baseUrl = `https://direct.tranzila.com/${encodeURIComponent(terminalName)}/iframenew.php`;

  const recurStartDate = calculateNextBillingDate();

  const params = new URLSearchParams();
  params.set('sum', cleanSum.toString());
  params.set('currency', '1'); // 1 = ILS (₪)
  params.set('lang', 'il'); // Hebrew RTL
  params.set('cred_type', '1'); // Regular one-time charge for initial payment
  params.set('tranmode', 'A'); // Automatic settlement/charge

  if (thtk) {
    params.set('new_process', '1');
    params.set('thtk', thtk);
  }

  if (isRecurring) {
    // Tranzila recurring payment parameters (הוראת קבע חודשית)
    params.set('recur_transaction', '4_approved'); // Monthly recurring locked
    params.set('recur_sum', cleanSum.toString()); // Recurring monthly charge
    params.set('recur_start_date', recurStartDate); // Start date of next charge (YYYY-MM-DD)
    // Note: recur_payments is omitted so Tranzila treats it as continuous subscription
    // and avoids displaying the confusing 'ל-0 חודשים'.
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

  const recurringNote = isRecurring ? ` (מנוי חודשי מתחדש ₪${cleanSum}/חודש)` : '';
  const pdesc = `${description}${recurringNote}${orgName ? ` - ${orgName}` : ''}`;
  params.set('pdesc', pdesc);

  if (orgId) {
    params.set('u_org_id', orgId);
  }

  // Set return URLs if provided
  if (successUrl) {
    params.set('success_url_address', successUrl);
  }
  if (failUrl) {
    params.set('fail_url_address', failUrl);
  }

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Record a successful payment and reactivate the organization with recurring subscription
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
  terminal = TRANZILA_DEFAULT_CONFIG.tokenTerminal
}) => {
  if (!organizationId) {
    throw new Error('חסר מזהה ארגון להפעלת תשלום');
  }

  const cleanCode = (confirmationCode || '').trim();
  if (!cleanCode) {
    throw new Error('לא ניתן להפעיל ארגון ללא מספר אישור עסקה מאומת מטרנזילה');
  }

  const now = new Date().toISOString();
  const nextBillingDate = calculateNextBillingDate();
  const cleanAmount = Number(amount) || 0;

  const paymentRecord = {
    organizationId,
    organizationName: organizationName || organizationId,
    userId: userId || '',
    userEmail: userEmail || '',
    amount: cleanAmount,
    currency: 'ILS',
    billingType: 'recurring_monthly',
    recurringFrequency: 'monthly',
    nextBillingDate,
    terminal,
    status: 'completed',
    transactionId: transactionId || `TRZ-${cleanCode}`,
    confirmationCode: cleanCode,
    method,
    createdAt: now
  };

  // 1. Save payment record
  let paymentDocRef = null;
  try {
    paymentDocRef = await addDoc(collection(db, PAYMENTS_COLLECTION), paymentRecord);
  } catch (err) {
    console.error('Failed to create payment document in payments collection:', err);
  }

  // 2. Reactivate organization & record subscription details
  const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);
  await updateDoc(orgRef, {
    active: true,
    updatedAt: now,
    subscription: {
      type: 'monthly',
      status: 'active',
      startDate: now,
      nextBillingDate,
      amount: cleanAmount,
      currency: 'ILS',
      terminal
    },
    lastPayment: {
      amount: cleanAmount,
      date: now,
      userId,
      userEmail,
      transactionId: paymentRecord.transactionId,
      paymentId: paymentDocRef?.id || '',
      billingType: 'recurring_monthly'
    }
  });

  // 3. Log activity
  try {
    await recordActivity({
      action: 'ORGANIZATION_REACTIVATED_BY_PAYMENT',
      actionLabel: 'הפעלת מנוי חודשי ופתיחת ארגון',
      targetType: 'organization',
      targetId: organizationId,
      targetLabel: organizationName || organizationId,
      details: `הופעל מנוי חודשי (הוראת קבע) בסך ₪${cleanAmount}/חודש עבור פתיחת הארגון`,
      metadata: {
        amount: cleanAmount,
        billingType: 'recurring_monthly',
        nextBillingDate,
        transactionId: paymentRecord.transactionId,
        userEmail
      },
      organizationId
    });
  } catch (logErr) {
    console.warn('Could not record activity log for reactivation payment:', logErr);
  }

  return {
    success: true,
    paymentRecord
  };
};

/**
 * Fetch recent payments for admin dashboard
 */
export const getPaymentRecords = async (maxRecords = 50) => {
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
