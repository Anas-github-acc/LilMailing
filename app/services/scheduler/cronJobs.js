import cron from "node-cron";
import { cronConfig } from "../../config/cron.config.js";
import { sendMailJob } from "../../jobs/sendMail.job.js";
import { readMailJob } from "../../jobs/readMail.job.js";
import { followUpJob } from "../../jobs/followUp.job.js";
// import { ingestCSVs } from "../csv/csvReader.js";

export function initCronJobs() {
  cron.schedule(cronConfig.SEND, sendMailJob);
  cron.schedule(cronConfig.READ, readMailJob);
  // cron.schedule(cronConfig.FOLLOW_UP, followUpJob);
  // cron.schedule(cronConfig.CSV_IMPORT, () =>
  //   ingestCSVs("src/data/input")
  // );
}
