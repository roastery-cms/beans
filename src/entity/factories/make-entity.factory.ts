import type { EntityDTO } from "@/entity/dtos";
import { generateUUID } from "@/entity/helpers";

export function makeEntity(): EntityDTO {
	return {
		id: generateUUID(),
		createdAt: new Date().toISOString(),
		updatedAt: undefined,
	};
}
