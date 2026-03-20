import { env } from "../../config/env.js";
import { generateEmailFromAI } from "./aiComposer.js";

function buildFirstEmailFallback(lead) {
  const attachments = env.RESUME_PATH
    ? [
        {
          filename: env.RESUME_FILENAME || "Anas-Resume.pdf",
          path: env.RESUME_PATH
        }
      ]
    : [];

  return {
    subject: `Inquiry: Engineering at ${lead.company} | Experience in Full-stack (Go/AWS)`,
    body: `
Hello ${lead.name},

Hope you're having a great week.

I came across ${lead.company} and wanted to reach out.

I’m Anas, a CS student with ~6 months of production experience building and deploying full-stack systems.

I’ve worked with TypeScript, Go, and Python, and built microservices and REST APIs using Node.js, React.js, and Next.js. I’ve handled end-to-end backend and deployment workflows - from API design and state management to integrating third-party services and deploying production systems on AWS using Terraform and CI/CD pipelines. I am also a open source contributor and have contributed to Vercel’s Next.js.

I’m currently looking for an internship or entry-level backend/DevOps role and would love to contribute to your team.

Are you available for a brief chat sometime next week?

Best regards,
`,
    attachments
  };
}

function buildFollowUpFallback(lead) {
  return {
    subject: `Re: Quick question, ${lead.name}`,
    body: `
Hi ${lead.name},

Just following up once in case this got buried.
Happy to share my resume if useful.

Best,
`
  };
}

export async function firstEmail(lead) {
  const fallback = buildFirstEmailFallback(lead);

  const aiMail = await generateEmailFromAI({
    lead,
    kind: "first",
    fallback
  });

  return {
    ...aiMail,
    attachments: fallback.attachments
  };
}

export async function followUpEmail(lead) {
  const fallback = buildFollowUpFallback(lead);

  return generateEmailFromAI({
    lead,
    kind: "follow_up",
    fallback
  });
}