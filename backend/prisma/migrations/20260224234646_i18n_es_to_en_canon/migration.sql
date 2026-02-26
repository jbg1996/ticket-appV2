-- Canonical i18n normalization from ES labels to EN values.

UPDATE "Status" SET "name" = 'NEW' WHERE "name" IN ('Nuevo', 'NUEVO');
UPDATE "Status" SET "name" = 'IN_PROGRESS' WHERE "name" IN ('En progreso', 'EN_PROGRESO');
UPDATE "Status" SET "name" = 'ON_HOLD' WHERE "name" IN ('En espera', 'EN_ESPERA');
UPDATE "Status" SET "name" = 'RESOLVED' WHERE "name" IN ('Resuelto', 'RESUELTO');
UPDATE "Status" SET "name" = 'CLOSED' WHERE "name" IN ('Cerrado', 'CERRADO');

UPDATE "Priority" SET "name" = 'LOW' WHERE "name" IN ('Baja', 'BAJA');
UPDATE "Priority" SET "name" = 'MEDIUM' WHERE "name" IN ('Media', 'MEDIA');
UPDATE "Priority" SET "name" = 'HIGH' WHERE "name" IN ('Alta', 'ALTA');
UPDATE "Priority" SET "name" = 'CRITICAL' WHERE "name" IN ('Crítica', 'CRITICA', 'CRÍTICA');

UPDATE "TicketType" SET "name" = 'REQUEST' WHERE "name" IN ('PETICIÓN', 'PETICION');
UPDATE "TicketType" SET "name" = 'INCIDENT' WHERE "name" = 'INCIDENCIA';
UPDATE "TicketType" SET "name" = 'ACCESS' WHERE "name" = 'ACCESO';
UPDATE "TicketType" SET "name" = 'OTHER' WHERE "name" = 'OTROS';

UPDATE "UserType" SET "name" = 'Technician' WHERE "name" IN ('Técnico', 'Tecnico');
