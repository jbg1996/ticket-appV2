/*
  Warnings:

  - The primary key for the `Attachment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Attachment` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `uploaderId` on the `Attachment` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `InfoRequest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `InfoRequest` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `requesterTechId` on the `InfoRequest` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `InfoResponse` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `InfoResponse` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `infoRequestId` on the `InfoResponse` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `responderId` on the `InfoResponse` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Priority` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Priority` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Report` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `createdById` on the `Report` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `id` on the `Report` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Setting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Setting` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Status` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Status` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `assignedToId` on the `Ticket` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `createdById` on the `Ticket` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `priorityId` on the `Ticket` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `statusId` on the `Ticket` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `ticketTypeId` on the `Ticket` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `updatedById` on the `Ticket` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `TicketHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `actorId` on the `TicketHistory` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `id` on the `TicketHistory` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `TicketType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `defaultPriorityId` on the `TicketType` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `id` on the `TicketType` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `userTypeId` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `UserType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `UserType` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticketId" INTEGER NOT NULL,
    "uploaderId" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Attachment" ("id", "mimeType", "originalName", "sizeBytes", "storagePath", "ticketId", "uploadedAt", "uploaderId") SELECT "id", "mimeType", "originalName", "sizeBytes", "storagePath", "ticketId", "uploadedAt", "uploaderId" FROM "Attachment";
DROP TABLE "Attachment";
ALTER TABLE "new_Attachment" RENAME TO "Attachment";
CREATE TABLE "new_InfoRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticketId" INTEGER NOT NULL,
    "requesterTechId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "requestedFields" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "InfoRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InfoRequest_requesterTechId_fkey" FOREIGN KEY ("requesterTechId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InfoRequest" ("closedAt", "createdAt", "id", "message", "requestedFields", "requesterTechId", "status", "ticketId") SELECT "closedAt", "createdAt", "id", "message", "requestedFields", "requesterTechId", "status", "ticketId" FROM "InfoRequest";
DROP TABLE "InfoRequest";
ALTER TABLE "new_InfoRequest" RENAME TO "InfoRequest";
CREATE TABLE "new_InfoResponse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "infoRequestId" INTEGER NOT NULL,
    "responderId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InfoResponse_infoRequestId_fkey" FOREIGN KEY ("infoRequestId") REFERENCES "InfoRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InfoResponse_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InfoResponse" ("createdAt", "id", "infoRequestId", "message", "responderId") SELECT "createdAt", "id", "infoRequestId", "message", "responderId" FROM "InfoResponse";
DROP TABLE "InfoResponse";
ALTER TABLE "new_InfoResponse" RENAME TO "InfoResponse";
CREATE TABLE "new_Priority" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL
);
INSERT INTO "new_Priority" ("color", "id", "name") SELECT "color", "id", "name" FROM "Priority";
DROP TABLE "Priority";
ALTER TABLE "new_Priority" RENAME TO "Priority";
CREATE TABLE "new_Report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName" TEXT,
    "preset" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,
    "rangeStart" DATETIME NOT NULL,
    "rangeEnd" DATETIME NOT NULL,
    "filePath" TEXT,
    "mimeType" TEXT,
    CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("createdAt", "createdById", "errorMessage", "fileName", "filePath", "id", "mimeType", "preset", "rangeEnd", "rangeStart", "status") SELECT "createdAt", "createdById", "errorMessage", "fileName", "filePath", "id", "mimeType", "preset", "rangeEnd", "rangeStart", "status" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE TABLE "new_Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Setting" ("id", "key", "updatedAt", "value") SELECT "id", "key", "updatedAt", "value" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");
CREATE TABLE "new_Status" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL
);
INSERT INTO "new_Status" ("id", "name", "sortOrder") SELECT "id", "name", "sortOrder" FROM "Status";
DROP TABLE "Status";
ALTER TABLE "new_Status" RENAME TO "Status";
CREATE TABLE "new_Ticket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "ticketTypeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priorityId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "assignedToId" INTEGER,
    "updatedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "Ticket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ticket_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "Priority" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ticket_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("assignedToId", "code", "createdAt", "createdById", "description", "id", "priorityId", "resolvedAt", "statusId", "ticketTypeId", "title", "updatedAt", "updatedById") SELECT "assignedToId", "code", "createdAt", "createdById", "description", "id", "priorityId", "resolvedAt", "statusId", "ticketTypeId", "title", "updatedAt", "updatedById" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
CREATE UNIQUE INDEX "Ticket_code_key" ON "Ticket"("code");
CREATE TABLE "new_TicketHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticketId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "message" TEXT,
    "dataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TicketHistory" ("actorId", "createdAt", "dataJson", "eventType", "id", "message", "ticketId") SELECT "actorId", "createdAt", "dataJson", "eventType", "id", "message", "ticketId" FROM "TicketHistory";
DROP TABLE "TicketHistory";
ALTER TABLE "new_TicketHistory" RENAME TO "TicketHistory";
CREATE TABLE "new_TicketType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultPriorityId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "TicketType_defaultPriorityId_fkey" FOREIGN KEY ("defaultPriorityId") REFERENCES "Priority" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TicketType" ("defaultPriorityId", "description", "id", "isActive", "name") SELECT "defaultPriorityId", "description", "id", "isActive", "name" FROM "TicketType";
DROP TABLE "TicketType";
ALTER TABLE "new_TicketType" RENAME TO "TicketType";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "imageUrl" TEXT,
    "userTypeId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_userTypeId_fkey" FOREIGN KEY ("userTypeId") REFERENCES "UserType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "firstName", "id", "imageUrl", "isActive", "lastName", "passwordHash", "phone", "updatedAt", "userTypeId") SELECT "createdAt", "email", "firstName", "id", "imageUrl", "isActive", "lastName", "passwordHash", "phone", "updatedAt", "userTypeId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_UserType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL
);
INSERT INTO "new_UserType" ("code", "id", "name") SELECT "code", "id", "name" FROM "UserType";
DROP TABLE "UserType";
ALTER TABLE "new_UserType" RENAME TO "UserType";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
