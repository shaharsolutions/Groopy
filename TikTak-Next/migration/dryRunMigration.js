/**
 * TikTak Next V2 - Dry Run Migration Script
 * SAFEGUARD: This script performs purely in-memory validation and simulation.
 * It DOES NOT write or modify any data in Production.
 */

import fs from 'fs';
import path from 'path';

export function runDryRun(sampleSourceData) {
  const auditReport = {
    timestamp: new Date().toISOString(),
    mode: "DRY_RUN_READONLY_SIMULATION",
    sourceRecordsCount: sampleSourceData.length,
    validRecords: [],
    invalidRecords: [],
    duplicateRecords: [],
    logs: []
  };

  auditReport.logs.push("Starting TikTak Dry-Run Migration Simulation...");

  const titleSet = new Set();

  sampleSourceData.forEach((item, index) => {
    // 1. Validation
    if (!item.title && !item.taskName) {
      auditReport.invalidRecords.push({ index, item, reason: "Missing task title" });
      auditReport.logs.push(`⚠️ Record #${index}: Missing title. Marked invalid.`);
      return;
    }

    const title = item.title || item.taskName;

    // 2. Duplicate Check
    const dupKey = `${title}_${item.projectId || item.branch}`;
    if (titleSet.has(dupKey)) {
      auditReport.duplicateRecords.push({ index, item, dupKey });
      auditReport.logs.push(`⚠️ Record #${index}: Duplicate detected for key '${dupKey}'`);
      return;
    }
    titleSet.add(dupKey);

    // 3. Mapping
    const mapped = {
      id: `migrated_${index}_${Date.now()}`,
      title: title.trim(),
      projectId: item.projectId || "proj_101",
      supplierId: item.supplierId || "sup_1",
      status: item.status || "חדש",
      priority: item.priority || "בינונית",
      dueDate: item.dueDate || new Date().toISOString().split('T')[0],
      hasPlanogram: Boolean(item.planogramUrl || item.pdfUrl),
      planogramUrl: item.planogramUrl || item.pdfUrl || null,
      subtasks: Array.isArray(item.subTasks) 
        ? item.subTasks.map((text, i) => ({ id: `stk_${i}`, text, completed: false }))
        : []
    };

    auditReport.validRecords.push(mapped);
  });

  auditReport.logs.push(`✅ Dry-Run Finished. Valid: ${auditReport.validRecords.length}, Invalid: ${auditReport.invalidRecords.length}, Duplicates: ${auditReport.duplicateRecords.length}`);
  return auditReport;
}
