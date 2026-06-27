-- Admin control: suspend/block a user. Blocked users cannot obtain new tokens
-- (enforced at OTP verify + admin login).
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;
