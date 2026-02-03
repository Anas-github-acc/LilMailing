import { sendMail } from "../services/mail/send.js";
import { firstEmail } from "../services/mail/template.js";
import { delay } from "../utils/helpers.js";
import { supabase } from "../services/db/supabase.js";
import { env } from "../config/env.js";

export async function sendMailJob() {
  const { data: system } = await supabase.rpc("rpc_get_system_state");
  const cap = system[0].daily_cap;

  const { data: leads } = await supabase.rpc("rpc_get_leads_to_send", {
    p_limit: cap
  });

  for (const lead of leads) {
    const mail = firstEmail(lead);
    const messageId = await sendMail(
      lead.email,
      mail.subject,
      mail.body
    );

    await supabase.rpc("rpc_mark_sent", {
      p_lead_id: lead.id,
      p_subject: mail.subject,
      p_message_id: messageId
    });

    await delay(env.SEND_DELAY_MS);
  }
}

