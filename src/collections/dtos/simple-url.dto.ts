import { t } from "@roastery/terroir";

/**
 * TypeBox schema for any-protocol URI strings (e.g. `redis://`, `mongodb://`,
 * `s3://`) — the looser sibling of {@link UrlDTO}, which restricts to HTTP/HTTPS.
 *
 * Validation is delegated to the `"simple-url"` format registered in
 * `@roastery/terroir/schema/formats`. Use this DTO for connection strings and
 * non-browser URIs; reach for {@link UrlDTO} when you need a URL safe to embed
 * in a web page.
 *
 * @see {@link SimpleUrlSchema}
 * @see {@link UrlDTO} — HTTP/HTTPS-only counterpart.
 */
export const SimpleUrlDTO = t.String({
	description:
		"A URI of any protocol (HTTP, Redis, Mongo, etc.). Use UrlDTO for HTTP/HTTPS-only.",
	examples: ["redis://localhost:6739"],
	format: "simple-url",
});

/** Static type of {@link SimpleUrlDTO} — equivalent to `string`. */
export type SimpleUrlDTO = t.Static<typeof SimpleUrlDTO>;
