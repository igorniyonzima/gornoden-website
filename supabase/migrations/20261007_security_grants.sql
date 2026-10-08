-- Gornoden security hardening, review before production deployment.
-- No data is deleted. RLS policies remain in place.
BEGIN;
REVOKE ALL ON TABLE public.admin_users FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.admin_users FROM authenticated;
GRANT SELECT ON TABLE public.admin_users TO authenticated;
REVOKE ALL ON TABLE public.account_submissions, public.account_payments, public.account_client_updates FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.account_submissions, public.account_payments, public.account_client_updates FROM authenticated;
-- Only admins have DELETE policies on payments; preserve existing functionality.
-- Authenticated grants are required for RLS-authorized client/admin operations.
COMMIT;
