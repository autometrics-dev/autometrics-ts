var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import { autometrics } from "autometrics";
const app = express();
const port = 8080;
const rootRoute = (req, res) => {
    console.log("request made");
    return res.status(200).send("did not delay - success");
};
function badRoute(req, res) {
    console.log("bad route request made");
    throw new Error("Bad request");
}
function asyncRoute(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("async route request made");
        const result = yield asyncCall();
        return res.status(200).send(result);
    });
}
function resolveAfter2Seconds() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("resolved");
        }, 2000);
    });
}
function asyncCall() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("calling");
        const result = yield resolveAfter2Seconds();
        return result;
    });
}
app.get("/", autometrics(rootRoute));
app.get("/bad", (req, res) => badRouteMetrics(req, res));
app.get("/async", autometrics(asyncRoute));
const badRouteMetrics = autometrics(badRoute);
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
//# sourceMappingURL=index.js.map