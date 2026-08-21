import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { AnyRecordClass } from "./any-record-class.type";
import type { RecordDomainKeys } from "./record-domain-keys.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";
import type { RecordRawValueOf } from "./record-raw-value-of.type";

/**
 * What a record's `get` returns for one key: the nested **instance** for an
 * entity- or record-valued property (so reads chain into their verbs), and the
 * wrapped raw value for a value-object property.
 *
 * The entity's `ReadValueOf` opens with a `Key extends keyof IRawEntity`
 * branch for the identity fields. There is none here — a record's readable
 * keys are exactly its blueprint keys, nothing more.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 * @typeParam Key - The key being read.
 *
 * @see {@link RecordAccessorsOf} — the derived accessors mirror this type.
 */
export type RecordReadValueOf<
	PropertiesShape extends RecordPropertiesShapeBase,
	Key extends RecordDomainKeys<PropertiesShape>,
> = PropertiesShape[Key] extends AnyEntityClass
	? PropertiesShape[Key]["prototype"]
	: PropertiesShape[Key] extends AnyRecordClass
		? PropertiesShape[Key]["prototype"]
		: RecordRawValueOf<PropertiesShape[Key]>;
