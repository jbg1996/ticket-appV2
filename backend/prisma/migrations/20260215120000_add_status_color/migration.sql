-- Add status color to support UI status indicators.
ALTER TABLE "Status" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#9CA3AF';
