import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for HTTP/HTTPS URL strings.
 *
 * Validation is delegated to the `"url"` format registered in
 * `@roastery/terroir/schema/formats`. For non-browser URIs (e.g. `redis://`,
 * `s3://`) reach for {@link SimpleUrlSchema} instead.
 *
 * @see {@link UrlVO}
 * @see {@link SimpleUrlSchema} — any-protocol counterpart.
 */
export const UrlSchema = t.String({
	description: "An HTTP/HTTPS URL.",
	examples: ["https://example.com/cover.jpg"],
	format: "url",
});

/** Static type of {@link UrlSchema} — equivalent to `string`. */
export type UrlSchema = ToDTO<typeof UrlSchema>;
