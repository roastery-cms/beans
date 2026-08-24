import type { CommandsSpecBase } from "@/application/command/types";
import type { CommandRunnersOf } from "./command-runners-of.type";
import type { IEventedCommands } from "./ievented-commands.interface";

/**
 * What `commands(spec, options).withDependencies(deps)` actually
 * returns: the named members {@link IEventedCommands} declares (`get`, `on`),
 * plus one accessor per registrable spec key (`CommandRunnersOf`).
 *
 * @remarks
 * `CommandRunnersOf` is reused verbatim from the events-free return type
 * rather than restated here: the accessor half is keyed by the very same
 * `RegistrableKeys` union, and the runners it types are the same ones — one
 * bag serves both `.get()` and every `deps.commands`, publishing and
 * reacting only when an emitter was supplied.
 *
 * An intersection for the same reason `CommandsOf` is one: a
 * TypeScript interface cannot declare a mapped type over a generic key union.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `EventedCommandsBuilder.withDependencies` — returns this.
 * @see `IEventedCommands.on` — returns this too, so chaining preserves the accessors.
 */
export type EventedCommandsOf<
	Spec extends CommandsSpecBase,
	Dependencies,
> = IEventedCommands<Spec, Dependencies> & CommandRunnersOf<Spec, Dependencies>;
