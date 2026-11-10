CREATE TABLE accounts (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', status TEXT NOT NULL DEFAULT 'active', profile TEXT NOT NULL DEFAULT '{}', resume_key TEXT, resume_name TEXT, resume_text TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX accounts_email_idx ON accounts(email);
--> statement-breakpoint
CREATE TABLE audit_log (id TEXT PRIMARY KEY NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL);
