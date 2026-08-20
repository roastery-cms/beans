import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for whole numbers of either sign.
 *
 * Emits `type: "integer"` in the JSON Schema — a real type constraint, not
 * the `multipleOf: 1` divisibility rule `customNumberVO` can express — so an
 * adapter reading the derived schema can pick an integer column.
 *
 * Note the schema itself **rejects** a float: it is `IntegerVO`'s `transform`
 * that truncates one into range before validation ever runs.
 */
export const IntegerSchema = t.Integer({
	description: "A whole number, of either sign.",
	examples: [42],
});

/** Static type of {@link IntegerSchema} — equivalent to `number`. */
export type IntegerSchema = ToDTO<typeof IntegerSchema>;
