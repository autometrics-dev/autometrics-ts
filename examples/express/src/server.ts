import { autometrics } from "@autometrics/autometrics";
import express from "express";
import {
  handleCreateUser,
  handleDeleteUser,
  handleGetUserById,
  handleGetUsers,
} from "./routes.js";
import { delay, generateRandomTraffic } from "./util.js";

const app = express();

app.get("/", (req, res) => {
  return res.send("Hello World!");
});

const recordErrorIf = (res: express.Response) => {
  return res.statusCode >= 400 && res.statusCode <= 599;
};

app.get("/users", autometrics({ recordErrorIf }, handleGetUsers));
app.get("/users/:id", autometrics({ recordErrorIf }, handleGetUserById));
app.post("/users", autometrics({ recordErrorIf }, handleCreateUser));
app.delete("/users/:id", autometrics({ recordErrorIf }, handleDeleteUser));

app.listen(8080, () => {
  console.log("Example app listening on port 3000!");
});

delay(1000);
//generateRandomTraffic();

generateTraffic();
async function generateTraffic() {
  console.log("Generating traffic...");

  let errors = 0;
  let ok = 0;

  for (let i = 0; i < 100; i++) {
    const res = await fetch("http://localhost:8080/users");
    if (res.status >= 400) {
      errors++;
    } else {
      ok++;
    }
  }

  console.log(`Errors: ${errors}`);
  console.log(`OK: ${ok}`);
}
