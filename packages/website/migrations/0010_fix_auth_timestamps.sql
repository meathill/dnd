PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

CREATE TABLE user_new (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  updatedAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer))
);

INSERT INTO user_new (id, name, email, emailVerified, image, createdAt, updatedAt)
SELECT
  id,
  name,
  email,
  emailVerified,
  image,
  CASE
    WHEN typeof(createdAt) = 'integer' THEN createdAt
    WHEN createdAt IS NULL OR createdAt = '' THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    WHEN strftime('%s', createdAt) IS NULL THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    ELSE CAST(strftime('%s', createdAt) AS INTEGER) * 1000
  END,
  CASE
    WHEN typeof(updatedAt) = 'integer' THEN updatedAt
    WHEN updatedAt IS NULL OR updatedAt = '' THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    WHEN strftime('%s', updatedAt) IS NULL THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    ELSE CAST(strftime('%s', updatedAt) AS INTEGER) * 1000
  END
FROM user;

DROP TABLE user;
ALTER TABLE user_new RENAME TO user;

CREATE TABLE session_new (
  id TEXT PRIMARY KEY,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  updatedAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

INSERT INTO session_new (id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId)
SELECT
  id,
  CASE
    WHEN typeof(expiresAt) = 'integer' THEN expiresAt
    WHEN expiresAt IS NULL OR expiresAt = '' THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    WHEN strftime('%s', expiresAt) IS NULL THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    ELSE CAST(strftime('%s', expiresAt) AS INTEGER) * 1000
  END,
  token,
  CASE
    WHEN typeof(createdAt) = 'integer' THEN createdAt
    WHEN createdAt IS NULL OR createdAt = '' THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    WHEN strftime('%s', createdAt) IS NULL THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    ELSE CAST(strftime('%s', createdAt) AS INTEGER) * 1000
  END,
  CASE
    WHEN typeof(updatedAt) = 'integer' THEN updatedAt
    WHEN updatedAt IS NULL OR updatedAt = '' THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    WHEN strftime('%s', updatedAt) IS NULL THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    ELSE CAST(strftime('%s', updatedAt) AS INTEGER) * 1000
  END,
  ipAddress,
  userAgent,
  userId
FROM session;

DROP TABLE session;
ALTER TABLE session_new RENAME TO session;

CREATE TABLE account_new (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  scope TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  password TEXT,
  createdAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  updatedAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

INSERT INTO account_new (
  id,
  accountId,
  providerId,
  userId,
  accessToken,
  refreshToken,
  idToken,
  scope,
  accessTokenExpiresAt,
  refreshTokenExpiresAt,
  password,
  createdAt,
  updatedAt
)
SELECT
  id,
  accountId,
  providerId,
  userId,
  accessToken,
  refreshToken,
  idToken,
  scope,
  CASE
    WHEN accessTokenExpiresAt IS NULL OR accessTokenExpiresAt = '' THEN NULL
    WHEN typeof(accessTokenExpiresAt) = 'integer' THEN accessTokenExpiresAt
    WHEN strftime('%s', accessTokenExpiresAt) IS NULL THEN NULL
    ELSE CAST(strftime('%s', accessTokenExpiresAt) AS INTEGER) * 1000
  END,
  CASE
    WHEN refreshTokenExpiresAt IS NULL OR refreshTokenExpiresAt = '' THEN NULL
    WHEN typeof(refreshTokenExpiresAt) = 'integer' THEN refreshTokenExpiresAt
    WHEN strftime('%s', refreshTokenExpiresAt) IS NULL THEN NULL
    ELSE CAST(strftime('%s', refreshTokenExpiresAt) AS INTEGER) * 1000
  END,
  password,
  CASE
    WHEN typeof(createdAt) = 'integer' THEN createdAt
    WHEN createdAt IS NULL OR createdAt = '' THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    WHEN strftime('%s', createdAt) IS NULL THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    ELSE CAST(strftime('%s', createdAt) AS INTEGER) * 1000
  END,
  CASE
    WHEN typeof(updatedAt) = 'integer' THEN updatedAt
    WHEN updatedAt IS NULL OR updatedAt = '' THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    WHEN strftime('%s', updatedAt) IS NULL THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    ELSE CAST(strftime('%s', updatedAt) AS INTEGER) * 1000
  END
FROM account;

DROP TABLE account;
ALTER TABLE account_new RENAME TO account;

CREATE TABLE verification_new (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  updatedAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer))
);

INSERT INTO verification_new (id, identifier, value, expiresAt, createdAt, updatedAt)
SELECT
  id,
  identifier,
  value,
  CASE
    WHEN typeof(expiresAt) = 'integer' THEN expiresAt
    WHEN expiresAt IS NULL OR expiresAt = '' THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    WHEN strftime('%s', expiresAt) IS NULL THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    ELSE CAST(strftime('%s', expiresAt) AS INTEGER) * 1000
  END,
  CASE
    WHEN typeof(createdAt) = 'integer' THEN createdAt
    WHEN createdAt IS NULL OR createdAt = '' THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    WHEN strftime('%s', createdAt) IS NULL THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    ELSE CAST(strftime('%s', createdAt) AS INTEGER) * 1000
  END,
  CASE
    WHEN typeof(updatedAt) = 'integer' THEN updatedAt
    WHEN updatedAt IS NULL OR updatedAt = '' THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    WHEN strftime('%s', updatedAt) IS NULL THEN (cast((julianday('now') - 2440587.5) * 86400000 as integer))
    ELSE CAST(strftime('%s', updatedAt) AS INTEGER) * 1000
  END
FROM verification;

DROP TABLE verification;
ALTER TABLE verification_new RENAME TO verification;

CREATE INDEX idx_session_user ON session(userId);
CREATE INDEX idx_account_user ON account(userId);
CREATE INDEX idx_verification_identifier ON verification(identifier);

COMMIT;
PRAGMA foreign_keys = ON;
