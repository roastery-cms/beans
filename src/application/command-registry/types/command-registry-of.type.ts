import type { CommandRegistrySpecBase } from "@/application/command/types";
import type { CommandRunnersOf } from "./command-runners-of.type";
import type { ICommandRegistry } from "./icommand-registry.interface";

/**
 * What `commandRegistry(spec).withDependencies(deps)` actually returns: the
 * named members {@link ICommandRegistry} declares, plus one accessor per
 * registrable spec key ({@link CommandRunnersOf}).
 *
 * @remarks
 * An intersection rather than a single interface because the accessor half is
 * a **mapped type** over a generic key union, and a TypeScript interface can
 * only declare statically known members. Splitting it this way keeps
 * `ICommandRegistry` an ordinary interface — still the place `.get`'s contract
 * is documented, still what `IEventedRegistry` extends.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `CommandRegistryBuilder.withDependencies` — returns this.
 */
export type CommandRegistryOf<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
> = ICommandRegistry<Spec, Dependencies> & CommandRunnersOf<Spec, Dependencies>;
