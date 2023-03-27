import dotenv from "dotenv";
import express from "express";

dotenv.config({ path: ".env.local" });

const token = process.env.SLACK_BOT_TOKEN;
const PORT = 3000;
const app = express();

app.post("/slack/action-endpoint", express.json(), (req, res) => {
  if (req.body.token !== token) return res.sendStatus(403);

  // Slack event subscription verification
  if (req.body.type === "url_verification") return res.send(req.body.challenge);

  // Handle other events
  console.log(req.body.event);
  res.sendStatus(200);
});

// Start the server
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
