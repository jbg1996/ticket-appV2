ALTER TABLE "Status" ADD COLUMN "code" TEXT;
ALTER TABLE "Status" ADD COLUMN "label" TEXT;
ALTER TABLE "Priority" ADD COLUMN "code" TEXT;
ALTER TABLE "Priority" ADD COLUMN "label" TEXT;
ALTER TABLE "TicketType" ADD COLUMN "code" TEXT;
ALTER TABLE "TicketType" ADD COLUMN "label" TEXT;

UPDATE "Status"
SET "code" = CASE
  WHEN lower(replace("name", '_', '')) = 'inprogress' THEN 'inProgress'
  WHEN lower(replace("name", '_', '')) = 'onhold' THEN 'onHold'
  ELSE lower("name")
END
WHERE "code" IS NULL;

UPDATE "Priority"
SET "code" = lower("name")
WHERE "code" IS NULL;

UPDATE "TicketType"
SET "code" = lower("name")
WHERE "code" IS NULL;

UPDATE "Status"
SET "label" = trim(replace(replace("code", 'inProgress', 'In Progress'), 'onHold', 'On Hold'))
WHERE "label" IS NULL;
UPDATE "Priority"
SET "label" = upper(substr("code", 1, 1)) || substr("code", 2)
WHERE "label" IS NULL;
UPDATE "TicketType"
SET "label" = upper(substr("code", 1, 1)) || substr("code", 2)
WHERE "label" IS NULL;

UPDATE "Status" SET "name" = "code";
UPDATE "Priority" SET "name" = "code";
UPDATE "TicketType" SET "name" = "code";

CREATE UNIQUE INDEX "Status_code_key" ON "Status"("code");
CREATE UNIQUE INDEX "Priority_code_key" ON "Priority"("code");
CREATE UNIQUE INDEX "TicketType_code_key" ON "TicketType"("code");
