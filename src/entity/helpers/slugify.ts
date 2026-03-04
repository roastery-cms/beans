import slug from "slugify";

export function slugify(target: string): string {
	return slug(target, {
		lower: true,
		strict: true,
		trim: true,
	});
}
