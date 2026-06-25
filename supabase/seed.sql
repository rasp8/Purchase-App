-- =============================================================
-- Seed: test@purchase-app.local with sample profile + purchase data
-- Safe to re-run (ON CONFLICT DO NOTHING throughout)
-- OTP emails are available in local Inbucket after db reset
-- =============================================================

-- Fixed UUIDs for deterministic local testing
-- user_id:    b1c2d3e4-1234-5678-abcd-000000000001
-- profile_id: b1c2d3e4-1234-5678-abcd-000000000002

INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b1c2d3e4-1234-5678-abcd-000000000001',
  'authenticated', 'authenticated',
  'test@app.local',
  '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, now(), now(),
  '', '', '', '', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at, created_at, updated_at
) VALUES (
  'b1c2d3e4-1234-5678-abcd-000000000001',
  'b1c2d3e4-1234-5678-abcd-000000000001',
  'test@app.local',
  '{"sub":"b1c2d3e4-1234-5678-abcd-000000000001","email":"test@app.local","email_verified":true,"phone_verified":false}'::jsonb,
  'email',
  now(), now(), now()
) ON CONFLICT (provider, provider_id) DO NOTHING;

INSERT INTO public."Profile" (id, user_id, first_name, last_name, email, created_at)
VALUES (
  'b1c2d3e4-1234-5678-abcd-000000000002',
  'b1c2d3e4-1234-5678-abcd-000000000001',
  'Purchase',
  'Tester',
  'test@app.local',
  now()
) ON CONFLICT (user_id) DO NOTHING;

INSERT INTO "purchase-app"."Item" (id, user_id, product_name, quantity, unit, price, purchase_date, notes)
VALUES
  ('itm-0001', 'b1c2d3e4-1234-5678-abcd-000000000001', 'Tomatoes', '6', 'each', '3.49', '2026-04-22', NULL),
  ('itm-0002', 'b1c2d3e4-1234-5678-abcd-000000000001', 'Olive oil', '500', 'ml', '8.99', '2026-04-23', NULL),
  ('itm-0003', 'b1c2d3e4-1234-5678-abcd-000000000001', 'Pasta', '400', 'g', '2.25', '2026-04-24', 'Great pantry backup')
ON CONFLICT (id) DO NOTHING;
