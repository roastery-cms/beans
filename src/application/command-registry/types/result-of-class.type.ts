import type { CommandResult } from "@/application/command/types";
import type { AnyCommandClass } from "./any-command-class.type";

/**
 * Extracts the `Result` a command class's `execute()` resolves to, via
 * `infer` on the (always explicit) `Promise<CommandResult<Result>>` return
 * annotation.
 *
 * @typeParam Class - The command class to inspect.
 * @see `CommandRunner` — where this becomes the bound function's return type.
 */
export type ResultOfClass<Class extends AnyCommandClass> = Class extends {
	readonly prototype: {
		execute(deps: never): Promise<CommandResult<infer Result>>;
	};
}
	? Result
	: never;
