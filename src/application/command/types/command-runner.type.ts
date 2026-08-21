import type { CommandResult } from "./command-result.type";
import type { AnyCommandClass } from "./any-command-class.type";
import type { PayloadOfClass } from "./payload-of-class.type";
import type { ResultOfClass } from "./result-of-class.type";

/**
 * What `.get(key)` returns: a bound function that constructs the command
 * with a payload and immediately `execute()`s it with the dependency record
 * supplied once at `withDependencies` time, resolving to the same
 * `CommandResult` `execute()` itself returns.
 *
 * @typeParam Class - The command class this runner wraps.
 * @see `ICommandRegistry.get`
 */
export type CommandRunner<Class extends AnyCommandClass> = (
	payload: PayloadOfClass<Class>,
) => Promise<CommandResult<ResultOfClass<Class>>>;
