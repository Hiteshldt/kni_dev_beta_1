-- Email + password login for admin/staff users (admins are power users; OTP is
-- for the farmer/buyer/driver apps). Columns are nullable so existing phone-OTP
-- accounts are unaffected.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email         text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- Case-insensitive unique email (only enforced when an email is set).
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users (lower(email)) WHERE email IS NOT NULL;
