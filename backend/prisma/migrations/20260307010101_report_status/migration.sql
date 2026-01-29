-- RedefineTable
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT,
    "preset" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "rangeStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rangeEnd" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filePath" TEXT,
    "mimeType" TEXT,
    CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("id", "fileName", "preset", "status", "errorMessage", "createdAt", "createdById", "rangeStart", "rangeEnd", "filePath", "mimeType")
SELECT "id", "fileName", "preset", 'READY', NULL, "createdAt", "createdById", "rangeStart", "rangeEnd", "filePath", "mimeType" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
