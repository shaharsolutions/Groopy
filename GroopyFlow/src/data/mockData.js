/**
 * Groopy Work Manager - Mock Seed Data
 * 
 * Developer Note: This file simulates the initial state of the database.
 * To simplify Supabase/Firebase migration, tasks and comments are kept as separate collections,
 * referencing each other via `jobId`.
 */

export const INITIAL_TASKS = [
  {
    id: "task-1",
    jobNumber: "GP-1001",
    title: "אריזת קרטון סדרת כוסות תרמיות",
    description: "עיצוב מחדש של אריזת קרטון לכוסות תרמיות מדגם T-500. יש לבצע התאמה למידות שקיבלנו מהמפעל בסין ולהטמיע את לוגו המותג החדש בלבן.",
    workType: "אריזה",
    storeName: "סניף הדגל תל אביב",
    supplierName: "Dongguan Packaging Ltd.",
    contactPerson: "Mr. Wong",
    importManager: "אבי כהן",
    status: "ממתין לספק בסין",
    priority: "גבוהה",
    deadline: "2026-06-25",
    driveLink: "https://drive.google.com/drive/folders/groopy-thermal-cups",
    internalNotes: "שימו לב: הספק בסין ביקש קבצי וקטור מפורקים בפורמט PDF/X-1a. יש לוודא שכל הגופנים מומרים לנתיבים (Curves / Outlines).",
    createdAt: "2026-06-10T09:00:00.000Z",
    updatedAt: "2026-06-11T08:30:00.000Z"
  },
  {
    id: "task-2",
    jobNumber: "GP-1002",
    title: "מדבקות שקופות לבקבוקי זכוכית 750 מ״ל",
    description: "גרפיקה למדבקת מוצר לבקבוק זכוכית לשמן זית. כולל לוח רכיבים תזונתיים בעברית, ברקוד, וסימוני כשרות מעודכנים.",
    workType: "מדבקה",
    storeName: "סניף שרונה",
    supplierName: "Guangzhou Label Print",
    contactPerson: "Ms. Chen",
    importManager: "מיכל לוי",
    status: "בטיפול",
    priority: "רגילה",
    deadline: "2026-06-18",
    driveLink: "https://drive.google.com/drive/folders/groopy-oil-labels",
    internalNotes: "מיכל לוי ביקשה לוודא שלחץ ההדפסה של צבע הזהב (Gold Foil) מוגדר כשכבה נפרדת (Spot Color) בשם Gold-Foil.",
    createdAt: "2026-06-09T11:00:00.000Z",
    updatedAt: "2026-06-11T10:15:00.000Z"
  },
  {
    id: "task-3",
    jobNumber: "GP-1003",
    title: "קטלוג מוצרי קיץ 2026",
    description: "עימוד וגרפיקה לקטלוג הדו-שנתי בגודל A4, סה״כ 24 עמודים. כולל תמונות מוצרים, מפרטים טכניים ומחירים מומלצים לצרכן.",
    workType: "קטלוג",
    storeName: "כלל החנויות",
    supplierName: "דפוס איכות מקומי",
    contactPerson: "יוסי לוי",
    importManager: "דוד מנהל רכש",
    status: "חדש",
    priority: "דחופה",
    deadline: "2026-06-15",
    driveLink: "",
    internalNotes: "פרויקט דחוף ביותר לבקשת מנהל החברה. יש להשלים סקיצה ראשונית של 4 עמודים ראשונים לצורך אישור הקונספט על ידי המנכ״ל.",
    createdAt: "2026-06-11T08:00:00.000Z",
    updatedAt: "2026-06-11T08:00:00.000Z"
  }
];

export const INITIAL_COMMENTS = [
  {
    id: "comment-1",
    jobId: "task-1",
    authorName: "אבי כהן (מנהל יבוא)",
    text: "העברתי לספק את פריסת הקרטון המעודכנת. הוא הבטיח להחזיר דוגמת הדפסה דיגיטלית בתוך יומיים.",
    createdAt: "2026-06-11T08:15:00.000Z"
  },
  {
    id: "comment-2",
    jobId: "task-1",
    authorName: "Mr. Wong (Dongguan Packaging)",
    text: "Please send vector outlines for the logo. The current PDF image quality is too low for screen printing.",
    createdAt: "2026-06-11T08:30:00.000Z"
  },
  {
    id: "comment-3",
    jobId: "task-2",
    authorName: "מיכל לוי (מנהלת מוצר)",
    text: "נא לבדוק את הגודל של ברקוד המינימום, כדי שלא יהיו בעיות בסריקה בקופות.",
    createdAt: "2026-06-11T10:15:00.000Z"
  }
];
