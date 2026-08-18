import { DateTimeVO, UuidVO } from "@/domain/collections/value-objects";
import type { BaseContext } from "../types/base-context.type";
import type { IRawEntity } from "../types";

/**
 * Builds the identity slice of an entity's context: a fresh identity when the
 * payload carried none, validated value-objects over the given one otherwise.
 *
 * The fresh branch goes through `UuidVO.generate` and `DateTimeVO.now` — the
 * value-objects' own demo mode, which draws from the `[Meta].default` thunks
 * they already declare (`generateUUID` and the current instant) and validates
 * the result like any other value. Generating a raw string only to re-wrap it
 * would say the same thing twice.
 *
 * @param source - Entity-type name, for error context.
 * @param raw - The extracted identity, if the payload carried one.
 * @returns The three identity fields, each backed by its value-object.
 *
 * @throws `InvalidPropertyException` — when a given identity field is malformed.
 *
 * @see {@link extractIdentity} — raises `IncompleteIdentityException` earlier,
 *   when the payload carries only part of an identity.
 */
export function buildBaseContext(
	source: string,
	raw?: IRawEntity,
): BaseContext {
	if (!raw)
		return {
			id: UuidVO.generate({ name: "id", source }),
			createdAt: DateTimeVO.now({ name: "createdAt", source }),
			updatedAt: undefined,
		};

	return {
		id: new UuidVO(raw.id, { name: "id", source }),
		createdAt: new DateTimeVO(raw.createdAt, {
			name: "createdAt",
			source,
		}),
		updatedAt: raw.updatedAt
			? new DateTimeVO(raw.updatedAt, { name: "updatedAt", source })
			: undefined,
	};
}
