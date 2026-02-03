/*
  Cron job schedule configuration

  Format:
  * * * * *
  | | | | |
  | | | | └───── day of week (0 - 7) (Sunday=0 or 7)
  | | | └────────── month (1 - 12)
  | | └─────────────── day of month (1 - 31)
  | └──────────────────── hour (0 - 23)
  └───────────────────────── min (0 - 59)

  Reference: https://crontab.guru/
*/

export const cronConfig = {
  SEND: "0 10 * * 1-4", // At 10:00 AM, Monday through Thursday
  FOLLOW_UP: "0 10 * * 1-4",
  READ: "0 11 * * 1-4",
  CSV_IMPORT: "*/30 * * * *"
};