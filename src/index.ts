import dotenv from "dotenv";
import express from "express";

dotenv.config({ path: ".env.local" });

const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackWatcherChannerId = process.env.SLACK_WATCHER_CHANNEL_ID;
const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const PORT = 3000;
const app = express();

app.post("/slack/action-endpoint", express.json(), (req, res) => {
  if (req.body.token !== slackBotToken) return res.sendStatus(403);

  // Slack event subscription verification
  if (req.body.type === "url_verification") return res.send(req.body.challenge);

  // Handle other events
  if (req.body.event.type === "channel_rename") {
    fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${slackAuthToken}`,
      },
      body: JSON.stringify({
        channel: slackWatcherChannerId,
        text: `<#${req.body.event.channel.id}> has renamed.`,
      }),
    });
  }

  res.sendStatus(200);
});

// Start the server
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
