# מסמך מיפוי נתונים: TikTak v1 (Production) ➔ TikTak Next v2

מסמך זה מפרט את ה-Mapping הנדרש עבור מעבר נתונים עתידי ממערכת TikTak v1 הישנה למערכת **TikTak Next v2** החדשה.

> [!CAUTION]
> **הנחיית בטיחות קריטית:** מסמך וסקריפט המיפוי מיועדים לבדיקה תיאורטית בלבד (Dry-Run). **אין להריץ כותבים ב-Production.**

---

## 1. מיפוי טבלת משימות (Tasks Mapping)

| שדה ב-TikTak v1 (Firestore) | שדה מותאם ב-TikTak Next v2 | סוג נתון | כלל המרה / הערות |
| :--- | :--- | :--- | :--- |
| `taskName` / `title` | `title` | String | חובה, ניקוי רווחים מיותרים |
| `project` / `branch` | `projectId` | String (FK) | המרת שם פרויקט מופשט ל-ID ייחודי ב-Next |
| `supplier` / `supplierName` | `supplierId` | String (FK) | התאמה לפי טבלת ספקים |
| `status` | `status` | String Enum | מיפוי סטטוסים ישנים לסטנדרט הסטטוסים ב-Next |
| `priority` | `priority` | String Enum | 'נמוכה', 'בינונית', 'גבוהה', 'דחופה' |
| `dueDate` / `date` | `dueDate` | ISO Date String | המרה לפורמט YYYY-MM-DD |
| `planogram` / `pdfUrl` | `planogramUrl` + `hasPlanogram` | String / Boolean | חילוץ קישור ואישור קיום פלנוגרמה |
| `subTasks` (מערך מחרוזות) | `subtasks` (מערך אובייקטים) | Array<{ id, text, completed }> | המרה למבנה אובייקט עם מזהה וסטטוס |

---

## 2. מיפוי טבלת ספקים (Suppliers Mapping)

| שדה ב-TikTak v1 | שדה ב-TikTak Next v2 | סוג נתון | כלל המרה / הערות |
| :--- | :--- | :--- | :--- |
| `name` | `name` | String | שם החברה / ספק |
| `phone` / `mobile` | `phone` | String | פורמט טלפון ישראלי תקין |
| `email` | `email` | String | אימות תקינות כתובת מייל |
| `category` | `category` | String | שיוך תחום אחריות |

---

## 3. מיפוי טבלת משתמשים (Users Mapping)

| שדה ב-TikTak v1 | שדה ב-TikTak Next v2 | סוג נתון | כלל המרה / הערות |
| :--- | :--- | :--- | :--- |
| `email` | `email` | String | Unique Key |
| `displayName` | `name` | String | שם מלא |
| `role` ('admin', 'user') | `role` ('admin', 'supplier', 'external') | String Enum | הרחבת תפקידים |

---

## 4. בדיקות כפילויות ואימות נתונים (Integrity Checks)
1. **Duplicate Key Check:** וידוא שלא קיימות כפילויות לפי `title` + `projectId` + `dueDate`.
2. **Missing References:** זיהוי משימות שמשויכות לספק או פרויקט שאינו קיים.
3. **Rollback Generation:** כל פעולת העברה יוצרת קובץ `backup_before_migration.json` המאפשר שחזור מיידי.
