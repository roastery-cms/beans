import { t } from "@roastery/terroir";

/**
 * TypeBox schema for HTTP/HTTPS URL strings.
 *
 * Validation is delegated to the `"url"` format registered in
 * `@roastery/terroir/schema/formats`. For non-browser URIs (e.g. `redis://`,
 * `s3://`) reach for {@link SimpleUrlDTO} instead.
 *
 * @see {@link UrlSchema}
 * @see {@link UrlVO}
 * @see {@link SimpleUrlDTO} — any-protocol counterpart.
 */
export const UrlDTO = t.String({
	description: "An HTTP/HTTPS URL.",
	examples: ["https://example.com/cover.jpg"],
	format: "url",
});

/** Static type of {@link UrlDTO} — equivalent to `string`. */
export type UrlDTO = t.Static<typeof UrlDTO>;
