import { sendMail } from "../services/mail/send.js";
import { firstEmail } from "../services/mail/template.js";
import { delay } from "../utils/helpers.js";
import { supabase } from "../services/db/supabase.js";
import { env } from "../config/env.js";
import { log } from "../utils/logger.js";

async function syncWarmupModeFromRpc() {
  const { error } = await supabase.rpc("rpc_sync_warmup_mode");

  if (error) {
    log(["rpc_sync_warmup_mode failed", error.message]);
  }
}

export async function sendMailJob() {
  await syncWarmupModeFromRpc();

  const { data: system, error: systemError } = await supabase.rpc("rpc_get_system_state");
  if (systemError) {
    log(["rpc_get_system_state failed, using SEND_LIMIT", systemError.message]);
  }

  const cap = system?.[0]?.daily_cap || env.SEND_LIMIT;

  const { data: leads = [], error: leadsError } = await supabase.rpc("rpc_get_leads_to_send", {
    p_limit: cap
  });

  if (leadsError) {
    log(["rpc_get_leads_to_send failed", leadsError.message]);
    return;
  }

  for (const lead of leads) {
    const mail = await firstEmail(lead);
    const messageId = await sendMail(
      lead.email,
      mail.subject,
      mail.body,
      {
        attachments: mail.attachments
      }
    );

    await supabase.rpc("rpc_mark_sent", {
      p_lead_id: lead.id,
      p_subject: mail.subject,
      p_message_id: messageId
    });

    await delay(env.SEND_DELAY_MS);
  }
}

