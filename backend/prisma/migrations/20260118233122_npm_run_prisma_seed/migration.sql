-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Attachment" ("id", "mimeType", "originalName", "sizeBytes", "storagePath", "ticketId", "uploadedAt", "uploaderId") SELECT "id", "mimeType", "originalName", "sizeBytes", "storagePath", "ticketId", "uploadedAt", "uploaderId" FROM "Attachment";
DROP TABLE "Attachment";
ALTER TABLE "new_Attachment" RENAME TO "Attachment";
CREATE TABLE "new_InfoRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "requesterTechId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "requestedFields" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "InfoRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InfoRequest_requesterTechId_fkey" FOREIGN KEY ("requesterTechId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InfoRequest" ("closedAt", "createdAt", "id", "message", "requestedFields", "requesterTechId", "status", "ticketId") SELECT "closedAt", "createdAt", "id", "message", "requestedFields", "requesterTechId", "status", "ticketId" FROM "InfoRequest";
DROP TABLE "InfoRequest";
ALTER TABLE "new_InfoRequest" RENAME TO "InfoRequest";
CREATE TABLE "new_InfoResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "infoRequestId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InfoResponse_infoRequestId_fkey" FOREIGN KEY ("infoRequestId") REFERENCES "InfoRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InfoResponse_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InfoResponse" ("createdAt", "id", "infoRequestId", "message", "responderId") SELECT "createdAt", "id", "infoRequestId", "message", "responderId" FROM "InfoResponse";
DROP TABLE "InfoResponse";
ALTER TABLE "new_InfoResponse" RENAME TO "InfoResponse";
CREATE TABLE "new_TicketHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "message" TEXT,
    "dataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TicketHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TicketHistory" ("actorId", "createdAt", "dataJson", "eventType", "id", "message", "ticketId") SELECT "actorId", "createdAt", "dataJson", "eventType", "id", "message", "ticketId" FROM "TicketHistory";
DROP TABLE "TicketHistory";
ALTER TABLE "new_TicketHistory" RENAME TO "TicketHistory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
