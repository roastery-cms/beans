import type { CommandsSpecBase } from "@/application/command/types";
import type { CommandRunnersOf } from "./command-runners-of.type";
import type { ICommands } from "./icommands.interface";

/**
 * What `commands(spec).withDependencies(deps)` actually returns: the
 * named members {@link ICommands} declares, plus one accessor per
 * registrable spec key ({@link CommandRunnersOf}).
 *
 * @remarks
 * An intersection rather than a single interface because the accessor half is
 * a **mapped type** over a generic key union, and a TypeScript interface can
 * only declare statically known members. Splitting it this way keeps
 * `ICommands` an ordinary interface — still the place `.get`'s contract
 * is documented, still what `IEventedCommands` extends.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `CommandsBuilder.withDependencies` — returns this.
 */
export type CommandsOf<Spec extends CommandsSpecBase, Dependencies> = ICommands<
	Spec,
	Dependencies
> &
	CommandRunnersOf<Spec, Dependencies>;
