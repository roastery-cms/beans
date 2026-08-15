/**
 * Identification context attached to every `ValueObject` instance.
 *
 * Used by `@roastery/terroir`'s `InvalidPropertyException` to build error
 * messages shaped like `"Property '<name>' of '<source>' is invalid"`. An
 * entity builds a fresh literal per value-object it constructs, so `name` is
 * the **field name** and `source` is the **entity type name**.
 *
 * Both fields are `readonly`: the context is fixed at construction and never
 * reassigned.
 *
 * @example
 * ```ts
 * const context: IValueObjectContext = { name: "email", source: "user" };
 * ```
 */
export interface IValueObjectContext {
	/**
	 * Property name being validated (e.g. `"id"`, `"createdAt"`, `"email"`).
	 * Surfaces verbatim in `InvalidPropertyException.message`.
	 */
	readonly name: string;

	/**
	 * Owning entity's type name (e.g. `"user"`, `"post"`) — the entity type,
	 * not an instance id.
	 */
	readonly source: string;
}
