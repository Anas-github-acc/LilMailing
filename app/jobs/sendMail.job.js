import { sendMail } from "../services/mail/send.js";
import { firstEmail } from "../services/mail/template.js";
import { delay } from "../utils/helpers.js";
import { supabase } from "../services/db/supabase.js";
import { env } from "../config/env.js";
import { log } from "../utils/logger.js";
import { validateRecipientDeliverability } from "../utils/validator.js";

// async function syncWarmupModeFromRpc() {
//   const { error } = await supabase.rpc("rpc_sync_warmup_mode");

//   if (error) {
//     log(["rpc_sync_warmup_mode failed", error.message]);
//   }
// }

const now = new Date();

// Convert to IST
const istTime = new Date(
  now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
);

const hour = istTime.getHours();

function shouldRun() {
  if (hour >= 8 && hour < 22) {
    return true;
  }

  return false;
}

export async function sendMailJob() {

  if (!shouldRun()) {
    log(["sendMailJob skipped", "Not the scheduled time"]);
    return;
  }

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

  console.log('max = ', max)

  
  if (leadsError) {
    log(["rpc_get_leads_to_send failed", leadsError.message]);
    return;
  }
  
  if (!leads.length) {
    log(["sendMailJob no-op", "No eligible leads for this tick"]);
    return;
  }

  console.log("[sendMailJob] Mail sent to :", leads);

  for (let i = 0; i < leads.length; i += 1) {
    const lead = leads[i];
    // const recipientCheck = await validateRecipientDeliverability(lead.email);

    // if (!recipientCheck.ok) {
    //   log([
    //     "sendMailJob skipped lead",
    //     `lead_id=${lead.id}`,
    //     `email=${lead.email}`,
    //     `reason=${recipientCheck.reason}`
    //   ]);
    //   continue;
    // }

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

