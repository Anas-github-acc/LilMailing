import { sendMailJob } from "../jobs/sendMail.job.js";
import { readMailJob } from "../jobs/readMail.job.js";
import { followUpJob } from "../jobs/followUp.job.js";

const task = process.argv[2];

const handlers = {
  send: sendMailJob,
  read: readMailJob,
  "follow-up": followUpJob
};

async function main() {
  const handler = handlers[task];

  if (!handler) {
    console.error("Unknown task. Use one of: send, read, follow-up");
    process.exitCode = 1;
    return;
  }

  console.log(`[job] starting ${task}`);
  await handler();
  console.log(`[job] completed ${task}`);
}

main().catch((error) => {
  console.error(`[job] ${task} failed`, error);
  process.exitCode = 1;
});
