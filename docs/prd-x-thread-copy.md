## Problem Statement

Users can currently copy Reddit threads as Markdown, but they cannot do the same for X.com threads. When they are viewing a single X post, they need a way to copy the entire thread, including the full reply tree, into Markdown for notes, documentation, and LLM context. The current extension does not support X URLs, authenticated X session data, or X-specific Markdown formatting.

## Solution

Add an X provider to the extension that activates only on canonical single-post status pages on `x.com` or `twitter.com`. The popup remains unchanged. When the user opens the popup on a supported X post page, the provider captures the authenticated request metadata already used by the page, replays those requests to fetch the full conversation tree, normalizes the results into a thread model, and formats that model as Markdown. The root post and every reply in the tree are included, even when they are not visible in the current viewport. If the page is not a supported single-post page, the popup shows `unsupported`. If extraction or replay fails on a supported page, the popup shows an error state.

## User Stories

1. As an authenticated X user, I want to open the extension on a single post page and copy the full thread as Markdown, so that I can move it into notes or prompts quickly.
2. As an authenticated X user, I want the extension to work only on canonical single-post URLs, so that I get predictable behavior and avoid accidental captures from timelines or search pages.
3. As an authenticated X user, I want the root post included in the output, so that the copied Markdown preserves the full conversation context.
4. As an authenticated X user, I want every reply anywhere in the conversation tree included, so that the export is complete rather than limited to what the page currently renders.
5. As an authenticated X user, I want nested replies preserved as a tree in Markdown, so that I can understand who is replying to whom after export.
6. As an authenticated X user, I want the author handle included for the root post and every reply, so that attribution remains clear.
7. As an authenticated X user, I want the post text included for the root post and every reply, so that the conversation content is preserved.
8. As an authenticated X user, I want the post date included for the root post and every reply, so that the exported thread preserves sequence and timing context.
9. As an authenticated X user, I want retweet counts included for the root post and every reply, so that engagement context is preserved in the export.
10. As an authenticated X user, I want like counts included for the root post and every reply, so that engagement context is preserved in the export.
11. As an authenticated X user, I want media represented as links only, so that the Markdown stays compact and does not depend on embedded rendering.
12. As an authenticated X user, I want quoted-post content omitted from the body beyond whatever outer-post text already contains, so that v1 stays simple and deterministic.
13. As an authenticated X user, I want the popup UI to stay identical to the Reddit flow, so that I do not have to learn a second interaction model.
14. As an authenticated X user, I want token count and copy behavior to work the same way for X as they do for Reddit, so that the extension feels consistent.
15. As an authenticated X user, I want unsupported X surfaces such as timelines, profiles, search results, bookmarks, and repost pages to return `unsupported`, so that the extension fails clearly when the page shape is out of scope.
16. As an authenticated X user, I want capture failures on supported pages to surface as errors, so that I can distinguish a broken extraction from an unsupported page.
17. As an authenticated X user, I want the provider to use my existing browser session rather than a separate login flow, so that the extension remains lightweight and aligned with how X already serves data in-browser.
18. As a maintainer, I want the X provider to fit the existing provider contract, so that the popup and background orchestration remain generic.
19. As a maintainer, I want authenticated request capture isolated behind provider-owned modules, so that X-specific extraction complexity does not leak into shared extension code.
20. As a maintainer, I want the normalized X thread model to be testable independently from Markdown formatting, so that extraction and rendering failures can be diagnosed separately.
21. As a maintainer, I want Markdown snapshots for representative X thread shapes, so that output regressions are caught by tests.
22. As a maintainer, I want provider integration tests around the background flow, so that supported, unsupported, and error states remain stable as the X provider is added.

## Implementation Decisions

- Add a new X provider that conforms to the existing site capture contract and returns only `{ markdown, sourceUrl }` to the shared system.
- Scope support to canonical single-post status pages on `x.com` and `twitter.com`. Timeline, profile, search, bookmark, list, and other non-status surfaces are out of scope.
- Treat repost pages as unsupported for v1. The supported page must be a direct status page for the post being exported.
- Keep the popup UI unchanged. All X-specific behavior lives behind provider-owned detection, extraction, normalization, and Markdown formatting modules.
- Introduce an X URL detector that recognizes supported single-post URLs and rejects unsupported surfaces deterministically.
- Introduce a provider-owned content-script boundary that can observe the page’s authenticated request behavior and collect the request metadata needed to replay X conversation requests.
- Use a provider-owned page bridge when needed to access request details that are not observable directly from the isolated content-script environment.
- Replay captured authenticated requests using the browser session’s request context rather than introducing a separate login flow, token store, or backend service.
- Fetch the full conversation tree for the root post by following the conversation/thread data returned from X and paginating until the tree is complete or the provider reaches a terminal response.
- Normalize X payloads into a deep internal thread model with stable fields for root post, replies, child relationships, text, dates, metrics, and media links.
- Preserve reply-tree structure in the normalized model so Markdown generation can indent nested replies rather than flattening the conversation.
- Format Markdown with a deterministic structure:
- Start with `# Thread`
- Include the source status URL near the top
- Include the root post date near the top
- Emit a replies section containing the root post and all descendants in tree order
- Render each post as one compact line containing `@handle`, date, text, retweet count, like count, and optional links
- Indent nested replies to preserve tree structure
- Represent media as links only. Do not inline images, videos, or quoted-post bodies in v1.
- Ignore quote-post expansion beyond the outer post text and link data available on the main post.
- Surface extraction or replay failures as provider errors so the shared popup can render the existing error state.
- Update extension permissions and host access to include the X domains and any provider-owned page integration needed for authenticated capture.
- Update user-facing documentation and privacy documentation to reflect X support and the fact that authenticated request replay uses the user’s existing X browser session on-device.

## Testing Decisions

- Good tests should verify external behavior and stable contracts: supported URL detection, correct success or unsupported or error states, stable normalized thread behavior, and final Markdown output. Tests should avoid coupling to incidental implementation details such as exact helper composition or internal temporary payload shapes.
- Test the X URL detector with canonical supported status URLs, unsupported X surfaces, malformed URLs, and repost-related edge cases within the chosen detection rules.
- Test the extraction and normalization layer with representative fixture payloads that cover:
- a minimal thread with no replies
- a thread with multiple top-level replies
- deeply nested replies
- replies returned across multiple pagination steps
- posts with media links
- missing or partial optional fields
- transport or replay failures
- Test Markdown formatting with snapshot-style fixtures similar to the existing Reddit provider tests, ensuring stable tree indentation, compact one-line post rendering, and link-only media output.
- Test the provider integration boundary to confirm unsupported URLs return `null`, supported URLs return `{ markdown, sourceUrl }`, and upstream extraction failures reject with a clear error.
- Test background integration to confirm the shared popup-facing states remain unchanged after adding the X provider.
- Prior art for these tests already exists in the codebase:
- provider behavior tests modeled after the Reddit provider tests
- Markdown fixture-based assertions modeled after the Reddit Markdown snapshots
- background orchestration tests modeled after the active-capture background tests

## Out of Scope

- Supporting timeline pages, profile pages, search results, bookmarks, lists, communities, or any X surface other than canonical single-post status pages.
- Supporting unauthenticated users or public-only capture flows.
- Adding popup controls, provider-specific settings, or alternate export formats.
- Special rendering for quoted posts beyond the outer post text and optional links.
- Special handling for reposts or enabling export while viewing repost surfaces.
- Rendering media inline instead of as links.
- Capturing engagement data beyond retweets and likes.
- Guaranteeing support for every future X internal API shape without maintenance updates.

## Further Notes

- The deepest module in this design should be the X extraction and normalization boundary. It should hide request capture, replay, pagination, and payload normalization behind a small interface that the provider can call and the formatter can consume.
- The shared popup and background contracts are already narrow enough for this feature and should not be expanded unless implementation proves that X requires a new cross-provider abstraction.
- Because X relies on authenticated browser-session data, the implementation should prefer narrowly scoped request capture and replay over broad new permissions or storage.
