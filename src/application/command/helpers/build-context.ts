import type { IValueObjectContext } from "@/domain/value-object/types";
import { UnprocessableContentException } from "@roastery/terroir/exceptions/application";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { applyRuleDefaults } from "@/shared/helpers/apply-rule-defaults";
import { isValueObjectClass } from "@/shared/helpers/is-value-object-class";
import { rawOf } from "@/shared/helpers/raw-of";
import { rulesOf } from "@/shared/helpers/rules-of";
import type { AnyValueObjectClass } from "../types/any-value-object-class.type";
import type { CommandContextOf } from "../types/command-context-of.type";
import type { CommandPropertiesShapeBase } from "../types/command-properties-shape-base.type";

type AnyValueObject = AnyValueObjectClass["prototype"];

type LooseRule = {
	readonly default?: unknown;
	readonly derive?: (raw: Readonly<Record<string, unknown>>) => unknown;
};

/**
 * Builds one blueprint property: constructs its value-object (or nested
 * record) from the raw input, or falls back to `.demo()` in demo mode.
 *
 * A record-valued key takes a different branch: it constructs from a single
 * payload argument and its `demo()` takes none, where a value-object needs the
 * `{ name, source }` identification context. It is also **not** wrapped in the
 * re-tagging `try`/`catch` below — a record builds its own properties through
 * the domain machinery and any failure inside it already carries that
 * property's own name and source, which is more precise than what re-tagging
 * at this level could say.
 *
 * A raw-value construction that fails validation crosses the boundary a
 * `Command` exists to guard: `ValueObject.validate()` throws the
 * domain-layer `InvalidPropertyException` (the same exception an `Entity`'s
 * own construction would throw), but the property here failed because of
 * input to an application-layer command, not because a domain invariant was
 * broken — so it is caught and re-thrown as the application-layer
 * `UnprocessableContentException`, wrapping the original as `cause`. Demo
 * mode never hits this: a `meta.default` is required to already pass its
 * own schema, so `.demo()` cannot fail this way.
 *
 * @param properties - The command's blueprint.
 * @param source - Command-type name, used as the property's validation context.
 * @param key - The blueprint key being built.
 * @param value - The raw input for this key (already defaulted, if a rule applied).
 * @param useDefault - Whether to build via `.demo()` instead of the raw value.
 * @returns The built value-object instance.
 *
 * @throws `UnprocessableContentException` — when the raw value fails the
 *   property's own validation.
 */
function buildProperty(
	properties: CommandPropertiesShapeBase,
	source: string,
	key: string,
	value: unknown,
	useDefault: boolean,
): AnyValueObject {
	const propertyClass = properties[key];

	if (!isValueObjectClass(propertyClass))
		return useDefault
			? (propertyClass as unknown as { demo(): AnyValueObject }).demo()
			: (new (
					propertyClass as unknown as new (
						payload: never,
					) => AnyValueObject
				)(value as never) as AnyValueObject);

	const context: IValueObjectContext = { name: key, source };

	if (useDefault)
		return (
			propertyClass as unknown as {
				demo(context: IValueObjectContext): AnyValueObject;
			}
		).demo(context);

	try {
		return new (
			propertyClass as unknown as new (
				value: never,
				context: IValueObjectContext,
			) => AnyValueObject
		)(value as never, context);
	} catch (error) {
		if (error instanceof InvalidPropertyException)
			throw new UnprocessableContentException(
				source,
				`Command: the property "${key}" in "${source}" failed validation.`,
				{ cause: error },
			);
		throw error;
	}
}

/**
 * Builds the full property map of a `Command`: every blueprint key resolved
 * through explicit value → rule `default` → rule `derive`, in that order,
 * mirroring the entity pillar's own resolution — minus the identity fields
 * and the cycle guard neither applies to a value-object-only blueprint.
 *
 * @typeParam Shape - The command's blueprint shape.
 *
 * @param properties - The command's blueprint.
 * @param source - Command-type name, used as each property's validation context.
 * @param raw - The construction payload, or `undefined` in demo mode.
 * @param useDefault - Whether unset properties fall back to `.demo()`.
 * @returns The built property map — the command's `[Context]`.
 */
export function buildContext<Shape extends CommandPropertiesShapeBase>(
	properties: Shape,
	source: string,
	raw: Record<string, unknown> | undefined,
	useDefault: boolean,
): CommandContextOf<Shape> {
	const rules = rulesOf(properties) as Record<string, LooseRule | undefined>;
	const values = applyRuleDefaults(rules, raw ?? {});
	const built: Record<string, AnyValueObject> = {};
	const pending: string[] = [];

	for (const key of Object.keys(properties)) {
		if (values[key] === undefined && rules[key]?.derive !== undefined) {
			pending.push(key);
			continue;
		}
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
		values[key] = derive?.(values);
		built[key] = buildProperty(properties, source, key, values[key], false);
		values[key] = rawOf(built[key]);
	}

	return built as CommandContextOf<Shape>;
}
