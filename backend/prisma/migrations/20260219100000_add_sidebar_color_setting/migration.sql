INSERT INTO "Setting" ("key", "value", "updatedAt")
VALUES ('SIDEBAR_COLOR', '#0f172a', CURRENT_TIMESTAMP)
ON CONFLICT("key") DO NOTHING;
