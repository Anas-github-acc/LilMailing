import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_LEAD = {
  p_name: 'Vitest User',
  p_email: `vitest_${Date.now()}@example.com`,
  p_company: 'Test Corp',
  p_role: 'Developer',
  p_source: 'integration_test'
};

describe('Postgres RPC Functions Integration', () => {
  let leadId;
  let sentMessageId = null;

  // Cleanup helper to keep DB clean
  const deleteTestLead = async () => {
    if (TEST_LEAD.p_email) {
      await supabase.from('leads').delete().eq('email', TEST_LEAD.p_email);
    }
  };

  // Run cleanup before and after to ensure a clean slate
  beforeAll(async () => {
    await deleteTestLead();
  });

  afterAll(async () => {
    await deleteTestLead();
  });

  it('1. rpc_upsert_lead: Should create a new lead', async () => {
    const { error } = await supabase.rpc('rpc_upsert_lead', TEST_LEAD);
    expect(error).toBeNull();

    // Verify it exists in the table directly
    const { data, error: selectError } = await supabase
      .from('leads')
      .select('id, status')
      .eq('email', TEST_LEAD.p_email)
      .single();

    expect(selectError).toBeNull();
    expect(data).toBeDefined();
    expect(data.status).toBe('new'); // Default status
    
    // Save ID for subsequent tests
    leadId = data.id;
  });

  it('2. rpc_get_system_state: Should return system config', async () => {
    const { data, error } = await supabase.rpc('rpc_get_system_state');
    
    expect(error).toBeNull();
    // Expect an array with at least one row
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('mode');
    expect(data[0]).toHaveProperty('daily_cap');
  });

  it('3. rpc_get_leads_to_send: Should include our new lead', async () => {
    const { data, error } = await supabase.rpc('rpc_get_leads_to_send', {
      p_limit: 100
    });

    expect(error).toBeNull();
    // Find our specific test user in the returned list
    const found = data.find(l => l.email === TEST_LEAD.p_email);
    expect(found).toBeDefined();
    expect(found.company).toBe(TEST_LEAD.p_company);
  });

  it('4. rpc_mark_sent: Should update status and log to email_events', async () => {
    if (!leadId) throw new Error('Lead ID missing');

    sentMessageId = `msg_${Date.now()}`; // Generate ID here
    const subject = 'Architecture Test Subject';

    const { error } = await supabase.rpc('rpc_mark_sent', {
      p_lead_id: leadId,
      p_subject: subject,
      p_message_id: sentMessageId
    });

    expect(error).toBeNull();

    // Verify Lead Status is 'sent'
    const { data: lead } = await supabase.from('leads').select('status').eq('id', leadId).single();
    expect(lead.status).toBe('sent');

    // Verify Event Log exists (This is now the source of truth for message_id)
    const { data: event } = await supabase
      .from('email_events')
      .select('lead_id, message_id')
      .eq('message_id', sentMessageId)
      .single();
    
    expect(event).toBeDefined();
    expect(event.lead_id).toBe(leadId);
  });

  it('5. rpc_get_followups: Should NOT return lead immediately (wait period)', async () => {
    // Lead was just marked sent, so it shouldn't be ready for follow-up yet (5 day wait)
    const { data, error } = await supabase.rpc('rpc_get_followups');

    expect(error).toBeNull();
    const found = data.find(l => l.id === leadId);
    expect(found).toBeUndefined();
  });

  it('6. rpc_mark_replied: Should lookup lead via email_events and update status', async () => {
    // CRITICAL FIX: We use the `sentMessageId` variable we saved in the previous test.
    // We do NOT look it up on the lead table, because it doesn't exist there.
    if (!sentMessageId) throw new Error('Message ID missing');

    const { error } = await supabase.rpc('rpc_mark_replied', {
      p_message_id: sentMessageId
    });

    expect(error).toBeNull();

    // Verify Lead Status changed to 'replied'
    const { data: updatedLead } = await supabase
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .single();
      
    expect(updatedLead.status).toBe('replied');
  });
  
  it('7. rpc_get_sent_threads: Should list the thread', async () => {
     const { data, error } = await supabase.rpc('rpc_get_sent_threads');
     expect(error).toBeNull();
     expect(Array.isArray(data)).toBe(true);
     // Since we marked it replied, the event 'sent' should still exist in history
     // We just check that the function returns an array format correctly
     expect(data.length).toBeGreaterThanOrEqual(1);
  });
});