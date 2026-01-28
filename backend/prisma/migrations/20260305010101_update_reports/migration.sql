-- RedefineTable
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "preset" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "rangeStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rangeEnd" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("id", "fileName", "preset", "createdAt", "createdById", "rangeStart", "rangeEnd", "filePath", "mimeType")
SELECT "id", "name", "periodType", "createdAt", NULL, "createdAt", "createdAt", "filePath", 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
