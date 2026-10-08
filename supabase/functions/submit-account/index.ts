import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://gornoden.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

const authHeader = req.headers.get("Authorization");

if (!authHeader?.startsWith("Bearer ")) {
  return new Response(
    JSON.stringify({ error: "Authentication required" }),
    {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

const token = authHeader.replace("Bearer ", "");

const userResponse = await fetch(
  `${Deno.env.get("SUPABASE_URL")}/auth/v1/user`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    },
  }
);

if (!userResponse.ok) {
  return new Response(
    JSON.stringify({ error: "Invalid or expired session" }),
    {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}
const user = await userResponse.json();
  try {
    const formData = await req.formData();
const requiredFields = ["Client Legal Name", "Debtor Business Name", "Debtor Business Address", "Debtor City", "Debtor State", "Debtor ZIP Code", "Invoice Account Number", "Invoice Date", "Contractual Due Date"];
const original = Number(formData.get("Original Invoice Amount"));
const balance = Number(formData.get("Current Reported Balance"));
const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
if (requiredFields.some(key => typeof formData.get(key) !== "string" || !formData.get(key).trim()) ||
    !formData.get("Original Invoice Amount") || !formData.get("Current Reported Balance") ||
    !Number.isFinite(original) || original <= 0 || !Number.isFinite(balance) || balance < 0 || balance > original ||
    !validDate(formData.get("Invoice Date")) || !validDate(formData.get("Contractual Due Date")) ||
    !["AR Management", "Recovery", "Both AR & Recovery"].includes(formData.get("Service Requested")) ||
    formData.get("Commercial B2B Certification") !== "Certified") {
  return new Response(JSON.stringify({ error: "Provide complete commercial account details and valid amounts, dates, and certification." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
const submission = {
  user_id: user.id,
  client_legal_name: formData.get("Client Legal Name"),
  debtor_contact_name: formData.get("Debtor Contact Name"),
  debtor_business_name: formData.get("Debtor Business Name"),
  debtor_business_address: formData.get("Debtor Business Address"),
  debtor_city: formData.get("Debtor City"),
  debtor_state: formData.get("Debtor State"),
  debtor_zip_code: formData.get("Debtor ZIP Code"),
  debtor_email: formData.get("Debtor Email"),
  debtor_phone: formData.get("Debtor Phone"),
  invoice_account_number: formData.get("Invoice Account Number"),
  original_invoice_amount: formData.get("Original Invoice Amount"),
  current_reported_balance: formData.get("Current Reported Balance"),
  invoice_date: formData.get("Invoice Date"),
  contractual_due_date: formData.get("Contractual Due Date"),
  service_requested: formData.get("Service Requested"),
  account_notes: formData.get("Account Notes"),
  b2b_certified:
    formData.get("Commercial B2B Certification") === "Certified",
  status: "Received",
};
const databaseResponse = await fetch(
  `${Deno.env.get("SUPABASE_URL")}/rest/v1/account_submissions`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      Authorization: `Bearer ${token}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(submission),
  }
);

if (!databaseResponse.ok) {
  const databaseError = await databaseResponse.text();
  console.error("Database insert failed:", databaseError);
  throw new Error("Database insert failed");
}
    try {
    const formspreeResponse = await fetch(
      "https://formspree.io/f/xppzvbzl",
      {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!formspreeResponse.ok) {
      console.error("Account saved, but notification delivery failed:", formspreeResponse.status);
    }

    } catch (notificationError) {
      console.error("Account saved, but notification delivery failed.");
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({ error: "Unable to submit account" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});