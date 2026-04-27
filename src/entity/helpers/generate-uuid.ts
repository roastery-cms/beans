import { uuid } from "@roastery/terroir";

export function generateUUID(): string {
	return uuid.v7();
}
