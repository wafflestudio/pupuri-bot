import express, { NextFunction, Request, Response } from "express";

const PORT = 3000;

const app = express();

app.get("/ping", (req: Request, res: Response, next: NextFunction) => {
  res.send("pong");
});

app.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}`);
});
