import { sendMail } from "../services/mail/send.js";
import { firstEmail } from "../services/mail/template.js";
import { delay } from "../utils/helpers.js";
import { supabase } from "../services/db/supabase.js";
import { env } from "../config/env.js";
import { log } from "../utils/logger.js";

// async function syncWarmupModeFromRpc() {
//   const { error } = await supabase.rpc("rpc_sync_warmup_mode");

//   if (error) {
//     log(["rpc_sync_warmup_mode failed", error.message]);
//   }
// }

export async function sendMailJob() {

  // const { data: system, error: systemError } = await supabase.rpc("rpc_get_system_state");
  // if (systemError) {
  //   log(["rpc_get_system_state failed, using SEND_LIMIT", systemError.message]);
  // }

  // const mode = system?.[0]?.mode;
  // const cap = system?.[0]?.daily_cap || env.SEND_LIMIT;
  const max = env.JOB_SEND_MAX_PER_RUN;

  const { data: leads = [], error: leadsError } = await supabase.rpc("rpc_get_leads_to_send", {
    p_limit: max
  });

  if (leadsError) {
    log(["rpc_get_leads_to_send failed", leadsError.message]);
    return;
  }

  if (!leads.length) {
    log(["sendMailJob no-op", "No eligible leads for this tick"]);
    return;
  }

  for (let i = 0; i < leads.length; i += 1) {
    const lead = leads[i];
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

    // const hasMore = i < leads.length - 1;
    // if (hasMore && env.SEND_DELAY_MS > 0) {
    //   await delay(env.SEND_DELAY_MS);
    // }
  }
}

