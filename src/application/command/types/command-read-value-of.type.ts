import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { CommandDomainKeys } from "./command-domain-keys.type";
import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";
import type { CommandRawValueOf } from "./command-raw-value-of.type";
import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { WrappedReadOf } from "@/domain/wrapper/types/wrapped-read-of.type";
import type { WrapperKind } from "@/domain/wrapper/types/wrapper-kind.type";

/**
 * What a command's `get` returns for one key: the **unwrapped** contents for
 * a multiplicity wrapper, the nested **instance** for a record-valued property
 * (so its verbs stay reachable), the wrapped raw value for a value-object
 * property.
 *
 * A command never mutates, so a record read off one is only ever asked
 * questions — but those questions are exactly what the record exists to
 * answer, and flattening it to its serialized form here would throw them away.
 *
 * @typeParam Shape - The command's blueprint shape.
 * @typeParam Key - The key being read.
 *
 * @see {@link CommandAccessorsOf} — the derived accessors mirror this type.
 */
export type CommandReadValueOf<
	Shape extends CommandPropertiesShapeBase,
	Key extends CommandDomainKeys<Shape>,
> = Shape[Key] extends {
	readonly wrapperKind: infer Kind extends WrapperKind;
	readonly wraps: infer Inner extends WrappableClass;
}
	? WrappedReadOf<Kind, Inner>
	: Shape[Key] extends AnyRecordClass
		? Shape[Key]["prototype"]
		: CommandRawValueOf<Shape[Key]>;
