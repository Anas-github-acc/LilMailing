export function firstEmail(lead) {
  return {
    subject: `Quick question, ${lead.name}`,
    body: `
Hi ${lead.name},

I'm Anas, a CS student with experience in backend and systems work.
I came across ${lead.company} and wanted to reach out.

I'm currently looking for internship / entry-level roles and wanted to ask
if it makes sense to share my profile.

Best,
Anas

If this isn't relevant, just reply "no" and I won't follow up.
`
  };
}

export function followUpEmail(lead) {
  return {
    subject: `Re: Quick question, ${lead.name}`,
    body: `
Hi ${lead.name},

Just following up once in case this got buried.
Happy to share my resume if useful.

Best,
Anas
`
  };
}