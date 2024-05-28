require("dotenv").config();

import { test } from "@jest/globals";
import { createConnection } from "../db";
describe("database module", () => {
	test("check dataabase connection", async () => {
		await expect(createConnection()).resolves.toBeTruthy();
	 })
	
})