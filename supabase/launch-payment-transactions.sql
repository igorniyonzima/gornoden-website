CREATE OR REPLACE FUNCTION public.record_account_payment(p_account_id bigint,p_amount numeric,p_date date)
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_balance numeric; v_id bigint;
BEGIN
IF NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
IF p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<=0 OR p_amount<>round(p_amount,2) OR p_date IS NULL THEN RAISE EXCEPTION 'Enter a positive payment amount with at most two decimal places and a date'; END IF;
SELECT current_reported_balance INTO v_balance FROM public.account_submissions WHERE id=p_account_id FOR UPDATE;
IF NOT FOUND OR v_balance IS NULL THEN RAISE EXCEPTION 'Account not found'; END IF;
IF p_amount>v_balance THEN RAISE EXCEPTION 'Payment cannot exceed the current balance'; END IF;
INSERT INTO public.account_payments(account_id,payment_amount,payment_date,recorded_by) VALUES(p_account_id,p_amount,p_date,auth.uid()) RETURNING id INTO v_id;
UPDATE public.account_submissions SET current_reported_balance=v_balance-p_amount WHERE id=p_account_id;
RETURN v_id;
END; $$;
CREATE OR REPLACE FUNCTION public.void_account_payment(p_payment_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_account bigint; v_amount numeric; v_voided boolean;
BEGIN
IF NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
SELECT account_id INTO v_account FROM public.account_payments WHERE id=p_payment_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
PERFORM id FROM public.account_submissions WHERE id=v_account FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
SELECT payment_amount,is_voided INTO v_amount,v_voided FROM public.account_payments WHERE id=p_payment_id FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
IF v_voided THEN RETURN; END IF;
UPDATE public.account_payments SET is_voided=true,voided_by=auth.uid(),voided_at=now() WHERE id=p_payment_id;
UPDATE public.account_submissions SET current_reported_balance=current_reported_balance+v_amount WHERE id=v_account;
END; $$;
REVOKE ALL ON FUNCTION public.record_account_payment(bigint,numeric,date),public.void_account_payment(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_account_payment(bigint,numeric,date),public.void_account_payment(bigint) TO authenticated;