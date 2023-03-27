import express from "express";

const PORT = 3000;

const app = express();

app.post("/api/slack/action-endpoint", (req, res, ctx) =>
  res.status(200).send(req.query.challenge)
);

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
