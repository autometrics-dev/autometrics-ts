import { autometrics } from "@autometrics/autometrics";
import express from "express";
import { DatabaseClient } from "./database.js";
import {
  handleCreateUser,
  handleDeleteUser,
  handleGetUserById,
  handleGetUsers,
} from "./routes.js";
import { delay, generateRandomTraffic } from "./util.js";

const app = express();
export const db = new DatabaseClient();

app.get("/", (req, res) => {
  return res.send("Hello World!");
});

// rome-ignore lint/suspicious/noExplicitAny: <explanation>
const  recordErrorIf = (res: any) => res.status >= 400 && res.status <= 599;

app.get("/users", autometrics({ recordErrorIf }, handleGetUsers));
app.get("/users/:id", autometrics({ recordErrorIf }, handleGetUserById));
app.post("/users", autometrics({ recordErrorIf }, handleCreateUser));
app.delete("/users/:id", autometrics({ recordErrorIf }, handleDeleteUser));

app.listen(8080, () => {
  console.log("Example app listening on port 3000!");
});

delay(1000);
generateRandomTraffic();
