import type { Entity } from "@/entity";
import type { t } from "@roastery/terroir";

export function AutoUpdate<EntityType extends Entity<t.TSchema>>(
	_target: EntityType,
	_propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	const originalMethod = descriptor.value;

	descriptor.value = function (this: EntityType, ...args: unknown[]) {
		const result = originalMethod.apply(this, args);
		this.update();
		return result;
	};

	return descriptor;
}
