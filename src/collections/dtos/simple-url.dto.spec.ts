import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { SimpleUrlDTO } from "./simple-url.dto";

describe("SimpleUrlDTO", () => {
	const validator = new Schema(SimpleUrlDTO);

	it("should validate a redis URL", () => {
		expect(validator.match("redis://localhost:6739")).toBe(true);
	});

	it("should validate an http URL", () => {
		expect(validator.match("http://localhost:3000")).toBe(true);
	});

	it("should invalidate an empty string", () => {
		expect(validator.match("")).toBe(false);
	});

	it("should invalidate a non-URL string", () => {
		expect(validator.match("not a url")).toBe(false);
	});
});
