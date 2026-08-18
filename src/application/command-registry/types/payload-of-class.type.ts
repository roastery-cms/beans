import type { AnyCommandClass } from "./any-command-class.type";

/**
 * Extracts the constructor payload a command class accepts, via `infer` on
 * the concrete class's construct signature — inherited from `Command` itself
 * for every subclass that declares no constructor of its own, which is the
 * norm.
 *
 * @typeParam Class - The command class to inspect.
 * @see `CommandRunner` — where this becomes the bound function's parameter type.
 */
export type PayloadOfClass<Class extends AnyCommandClass> = Class extends {
	new (payload: infer Payload): unknown;
}
	? Payload
	: never;
