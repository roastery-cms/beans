import { defaultOnError } from "@/application/commands/helpers/default-on-error";
import { afterEach, describe, expect, it, spyOn } from "bun:test";

/**
 * The re-throw happens inside a microtask, and that is the whole point: the
 * failure escapes the caller's stack instead of rejecting it, so there is no
 * call for `expect().toThrow()` to wrap.
 *
 * It is observed here by intercepting `queueMicrotask` rather than by
 * listening on `process.on("uncaughtException")`. The listener does fire under
 * Bun — verified directly — but `bun test` installs its own handler and
 * attributes the escaped throw to whichever test is running, failing it. What
 * the interception asserts is exactly the contract: one microtask scheduled
 * per call, throwing the original value untouched, with nothing thrown at the
 * call site.
 */
const scheduled: (() => void)[] = [];

const intercept = (): void => {
	scheduled.length = 0;
	spyOn(globalThis, "queueMicrotask").mockImplementation((task: () => void) => {
		scheduled.push(task);
	});
};

afterEach(() => {
	spyOn(globalThis, "queueMicrotask").mockRestore();
});

describe("defaultOnError", () => {
	it("schedules a microtask that re-throws the error, unwrapped", () => {
		const error = new Error("reaction exploded");

		intercept();
		defaultOnError(error);

		expect(scheduled).toHaveLength(1);
		expect(scheduled[0]).toThrow(error);
	});

	// The whole contract in one assertion: an isolated failure must not reach
	// the caller, or a command that succeeded would have its `CommandResult`
	// rejected by a reaction nobody asked about.
	it("returns at the call site instead of throwing there", () => {
		intercept();

		const call = (): void => {
			defaultOnError(new Error("later"));
		};

		expect(call).not.toThrow();
		expect(defaultOnError(new Error("also later"))).toBeUndefined();
	});

	it("re-throws a non-Error value as-is, without wrapping it", () => {
		intercept();
		defaultOnError("a thrown string");

		expect(scheduled[0]).toThrow("a thrown string");
	});

	it("escalates every call, never collapsing two failures into one", () => {
		intercept();
		defaultOnError(new Error("first"));
		defaultOnError(new Error("second"));

		expect(scheduled).toHaveLength(2);
		expect(scheduled[0]).toThrow("first");
		expect(scheduled[1]).toThrow("second");
	});
});
