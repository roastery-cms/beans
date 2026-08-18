import type { IValueObjectContext } from "@/domain/value-object/types/value-object-context.interface";

/**
 * Computes a redacted field's replacement from the real value and the field's
 * own `{ name, source }` — which is what makes **partial** masking possible
 * (`a***@b.dev`, last four digits, a per-field marker) rather than one flat
 * literal everywhere.
 *
 * Parameter order mirrors `IValueObjectHooks.validate`, the other hook in the
 * package that receives both.
 *
 * @param value - The real value about to be replaced.
 * @param context - `{ name, source }` — whose value this is.
 * @returns What to serialize in its place.
 */
export type RedactionPlaceholderFn = (
	value: unknown,
	context: IValueObjectContext,
) => unknown;

/**
 * What a redacted field is replaced with: a ready value, or a
 * {@link RedactionPlaceholderFn} computing one.
 *
 * The two are told apart at runtime by `typeof === "function"`, the same
 * discriminant `IValueObjectMetadata.default` already uses for its thunk form —
 * with the same corollary: a placeholder that is *itself* a function cannot be
 * expressed, which is why the value branch enumerates the serializable kinds
 * instead of being `unknown`. A bare `unknown` would also swallow the function
 * branch, leaving a placeholder callback's parameter implicitly `any`.
 *
 * `undefined` is deliberately not a member: it is how `redactWith` says "no
 * override, use the configured placeholder".
 */
export type RedactionPlaceholder =
	| RedactionPlaceholderFn
	| Readonly<Record<string, unknown>>
	| readonly unknown[]
	| bigint
	| boolean
	| number
	| string
	| symbol
	| null;

/** The package-wide redaction settings. */
export interface IRedactionConfig {
	/**
	 * What replaces a sensitive value. Defaults to `"[redacted]"`.
	 *
	 * A value-object may override this for its own class through
	 * `IValueObjectMetadata.redactWith`.
	 */
	readonly placeholder: RedactionPlaceholder;
}

/** The setting used when nothing was configured. */
const DEFAULT_CONFIG: IRedactionConfig = { placeholder: "[redacted]" };

/**
 * Module-level state rather than a `globalThis` key, deliberately: it is
 * typed, it is trivially resettable between tests, and it cannot be clobbered
 * by an unrelated package. A `globalThis` slot would only buy something if the
 * package were ever duplicated inside `node_modules` — a problem that does not
 * exist today and that, if it ever appears, can be solved underneath this API
 * without changing it.
 */
let current: IRedactionConfig = DEFAULT_CONFIG;

/**
 * Sets how sensitive values are replaced, package-wide, for every `Entity` and
 * `Command`. Call once at startup, before anything is serialized.
 *
 * @param config - The settings to apply. Omitted keys keep their current value;
 *   pass no argument at all to restore the defaults.
 *
 * @example
 * ```ts
 * configureRedaction({ placeholder: "***" });
 * configureRedaction({ placeholder: (_value, { name }) => `<${name} hidden>` });
 * configureRedaction(); // back to "[redacted]"
 * ```
 */
export function configureRedaction(config?: Partial<IRedactionConfig>): void {
	current = config ? { ...current, ...config } : DEFAULT_CONFIG;
}

/**
 * Reads the settings in force.
 *
 * @returns The current configuration.
 */
export function redactionConfig(): IRedactionConfig {
	return current;
}

/**
 * Resolves what a given field's value is replaced with: the class's own
 * `redactWith` when it declares one, the configured placeholder otherwise,
 * calling either if it is a function.
 *
 * @param value - The real value being replaced, handed to a placeholder
 *   function so it can mask rather than erase.
 * @param context - The field being redacted, `{ name, source }`.
 * @param override - The value-object's own `redactWith`, if it declared one.
 * @returns The replacement to serialize in place of the real value.
 */
export function redactedValue(
	value: unknown,
	context: IValueObjectContext,
	override?: RedactionPlaceholder,
): unknown {
	const placeholder = override === undefined ? current.placeholder : override;

	return typeof placeholder === "function"
		? placeholder(value, context)
		: placeholder;
}
