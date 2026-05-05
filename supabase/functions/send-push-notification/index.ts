import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  user_id?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = (await req.json()) as RequestBody;
    const userId = body.user_id?.trim();
    const title = body.title?.trim();
    const messageBody = body.body?.trim();
    const data = body.data ?? {};

    if (!userId || !title || !messageBody) {
      return jsonResponse({ error: "user_id, title and body are required" }, 400);
    }

    const { data: tokensRows, error: tokensError } = await supabase
      .from("user_push_tokens")
      .select("id,expo_push_token")
      .eq("user_id", userId);

    if (tokensError) {
      return jsonResponse({ error: tokensError.message }, 400);
    }

    if (!tokensRows?.length) {
      return jsonResponse({ sent: 0, reason: "No tokens for user" }, 200);
    }

    const messages = tokensRows.map((row) => ({
      to: row.expo_push_token,
      sound: "default",
      title,
      body: messageBody,
      data,
    }));

    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!expoResponse.ok) {
      const text = await expoResponse.text();
      return jsonResponse({ error: "Expo API failed", details: text }, 502);
    }

    const parsed = (await expoResponse.json()) as {
      data?: Array<{
        status: "ok" | "error";
        details?: { error?: string };
      }>;
    };

    const invalidTokenIds: string[] = [];
    for (let i = 0; i < (parsed.data?.length ?? 0); i += 1) {
      const result = parsed.data?.[i];
      if (result?.status === "error" && result.details?.error === "DeviceNotRegistered") {
        const tokenRow = tokensRows[i];
        if (tokenRow?.id) invalidTokenIds.push(tokenRow.id);
      }
    }

    if (invalidTokenIds.length) {
      await supabase.from("user_push_tokens").delete().in("id", invalidTokenIds);
    }

    return jsonResponse(
      {
        sent: messages.length - invalidTokenIds.length,
        removed_invalid_tokens: invalidTokenIds.length,
      },
      200,
    );
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      500,
    );
  }
});

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
