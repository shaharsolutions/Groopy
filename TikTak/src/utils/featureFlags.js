/**
 * Central Feature Flag & Version Management for TikTak
 * 
 * Allows per-organization feature toggling, progressive rollouts (v2 vs legacy),
 * and dynamic terminology resolution without code fragmentation.
 */

export const APP_VERSIONS = {
  LEGACY: 'legacy',
  V2: 'v2'
};

export const DEFAULT_APP_VERSION = APP_VERSIONS.V2;

/**
 * Returns feature flags and resolved terminology for an organization.
 * 
 * @param {object} settingsOrOrg - The settings object or organization object.
 * @returns {object} Feature flag booleans and terms dictionary.
 */
export function getFeatureFlags(settingsOrOrg) {
  const version = settingsOrOrg?.appVersion || settingsOrOrg?.version || (
    (settingsOrOrg?.organizationId === 'groopy' || settingsOrOrg?.id === 'groopy')
      ? APP_VERSIONS.LEGACY
      : DEFAULT_APP_VERSION
  );
  const isLegacy = version === APP_VERSIONS.LEGACY;

  return {
    version: isLegacy ? APP_VERSIONS.LEGACY : APP_VERSIONS.V2,
    isLegacy,
    isV2: !isLegacy,

    // Feature Toggles
    enableCustomBoards: !isLegacy,
    enableCompactCreateModal: !isLegacy,
    useProjectTerminology: !isLegacy,
    enableFieldExclusion: !isLegacy,

    // Centralized Terminology
    terms: isLegacy ? {
      item: 'עבודה',
      itemDefinite: 'העבודה',
      items: 'עבודות',
      itemsDefinite: 'העבודות',
      createItem: 'יצירת עבודה',
      createItemButton: 'יצירת עבודה',
      editItem: 'עריכת עבודה',
      deleteItem: 'מחיקת עבודה',
      itemDetails: 'פרטי עבודה',
      itemDescription: 'תיאור העבודה',
      itemStatus: 'סטטוס עבודה',
      itemType: 'סוג עבודה',
      itemTypes: 'סוגי עבודה',
      itemComments: 'הערות ועדכוני עבודה',
      workSettings: 'הגדרות עבודה',
      projectSettings: 'הגדרות עבודה',
      boardManagement: 'ניהול לוחות',
      searchItemPlaceholder: 'חיפוש עבודה...',
      noDescription: 'אין פירוט מדויק לעבודה זו. לחצי להוספת תיאור.',
      noDescriptionViewer: 'אין פירוט מדויק לעבודה זו.',
      deleteConfirmTitle: 'מחיקת עבודה',
      deleteConfirmBody: 'האם את בטוחה שברצונך למחוק את העבודה הזו?',
      deleteConfirmSubtext: 'העבודה תועבר לפח האשפה למשך 30 יום. בתקופה זו יהיה אפשר לשחזר אותה יחד עם ההערות והתגובות.',
      createdActivity: 'נוצרה עבודה חדשה',
      updatedActivity: 'עודכנו פרטי עבודה',
      deletedActivity: 'העבודה הועברה לפח האשפה',
      restoredActivity: 'העבודה שוחזרה מפח האשפה',
      archivedActivity: 'העבודה הועברה לארכיון',
      workOrderRubric: 'הזמנת עבודה',
      planogramRubric: 'פלנוגרמה',
      filesSectionTitle: 'הזמנת עבודה ופלנוגרמה'
    } : {
      item: 'פרויקט',
      itemDefinite: 'הפרויקט',
      items: 'פרויקטים',
      itemsDefinite: 'הפרויקטים',
      createItem: 'יצירת פרויקט',
      createItemButton: '✨ יצירת פרויקט',
      editItem: 'עריכת פרויקט',
      deleteItem: 'מחיקת פרויקט',
      itemDetails: 'פרטי פרויקט',
      itemDescription: 'תיאור הפרויקט',
      itemStatus: 'סטטוס פרויקט',
      itemType: 'סוג פרויקט',
      itemTypes: 'סוגי פרויקטים',
      itemComments: 'הערות ועדכוני פרויקט',
      workSettings: 'הגדרות פרויקטים',
      projectSettings: 'הגדרות פרויקטים',
      boardManagement: 'לוחות פרויקטים',
      searchItemPlaceholder: 'חיפוש פרויקט...',
      noDescription: 'אין פירוט מדויק לפרויקט זה. לחצי להוספת תיאור.',
      noDescriptionViewer: 'אין פירוט מדויק לפרויקט זה.',
      deleteConfirmTitle: 'מחיקת פרויקט',
      deleteConfirmBody: 'האם את בטוחה שברצונך למחוק את הפרויקט הזה?',
      deleteConfirmSubtext: 'הפרויקט יועבר לפח האשפה למשך 30 יום. בתקופה זו יהיה אפשר לשחזר אותו יחד עם ההערות והתגובות.',
      createdActivity: 'נוצר פרויקט חדש',
      updatedActivity: 'עודכנו פרטי פרויקט',
      deletedActivity: 'הפרויקט הועבר לפח האשפה',
      restoredActivity: 'הפרויקט שוחזר מפח האשפה',
      archivedActivity: 'הפרויקט הועבר לארכיון',
      workOrderRubric: 'הזמנת עבודה',
      planogramRubric: 'פלנוגרמה',
      filesSectionTitle: 'הזמנת עבודה ופלנוגרמה'
    }
  };
}
