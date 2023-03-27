import express from "express";
import crypto from "crypto";

const signingSecret = process.env.SLACK_SIGNING_SECRET;
const PORT = 3000;
const app = express();

app.post("/slack/action-endpoint", express.json(), (req, res) => {
  const signature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];
  const rawBody = "rawBody" in req ? req.rawBody : undefined;

  try {
    if (!signingSecret) throw new Error("500");
    if (!rawBody) throw new Error("400");
    if (typeof signature !== "string") throw new Error("403");
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5)
      throw new Error("403");

    const hmac = crypto.createHmac("sha256", signingSecret);
    hmac.update(`v0:${timestamp}:${rawBody}`);

    if (
      !crypto.timingSafeEqual(
        Buffer.from(`v0=${hmac.digest("hex")}`),
        Buffer.from(signature)
      )
    ) {
      res.sendStatus(400);
      throw new Error("Invalid signature");
    }

    // Slack event subscription verification
    if (req.body.type === "url_verification")
      return res.send(req.body.challenge);

    // Handle other events
    console.log(req.body.event);
    res.sendStatus(200);
  } catch (err) {}
});

// Start the server
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
