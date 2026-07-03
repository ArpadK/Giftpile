## ADDED Requirements

### Requirement: Backend link-preview proxy
The system SHALL provide a `GET /api/link-preview?url=<encoded-url>` endpoint that fetches OpenGraph metadata from the given URL server-side and returns `{ "imageUrl": "<url>" | null }`. The endpoint SHALL only be accessible to authenticated users.

#### Scenario: URL with og:image
- **WHEN** an authenticated user requests a link preview for a URL whose page contains an `og:image` meta tag
- **THEN** the endpoint returns `{ "imageUrl": "<og:image value>" }`

#### Scenario: URL with twitter:image fallback
- **WHEN** a URL has no `og:image` but has a `twitter:image` meta tag
- **THEN** the endpoint returns `{ "imageUrl": "<twitter:image value>" }`

#### Scenario: URL with no preview image
- **WHEN** a URL has neither `og:image` nor `twitter:image`
- **THEN** the endpoint returns `{ "imageUrl": null }`

#### Scenario: URL unreachable or non-HTML
- **WHEN** the target URL times out, returns a non-2xx status, or returns non-HTML content
- **THEN** the endpoint returns `{ "imageUrl": null }` (does not propagate an error to the client)

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated request is made to `/api/link-preview`
- **THEN** the system returns HTTP 401

### Requirement: URL scheme validation
The system SHALL only proxy requests for `http://` and `https://` URLs. Private/loopback IP ranges (RFC 1918, 127.x.x.x, ::1) SHALL be blocked to prevent SSRF.

#### Scenario: Non-http scheme rejected
- **WHEN** the URL parameter uses a scheme other than `http` or `https` (e.g. `file://`, `ftp://`)
- **THEN** the endpoint returns HTTP 400 with an error message

#### Scenario: Private IP blocked
- **WHEN** the URL resolves to a private or loopback IP address
- **THEN** the endpoint returns HTTP 400 and does not make the outbound request

### Requirement: In-memory response cache
The system SHALL cache link-preview results in memory (LRU, 100 entries, 1-hour TTL) to avoid refetching the same URL on every page load.

#### Scenario: Cache hit
- **WHEN** the same URL is requested within the cache TTL
- **THEN** the cached result is returned without making an outbound HTTP request

#### Scenario: Cache miss
- **WHEN** a URL is not in the cache or its entry has expired
- **THEN** the system fetches the URL, parses the result, stores it in the cache, and returns it

### Requirement: Gift card cover image display
The system SHALL render a 140px-tall cover image at the top of a gift card (using `object-fit: cover`) when the gift has a `link` field and the link-preview endpoint returns a non-null `imageUrl`. If `imageUrl` is null or the link field is absent, no image area is shown.

#### Scenario: Gift with link and fetchable preview
- **WHEN** a gift card is rendered with a link whose preview returns an image URL
- **THEN** a 140px-tall image is displayed at the top of the card

#### Scenario: Gift with link but no preview image
- **WHEN** a gift card is rendered with a link whose preview returns null
- **THEN** no image area is rendered; the card body starts at the top

#### Scenario: Gift without link
- **WHEN** a gift card is rendered with no link field
- **THEN** no link-preview fetch is triggered and no image area is shown
