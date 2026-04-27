/**
 * Identification context attached to every {@link ValueObject} instance.
 *
 * Used by `@roastery/terroir`'s `InvalidPropertyException` to build error messages
 * shaped like `"Property '<name>' of '<source>' is invalid"`. An entity provides
 * a fresh metadata literal per value-object via its `[EntityContext](name)` method,
 * so `name` is the **field name** and `source` is the **entity type/class name**.
 *
 * Both fields are `readonly`: metadata is fixed at construction and never reassigned.
 *
 * @example
 * ```ts
 * const info: IValueObjectMetadata = { name: "email", source: "User" };
 * ```
 */
export interface IValueObjectMetadata {
	/**
	 * Property name being validated (e.g. `"id"`, `"createdAt"`, `"email"`).
	 * Surfaces verbatim in `InvalidPropertyException.message`.
	 */
	readonly name: string;

	/**
	 * Owning entity's identifier (e.g. `"User"`, `"Post"`). Conventionally the value
	 * passed to `Entity`'s constructor as `entitySource` — the entity type, not an instance id.
	 */
	readonly source: string;
}
