import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";

/** The runtime shape of one set handler, erased of its blueprint types. */
type AnySetHandler = (value: never, raw: never) => void;

/** The runtime shape of the map `onSet()` returns, erased of its blueprint types. */
export type AnySetHandlers = Readonly<
	Record<string, AnySetHandler | undefined>
>;

/**
 * Invokes an instance's `onSet`, guarding against the class-field trap, and
 * returns the handler map it declared.
 *
 * `Entity`/`DomainRecord` call this **inside** the constructor, because a
 * handler has to run before the very first value is built. A class field's
 * initializer only runs after `super()` returns, so a
 * `protected onSet = () => ({ … })` would arrive too late.
 *
 * That trap is only **half** catchable, and deliberately so rather than
 * silently: at construction time `this.onSet` still resolves to the base's
 * empty prototype method, leaving no trace of the field to detect. The
 * `Object.hasOwn` check below therefore fires on the first mutation instead,
 * turning a rule that silently never ran into a loud exception. Declaring
 * `onSet` as a prototype method is a contract, exactly as it is for
 * `defineEntity`/`defineRecord`/`defineMeta`/`defineName`.
 *
 * `onSet` must also be **pure** and must not read `this`: it is invoked before
 * the `[Context]` slot exists. Its handlers receive the raw payload as an
 * argument precisely so they never have to reach for the half-built instance.
 *
 * Lives in `shared/helpers/` because both pillars need the behaviour verbatim
 * — only the pillar name quoted in the message differs, the same `label`
 * parameter `installAccessors` already carries. Contrast `readDefinition`,
 * duplicated per pillar because its identity *is* the method name it probes.
 *
 * @param instance - The instance (or probe) expected to implement `onSet`.
 * @param label - The pillar name, for the error message.
 * @returns The declared handler map, or an empty one.
 *
 * @throws `InvalidEntityDefinitionException` — when `onSet` is not a prototype
 *   method.
 *
 * @see `SetHandlersOf` in `@/domain/entity/types/set-handlers-of.type` — the typed shape.
 *
 * @example
 * ```ts
 * const handlers = readSetHandlers(this, "Entity");
 *
 * handlers.title?.(value as never, raw as never);
 * ```
 */
export function readSetHandlers(
	instance: object,
	label: "Entity" | "Record",
): AnySetHandlers {
	if (Object.hasOwn(instance, "onSet"))
		throw new InvalidEntityDefinitionException(
			label.toLowerCase(),
			`${label}: onSet must be a prototype method. Declared as a class field, its initializer only runs after super() returns, and the base invokes it during construction — so the handlers never ran for this instance.`,
		);

	const onSet = (instance as { onSet?: () => AnySetHandlers }).onSet;

	if (typeof onSet !== "function")
		throw new InvalidEntityDefinitionException(
			label.toLowerCase(),
			`${label}: onSet must be a prototype method. Declared as a class field, its initializer only runs after super() returns, and the base invokes it during construction.`,
		);

	return onSet.call(instance) ?? {};
}
