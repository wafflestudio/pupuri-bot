import { App } from "@slack/bolt";

const PORT = 3000;

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

/* Add functionality here */

app.event("channel_rename", async (event) => {
  console.log(event);
});

(async () => {
  // Start the app
  await app.start(PORT);

  console.log("⚡️ Bolt app is running!");
})();
