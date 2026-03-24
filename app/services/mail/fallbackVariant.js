function clean(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function pick(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function buildFirstVariant(lead, fallback) {
  const name = clean(lead?.name, "Hiring Team");
  const company = clean(lead?.company, "your company");
  const role = clean(lead?.role || lead?.title, "backend/devops role");

  const subject = pick([
    `Inquiry: Engineering at ${company} | Experience in Full-stack (Go/AWS)`,
    `Engineering Inquiry - Backend/DevOps Experience (Go, AWS, Terraform)`,
    `Interest in Engineering Roles at ${company} - Backend & AWS Experience`,
    `CS Student with Backend + AWS Deployment Experience | ${company}`,
    `Exploring Engineering Opportunities at ${company} (Go, Node.js, AWS)`,
    `Backend/DevOps Internship Inquiry - Experience with Go & AWS`,
    `Quick intro: interest in ${role} at ${company}`,
    `Exploring opportunities with ${company} (${role})`,
    `Internship/entry-level interest at ${company}`,
    `Question about ${company} engineering roles`,
    `Potential fit for ${company} backend team`
  ]);

  const opening = pick([
    `Hope you are doing well. I recently came across ${company} and wanted to reach out directly.`,
    `I have been following ${company} and wanted to introduce myself for potential opportunities.`,
    `I noticed ${company} while exploring teams building strong engineering products and wanted to connect.`,
    `I wanted to send a brief note to see if ${company} is considering interns or early-career engineers.`,
    `I came across ${company} recently and thought it would be worth introducing myself.`
  ]);

  const customLine = pick([
    "I enjoy building reliable backend systems and shipping end-to-end features in production.",
    "My recent work includes API development, integrations, and deployment workflows on AWS.",
    "I am especially interested in roles where I can contribute across backend engineering and DevOps.",
    "I am looking for a team where I can learn fast and contribute from day one."
  ]);

  const cta = pick([
    "Would you be open to a short chat next week?",
    "Is it possible to have a 10-15 minute conversation?",
    "Happy to share more details if there is a relevant opening. Can we connect?",
    "If this aligns with your current hiring needs, I would value a brief conversation.",
    "Would a quick call sometime next week work for you?"
  ]);

  return {
    ...fallback,
    subject,
    body: [
      `Hello ${name},`,
      "",
      opening,
      "",
      "I’m Anas, a CS student with ~6 months of production experience building and deploying full-stack systems.",
      "",
      "I’ve worked with TypeScript, Go, and Python, and built microservices and REST APIs using Node.js, React.js, and Next.js. I’ve handled end-to-end backend and deployment workflows - from API design and state management to integrating third-party services and deploying production systems on AWS using Terraform and CI/CD pipelines. I am also a open source contributor and have contributed to Vercel’s Next.js.",
      "",
      customLine,
      "",
      cta,
      "",
      "Best regards,",     
      `--
Anas
BTech Information Technology, 3rd Year
Indian Institute of Information Technology, Vadodara
Call: (+91) 8081233871
GitHub: https://github.com/Anas-github-acc
LinkedIn: https://linkedin.com/in/anas-um\n
      `
    ].join("\n")
  };
}

function buildFollowUpVariant(lead, fallback) {
  const name = clean(lead?.name, "there");
  const company = clean(lead?.company, "your team");

  const subject = pick([
    `Re: Quick follow-up for ${company}`,
    `Re: Following up on my note`,
    `Re: Internship interest at ${company}`,
    `Re: Checking in briefly`,
    `Re: Short follow-up`
  ]);

  const opening = pick([
    `Hello ${name}, just following up in case my previous note got buried.`,
    `Hello ${name}, sending a quick follow-up on my earlier message.`,
    `Hello ${name}, I wanted to check in once on my last email.`,
    `Hello ${name}, sharing a brief follow-up in case timing is better now.`,
    `Hello ${name}, just bumping this once and happy to keep it short.`
  ]);

  const customLine = pick([
    "I am still very interested in contributing as an intern or entry-level engineer.",
    "I would be glad to share my resume and relevant project links.",
    "If there is someone better to contact, I would appreciate a quick redirect.",
    "Happy to provide more context on backend and deployment work I have done.",
    "Thanks again for your time and consideration."
  ]);

  return {
    ...fallback,
    subject,
    body: [
      opening,
      customLine,
      "",
      "Best,",
      `--
Anas
BTech Information Technology, 3rd Year
Indian Institute of Information Technology, Vadodara
Call: (+91) 8081233871
GitHub: https://github.com/Anas-github-acc
LinkedIn: https://linkedin.com/in/anas-um\n
      `
    ].join("\n")
  };
}

export function buildVariantFallbackEmail({ lead, kind, fallback }) {
  if (kind === "follow_up") {
    return buildFollowUpVariant(lead, fallback);
  }

  return buildFirstVariant(lead, fallback);
}