/**
 * @module @roastery/beans/way/collections/value-objects/custom
 *
 * Roastery Way alias onto
 * `@roastery/beans/domain/collections/value-objects/custom` — the exact
 * same factories, re-exported here so a `way`-built blueprint reaches them
 * from one path. Kept in sync by hand with the domain barrel it mirrors;
 * every name below is a straight re-export, not a copy.
 *
 * Re-exports: {@link defineValueObject} (the core factory), plus its thin
 * wrappers {@link customArrayVO}, {@link customEnumVO}, {@link customNumberVO},
 * {@link customObjectVO}, {@link customRecordVO}, {@link customStringVO},
 * {@link nullableVO}, {@link optionalVO} — for a one-off constraint that
 * doesn't deserve a file of its own.
 */

export {
	customArrayVO,
	customEnumVO,
	customNumberVO,
	customObjectVO,
	customRecordVO,
	customStringVO,
	defineValueObject,
	nullableVO,
	optionalVO,
} from "@/domain/collections/value-objects/custom";
