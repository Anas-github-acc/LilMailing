import { sendMail } from "../services/mail/send.js";
import { followUpEmail } from "../services/mail/template.js";
import { delay } from "../utils/helpers.js";
import { supabase } from "../services/db/supabase.js";
import { env } from "../config/env.js";

export async function followUpJob() {
  const { data: leads } = await supabase.rpc("rpc_get_followups");

  for (const lead of leads) {
    const mail = await followUpEmail(lead);

    const messageId = await sendMail(
      lead.email,
      mail.subject,
      mail.body,
      {
        inReplyTo: lead.message_id
      }
    );

    await supabase.rpc("rpc_mark_followup", {
      p_lead_id: lead.id,
      p_message_id: messageId
    });

    await delay(env.SEND_DELAY_MS);
  }
}