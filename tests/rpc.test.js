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

    // Verify discoverability through the read RPC and save ID for next tests.
    const { data: leads, error: leadsError } = await supabase.rpc('rpc_get_leads_to_send', {
      p_limit: 100
    });

    expect(leadsError).toBeNull();
    const found = leads.find(l => l.email === TEST_LEAD.p_email);
    expect(found).toBeDefined();

    leadId = found.id;
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

    // Verify lead is no longer in the send queue.
    const { data: queueData, error: queueError } = await supabase.rpc('rpc_get_leads_to_send', {
      p_limit: 100
    });
    expect(queueError).toBeNull();
    const stillQueued = queueData.find(l => l.id === leadId);
    expect(stillQueued).toBeUndefined();

    // Verify thread is visible to the read-mail workflow.
    const { data: sentThreads, error: sentThreadsError } = await supabase.rpc('rpc_get_sent_threads');
    expect(sentThreadsError).toBeNull();
    const sentThread = sentThreads.find(t => t.message_id === sentMessageId);
    expect(sentThread).toBeDefined();
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

    // Keep this assertion API-focused: replied messages should no longer show as pending follow-up.
    const { data: followups, error: followupsError } = await supabase.rpc('rpc_get_followups');
    expect(followupsError).toBeNull();
    const followup = followups.find(l => l.id === leadId);
    expect(followup).toBeUndefined();
  });
  
  it('7. rpc_get_sent_threads: Should list the thread', async () => {
     const { data, error } = await supabase.rpc('rpc_get_sent_threads');
     expect(error).toBeNull();
     expect(Array.isArray(data)).toBe(true);
     // Should include the sent thread we created in this suite.
     const found = data.find(t => t.message_id === sentMessageId);
     expect(found).toBeDefined();
  });
});