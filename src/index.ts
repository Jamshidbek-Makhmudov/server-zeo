require("dotenv").config();
import express from "express";

const port =process.env.PORT || 8080;
const baseUrl="/api";
const app = express();

(
	async () => {

		app.get("/health-check", (req, res) => {
			res.sendStatus(200);
		 })
		app.listen(port, async () => {
			console.log(`Server is running on http://localhost:${port}`);
			
		 })
	}
)()