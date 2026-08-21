import type { AnyPropertyRule } from "@/domain/entity/types/any-property-rule.type";
import type { IValueObjectContext } from "@/domain/value-object/types";
import { applyRuleDefaults } from "@/shared/helpers/apply-rule-defaults";
import { cycleError } from "@/shared/helpers/cycle-error";
import { isValueObjectClass } from "@/shared/helpers/is-value-object-class";
import { rawOf } from "@/shared/helpers/raw-of";
import type { AnySetHandlers } from "@/shared/helpers/read-set-handlers";
import { rulesOf } from "@/shared/helpers/rules-of";
import type { RecordContextOf } from "../types/record-context-of.type";
import type { RecordInputValuesOf } from "../types/record-input-values-of.type";
import type { RecordPropertiesShapeBase } from "../types/record-properties-shape-base.type";

/** Blueprints currently being constructed — the cycle guard of {@link buildContext}. */
const constructing = new Set<RecordPropertiesShapeBase>();

/**
 * Builds one blueprint property: a value-object from its raw value, a nested
 * entity or record from its raw payload, or any of them in demo mode when
 * `useDefault` is set.
 *
 * Entity and record take the **same** branch: both construct from a single
 * payload argument and both expose a no-argument `demo()`. Only a value-object
 * differs, needing the `{ name, source }` identification context — which is
 * why the discriminant here is `isValueObjectClass` and not a three-way test.
 *
 * @param properties - The blueprint the key belongs to.
 * @param source - Record-type name, for error context.
 * @param key - The property being built.
 * @param value - The raw input value (ignored in demo mode).
 * @param useDefault - Whether to build through the class's demo mode.
 * @returns The built instance.
 *
 * @throws `InvalidPropertyException` — when the value fails the property's
 *   validation.
 */
function buildProperty(
	properties: RecordPropertiesShapeBase,
	source: string,
	key: string,
	value: unknown,
	useDefault: boolean,
): unknown {
	const propertyClass = properties[key] as unknown;

	if (!isValueObjectClass(propertyClass))
		return useDefault
			? (propertyClass as { demo(): unknown }).demo()
			: new (propertyClass as new (payload: never) => unknown)(value as never);

	const context: IValueObjectContext = { name: key, source };

	return useDefault
		? (
				propertyClass as unknown as {
					demo(context: IValueObjectContext): unknown;
				}
			).demo(context)
		: new (
				propertyClass as unknown as new (
					value: never,
					context: IValueObjectContext,
				) => unknown
			)(value as never, context);
}

/**
 * Builds a record's full context — one built property per blueprint key —
 * applying the blueprint's domain rules and guarding against blueprint cycles.
 * The guard releases on the way out, so two properties of the *same* class in
 * one blueprint (siblings, not a cycle) keep working.
 *
 * The entity counterpart opens by resolving the identity slice through
 * `extractIdentity`/`buildBaseContext` and spreading it under the built
 * properties. There is none here — the returned context *is* the built
 * properties, which is the construction-time shape of "a record has no
 * identity".
 *
 * Rules resolve in three steps, and the order is the contract: an explicit
 * value always wins, then the record-level `default` fills what is missing,
 * then each `derive` runs over what the previous steps produced. Derivations
 * are deferred to a second pass in **blueprint order**, so a derivation reads
 * its siblings already built and normalised.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @param properties - The blueprint to build from.
 * @param source - Record-type name, for error context.
 * @param raw - The raw payload (`undefined` in demo mode).
 * @param useDefault - Whether the properties no rule covers fall back to their
 *   demo defaults.
 * @param handlers - The `onSet` map, run per key just before its value is
 *   built. A handler only fires for a key that has a raw value to set, so a
 *   demo-mode fallback fires nothing.
 * @returns The built context.
 *
 * @throws `CyclicEntityDefinitionException` — when the blueprint references itself.
 * @throws `InvalidPropertyException` — when a value fails validation.
 *
 * @see `applyRuleDefaults` in `@/shared/helpers/apply-rule-defaults` — the first step.
 */
export function buildContext<PropertiesShape extends RecordPropertiesShapeBase>(
	properties: PropertiesShape,
	source: string,
	raw: Record<string, unknown> | undefined,
	useDefault: boolean,
	handlers: AnySetHandlers,
): RecordContextOf<PropertiesShape> {
	if (constructing.has(properties)) throw cycleError(source, "Record");

	constructing.add(properties);

	try {
		const rules = rulesOf(properties) as Record<
			string,
			AnyPropertyRule | undefined
		>;

		const values = applyRuleDefaults(rules, raw ?? {});
		const built: Record<string, unknown> = {};
		const pending: string[] = [];

		for (const key of Object.keys(properties)) {
			if (values[key] === undefined && rules[key]?.derive !== undefined) {
				pending.push(key);
				continue;
			}

			if (values[key] !== undefined)
				handlers[key]?.(values[key] as never, values as never);

			built[key] = buildProperty(
				properties,
				source,
				key,
				values[key],
				useDefault && values[key] === undefined,
			);

			values[key] = rawOf(built[key]);
		}

		for (const key of pending) {
			const derive = rules[key]?.derive;

			values[key] = derive?.(
				values as unknown as Readonly<RecordInputValuesOf<PropertiesShape>>,
			);

			if (values[key] !== undefined)
				handlers[key]?.(values[key] as never, values as never);

			built[key] = buildProperty(properties, source, key, values[key], false);

			values[key] = rawOf(built[key]);
		}

		return built as RecordContextOf<PropertiesShape>;
	} finally {
		constructing.delete(properties);
	}
}

export { buildProperty };
