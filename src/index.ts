import express from "express";

const PORT = 3000;

const app = express();

app.use(express.json());

app.post("/slack/action-endpoint", (req, res, ctx) => {
  res.status(200).send(req.body.challenge);
});

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
