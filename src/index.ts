require("dotenv").config();
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { join } from "path";
import { createConnection } from "./db";

const port =process.env.PORT || 8080;
const baseUrl="/api";
const app = express();

(
	async () => {
	await createConnection();

	app.set("trust proxy", true);
  app.use(cors());
  app.use(bodyParser.json({ limit: "200mb" }));
	app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));
		
		app.use(express.static(join(process.cwd(), "./uploads")));
		  app.use(
    morgan(function (tokens, req, res) {
      return [
        tokens.date(req, res, "iso"),
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, "content-length"),
        "-",
        tokens["response-time"](req, res),
        "ms",
      ].join(" ");
    })
  );

		app.get("/health-check", (req, res) => {
			res.sendStatus(200);
		 })
		app.listen(port, async () => {
			console.log(`Server is running on http://localhost:${port}`);
			
		 })
	}
)()