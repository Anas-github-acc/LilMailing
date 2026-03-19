import { initCronJobs } from "./services/scheduler/cronJobs.js";
import { readMailJob } from "./jobs/readMail.job.js";

export function startApp() {
  initCronJobs();
  // readMailJob();
}
