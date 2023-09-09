import { autometrics } from "@autometrics/autometrics";
import { init } from "@autometrics/exporter-prometheus";
import express from "express";
import { API_SLO } from "./database.js";
import {
  handleCreateUser,
  handleDeleteUser,
  handleGetUserById,
  handleGetUsers,
} from "./routes.js";
import { delay, generateRandomTraffic } from "./util.js";

init(); // opens the `/metrics` endpoint on port 9464

const app = express();

app.get("/", (_, res) => {
  return res.send("Hello World!");
});

const recordErrorIf = (res: express.Response) => {
  return res.statusCode >= 400 && res.statusCode <= 599;
};

app.get(
  "/users",
  autometrics({ recordErrorIf, objective: API_SLO }, handleGetUsers),
);
app.get(
  "/users/:id",
  autometrics({ recordErrorIf, objective: API_SLO }, handleGetUserById),
);
app.post(
  "/users",
  autometrics({ recordErrorIf, objective: API_SLO }, handleCreateUser),
);
app.delete(
  "/users/:id",
  autometrics({ recordErrorIf, objective: API_SLO }, handleDeleteUser),
);

app.listen(8080, () => {
  console.log("Example app listening on port 8080!");
});

delay(1000);
generateRandomTraffic();
