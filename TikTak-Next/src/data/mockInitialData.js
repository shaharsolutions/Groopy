/**
 * TikTak Next V2 - PAWZA Seed Mock Data
 * Customized specifically for PAWZA business management.
 */

export const PAWZA_USERS = [
  {
    id: "usr_shahar",
    name: "שחר (מנהל system)",
    email: "shahar@pawza.co.il",
    phone: "050-1234567",
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    status: "פעיל"
  },
  {
    id: "usr_alina",
    name: "אלינה (מובילת פרויקט)",
    email: "alina@pawza.co.il",
    phone: "054-9876543",
    role: "project_manager",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    status: "פעיל"
  },
  {
    id: "usr_dev1",
    name: "מיכאל (מפתח תוכנה)",
    email: "michael@pawza.co.il",
    phone: "052-1112233",
    role: "employee",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    status: "פעיל"
  },
  {
    id: "usr_des1",
    name: "נועה (מעצבת UI/UX)",
    email: "noa@pawza.co.il",
    phone: "053-4445566",
    role: "employee",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
    status: "פעיל"
  }
];

export const PAWZA_DOMAINS = [
  { id: "dom_dev", name: "פיתוח", color: "#2563EB", icon: "Code2" },
  { id: "dom_design", name: "עיצוב", color: "#8B5CF6", icon: "Palette" },
  { id: "dom_content", name: "תוכן", color: "#10B981", icon: "FileText" },
  { id: "dom_marketing", name: "שיווק", color: "#F97316", icon: "Megaphone" },
  { id: "dom_sales", name: "מכירות", color: "#0284C7", icon: "TrendingUp" },
  { id: "dom_support", name: "תמיכה בלקוח", color: "#EC4899", icon: "Headphones" },
  { id: "dom_ops", name: "תפעול", color: "#64748B", icon: "Settings" }
];

export const PAWZA_STATUSES = [
  { id: "st_todo", name: "לביצוע", color: "#64748B", badgeBg: "#F1F5F9" },
  { id: "st_in_progress", name: "בתהליך", color: "#2563EB", badgeBg: "#DBEAFE" },
  { id: "st_waiting", name: "ממתין", color: "#D97706", badgeBg: "#FEF3C7" },
  { id: "st_review", name: "לבדיקה", color: "#8B5CF6", badgeBg: "#EDE9FE" },
  { id: "st_completed", name: "הושלם", color: "#16A34A", badgeBg: "#DCFCE7" },
  { id: "st_cancelled", name: "בוטל", color: "#DC2626", badgeBg: "#FEE2E2" }
];

export const PAWZA_PACKAGES = [
  { id: "pkg_basic", name: "בסיסית", price: 250, description: "עד 20 כלבים, ניהול הזמנות בסיסי" },
  { id: "pkg_pro", name: "Pro", price: 350, description: "עד 50 כלבים, סליקת אשראי ו-WhatsApp" },
  { id: "pkg_premium", name: "Premium", price: 500, description: "כלבים ללא הגבלה, דוחות מתקדמים וסנכרון יומנים" },
  { id: "pkg_custom", name: "מותאמת אישית", price: 0, description: "התאמה אישית לרשתות ופנסיונים גדולים" }
];

export const PAWZA_TASKS = [
  // משימות פיתוח
  {
    id: "task_101",
    title: "תיקון בעיית שמירת תוספות להזמנה",
    domain: "פיתוח",
    status: "בתהליך",
    priority: "גבוהה",
    assigneeId: "usr_dev1",
    dueDate: "2026-08-08",
    contactId: "cnt_cust_1",
    contactName: "פנסיון הכלבים של דניאל",
    nextAction: "בדיקת שגיאות ב-Console והעלאת תיקון ל-Staging",
    waitingFor: "",
    progress: 60,
    devDetails: {
      devType: "תיקון באג",
      module: "מודול הזמנות",
      environment: "Staging",
      bugSeverity: "גבוהה",
      gitPr: "https://github.com/pawza/app/pull/142",
      techNotes: "הבעיה נובעת מאי-התאמה במבנה ה-JSON של התוספות בעת שמירה מחדש."
    },
    subtasks: [
      { id: "stk_1", title: "איפוס Cache בשרת", completed: true },
      { id: "stk_2", title: "כתיבת טסט ליחידת תוספות", completed: true },
      { id: "stk_3", title: "בדיקת העלאה ל-Production", completed: false }
    ],
    createdAt: "2026-08-01T10:00:00Z"
  },
  {
    id: "task_102",
    title: "הוספת סנכרון עם Google Calendar",
    domain: "פיתוח",
    status: "לביצוע",
    priority: "רגילה",
    assigneeId: "usr_dev1",
    dueDate: "2026-08-15",
    nextAction: "הגדרת OAuth Client ב-Google Cloud Console",
    waitingFor: "",
    progress: 10,
    devDetails: {
      devType: "פיתוח פיצ'ר",
      module: "אינטגרציות ויומנים",
      environment: "Development",
      bugSeverity: "נמוכה"
    },
    subtasks: [
      { id: "stk_10", title: "יצירת Credentials ב-Google Console", completed: false },
      { id: "stk_11", title: "בניית Webhook לעדכון יומן דו-כיווני", completed: false }
    ],
    createdAt: "2026-08-02T12:00:00Z"
  },
  {
    id: "task_103",
    title: "הוספת סליקה באשראי באמצעות Meshulam",
    domain: "פיתוח",
    status: "ממתין",
    priority: "דחופה",
    assigneeId: "usr_dev1",
    dueDate: "2026-08-10",
    nextAction: "קבלת API Keys מחברת הסליקה",
    waitingFor: "ממתין למשולם (אישור מסוף)",
    progress: 30,
    devDetails: {
      devType: "אינטגרציה",
      module: "תשלומים וסליקה",
      environment: "Staging",
      bugSeverity: "גבוהה"
    },
    subtasks: [],
    createdAt: "2026-08-03T09:00:00Z"
  },

  // משימות עיצוב
  {
    id: "task_104",
    title: "עיצוב מסך כניסה חדש וממותג לפנסיונים",
    domain: "עיצוב",
    status: "בתהליך",
    priority: "רגילה",
    assigneeId: "usr_des1",
    dueDate: "2026-08-09",
    nextAction: "סיום הסקיצה ב-Figma ושליחה לאלינה לאישור",
    waitingFor: "",
    progress: 50,
    designDetails: {
      deliverableType: "עיצוב מסך",
      platform: "Web & Mobile",
      figmaLink: "https://figma.com/file/pawza-login-v2",
      approvalStatus: "ממתין לאישור",
      approver: "אלינה"
    },
    subtasks: [
      { id: "stk_20", title: "עיצוב גרסת Desktop", completed: true },
      { id: "stk_21", title: "עיצוב גרסת Mobile", completed: false }
    ],
    createdAt: "2026-08-02T14:00:00Z"
  },
  {
    id: "task_105",
    title: "הכנת באנר לדף הבית ותמונות לחבילות המחיר",
    domain: "עיצוב",
    status: "הושלם",
    priority: "נמוכה",
    assigneeId: "usr_des1",
    dueDate: "2026-08-04",
    nextAction: "העלאת הקבצים לשרת",
    waitingFor: "",
    progress: 100,
    designDetails: {
      deliverableType: "באנר שיווקי",
      approvalStatus: "אושר"
    },
    subtasks: [],
    createdAt: "2026-07-28T11:00:00Z"
  },

  // משימות תוכן ושיווק
  {
    id: "task_106",
    title: "כתיבת פוסט ב-Facebook וקמפיין לפנסיונים בשרון",
    domain: "שיווק",
    status: "לביצוע",
    priority: "גבוהה",
    assigneeId: "usr_alina",
    dueDate: "2026-08-11",
    nextAction: "ניסוח הפוסט והגדרת קהל יעד מנהלי פנסיונים",
    waitingFor: "",
    progress: 0,
    marketingDetails: {
      channel: "Facebook & Instagram",
      targetAudience: "בעלי פנסיון כלבים וחתולים",
      publishDate: "2026-08-12"
    },
    subtasks: [],
    createdAt: "2026-08-04T08:00:00Z"
  }
];

export const PAWZA_CONTACTS = [
  // לידים (Leads)
  {
    id: "cnt_lead_1",
    contactType: "lead",
    businessName: "פנסיון ביתי ליזה",
    contactPerson: "ליזה כהן",
    phone: "054-1112233",
    email: "liza@pension-liza.co.il",
    address: "כפר סבא",
    leadSource: "פנייה מהאתר",
    leadStatus: "ליד חדש",
    nextAction: "להתקשר ביום ראשון ולהציע הדגמה של PAWZA",
    nextFollowUpDate: "2026-08-06",
    assigneeId: "usr_alina",
    notes: "מתעניינת בניהול עד 15 כלבים וסליקה בנייד.",
    createdAt: "2026-08-04T10:00:00Z"
  },
  {
    id: "cnt_lead_2",
    contactType: "lead",
    businessName: "פנסיון קוקוס (כלבים וחתולים)",
    contactPerson: "אלירן קוקוס",
    phone: "052-4445566",
    email: "eliran@kokos-dogs.co.il",
    address: "ראש העין",
    leadSource: "Facebook",
    leadStatus: "נקבעה הדגמה",
    nextAction: "לבצע הדגמה ב-Zoom ביום שלישי ב-11:00",
    nextFollowUpDate: "2026-08-05",
    assigneeId: "usr_alina",
    notes: "פנסיון גדול עם 35 תאים. מחפש פתרון להודעות WhatsApp אוטומטיות.",
    createdAt: "2026-08-02T15:30:00Z"
  },
  {
    id: "cnt_lead_3",
    contactType: "lead",
    businessName: "פנסיון השרון הירוק",
    contactPerson: "רונן לוי",
    phone: "050-9998877",
    email: "ronen@sharon-pension.co.il",
    address: "רמת השרון",
    leadSource: "המלצה",
    leadStatus: "נשלחה הצעה",
    nextAction: "לחזור לגבי הצעת מחיר לחבילת Pro",
    nextFollowUpDate: "2026-08-07",
    assigneeId: "usr_shahar",
    notes: "קיבל הצעת מחיר מותאמת ב-350 ₪ לחודש.",
    createdAt: "2026-07-30T11:00:00Z"
  },

  // לקוחות (Customers)
  {
    id: "cnt_cust_1",
    contactType: "customer",
    businessName: "פנסיון הכלבים של דניאל",
    contactPerson: "דניאל מזרחי",
    phone: "053-7778899",
    email: "daniel@dogs-daniel.co.il",
    address: "תל אביב",
    customerStatus: "פעיל",
    packageName: "Pro",
    monthlyPrice: 350,
    joiningDate: "2026-06-15",
    nextPaymentDate: "2026-08-15",
    nextAction: "מעקב שימוש חודשי ובדיקת תוספות",
    nextFollowUpDate: "2026-08-15",
    assigneeId: "usr_shahar",
    notes: "לקוח מרוצה מאוד. משלם בהוראת קבע.",
    createdAt: "2026-06-15T09:00:00Z"
  },
  {
    id: "cnt_cust_2",
    contactType: "customer",
    businessName: "פנסיון גאיה וחיות אחרות",
    contactPerson: "גאיה שור",
    phone: "054-2223344",
    email: "gaya@gaia-pets.co.il",
    address: "חיפה",
    customerStatus: "בתהליך הצטרפות",
    packageName: "בסיסית",
    monthlyPrice: 250,
    joiningDate: "2026-08-01",
    nextPaymentDate: "2026-09-01",
    nextAction: "להעלות לוגו עסק ולהגדיר מסוף סליקה",
    nextFollowUpDate: "2026-08-06",
    assigneeId: "usr_alina",
    notes: "עדיין לא סיימה להעלות את כל הכלבים למערכת.",
    createdAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "cnt_cust_3",
    contactType: "customer",
    businessName: "פנסיון פאפי לאב (Puppy Love)",
    contactPerson: "יובל גבאי",
    phone: "050-3334455",
    email: "yuval@puppylove.co.il",
    address: "ראשון לציון",
    customerStatus: "בתקופת ניסיון",
    packageName: "Premium",
    monthlyPrice: 500,
    joiningDate: "2026-07-25",
    nextPaymentDate: "2026-08-25",
    nextAction: "הדרכת צוות ב-Zoom על מודול הדוחות",
    nextFollowUpDate: "2026-08-08",
    assigneeId: "usr_alina",
    notes: "תקופת ניסיון ל-14 יום מסתיימת בקרוב.",
    createdAt: "2026-07-25T14:00:00Z"
  }
];

export const PAWZA_ACTIVITIES = [
  {
    id: "act_1",
    contactId: "cnt_lead_1",
    activityType: "whatsapp",
    description: "נשלחה הודעת WhatsApp ראשונית עם הסבר קצר על מערכת PAWZA",
    userId: "usr_alina",
    createdAt: "2026-08-04T10:15:00Z"
  },
  {
    id: "act_2",
    contactId: "cnt_lead_2",
    activityType: "call",
    description: "שיחת היכרות טלפונית. אלירן התרשם מניהול התיוגים והזמנות הכלבים.",
    userId: "usr_alina",
    createdAt: "2026-08-03T11:00:00Z"
  },
  {
    id: "act_3",
    contactId: "cnt_cust_2",
    activityType: "status_change",
    description: "הומר מליד ללקוח - חבילה בסיסית (250 ₪)",
    userId: "usr_shahar",
    createdAt: "2026-08-01T08:00:00Z"
  }
];
