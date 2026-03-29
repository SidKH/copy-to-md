# Architecture

## Overview

The extension is structured around a capture-boundary pipeline.

The popup UX is shared across all supported websites. It always follows the same interaction model:

- the user opens a supported post page
- the user clicks the extension
- the popup loads capture data for the active tab
- the popup shows token count
- the user clicks `Copy markdown`

Site-specific behavior is isolated behind site captures. Each site capture owns:

- URL detection
- transport coordination
- payload parsing and normalization
- site-specific markdown formatting
- any page-side integration needed by that site

The shared system is responsible for orchestration and presentation, not site-specific capture internals.

## Design Principles

- Keep the popup visually generic.
- Keep site-specific capture logic co-located and site-owned.
- Standardize the capture flow, not the markdown structure.
- Treat third-party transport as an explicit provider-owned dependency.
- Prefer behavior-focused integration tests over implementation-heavy unit tests.

## System Boundaries

The extension is split into three main runtime areas:

- popup
- background
- site captures

### Popup

The popup is a generic UI layer. It does not know about Reddit, Twitter/X, Discord, or any future site capture.

Its responsibilities are:

- loading state
- unsupported state
- error state
- success state
- token counting
- clipboard copy

The popup only consumes a generic capture result.

### Background

The background layer is the shared orchestrator. It coordinates the active tab and delegates capture execution.

Its responsibilities are:

- resolve the active tab
- invoke the capture registry
- convert failures into consistent popup-facing states

The background layer does not contain site-specific transport, parsing, or formatting logic.

### Site Captures

A site capture encapsulates the full capture use case for one site.

Its responsibilities are:

- determine whether a request is supported
- retrieve external payloads through a transport port
- parse and normalize site data internally
- generate markdown from that site’s data
- optionally run page-side helpers such as content scripts or page bridges

Each site capture is free to use a different retrieval technique. The system does not require site captures to normalize their content into one shared document model.

## Capture Flow

The extension uses a single shared pipeline:

```txt
popup -> background -> registry -> site capture -> popup
```

Detailed flow:

1. The popup opens.
2. The popup requests capture data for the active tab.
3. The background retrieves the active tab URL and ID.
4. The background delegates to the capture registry.
5. The first site capture that supports the request performs the full capture flow.
7. The background returns the capture result to the popup.
8. The popup renders the shared success UI and allows copy.

If no site capture supports the page, the system returns `unsupported`.

## Shared Contracts

The popup-facing contract is intentionally small.

```ts
type CaptureResult = {
  markdown: string;
  sourceUrl: string;
};
```

Popup state:

```ts
type CaptureState =
  | { state: "loading" }
  | { state: "unsupported"; activeUrl: string | null }
  | { state: "error"; error: string }
  | { state: "success"; result: CaptureResult };
```

This keeps the UI generic and stable even when site captures differ significantly in their payload shape or markdown format.

## Capture Contract

Site captures share a minimal interface:

```ts
type CaptureRequest = {
  tabId: number;
  url: string;
};

type SiteCapture = {
  id: string;
  tryCapture(request: CaptureRequest): Promise<CaptureResult | null>;
};

type RedditTransport = {
  fetchThreadPayload(threadUrl: string): Promise<unknown>;
};
```

This keeps the caller-facing boundary deep and use-case-oriented while leaving a narrow injectable seam for third-party transport.

## File Structure

```txt
src/
  popup/
    main.tsx
    App.tsx
    useActiveCapture.ts

  background/
    index.ts
    messages.ts

  core/
    provider.ts
    registry.ts
    errors.ts

  providers/
    reddit/
      index.ts
      detect.ts
      transport.ts
      markdown.ts
      types.ts

    twitter/
      index.ts
      detect.ts
      extract.ts
      markdown.ts
      content-script.ts
      page-bridge.ts
      types.ts

    discord/
      index.ts
      detect.ts
      extract.ts
      markdown.ts
      content-script.ts
      page-bridge.ts
      types.ts

  lib/
    tokens.ts
    utils.ts
```

## File Responsibilities

### `src/popup/main.tsx`

Bootstraps the popup application.

### `src/popup/App.tsx`

Renders the shared popup UI. It is provider-agnostic and only works with generic popup state.

### `src/popup/useActiveCapture.ts`

Loads capture state for the active tab by talking to the background layer.

### `src/background/index.ts`

Implements the shared orchestration flow:

- active tab lookup
- registry delegation
- error handling

### `src/background/messages.ts`

Defines message names shared between popup, background, and any site-owned page-side code.

### `src/core/provider.ts`

Defines shared capture contracts and types.

### `src/core/registry.ts`

Registers all site captures and exposes the shared capture registry.

### `src/core/errors.ts`

Defines shared error types used to represent unsupported pages, extraction failures, and formatting failures.

### `src/providers/<provider>/detect.ts`

Contains provider-specific URL detection logic.

### `src/providers/<provider>/extract.ts`

Contains provider-specific transport logic.

Examples:

- Reddit can use public fetch behind a transport port
- Twitter/X can use authenticated request replay
- Discord can use page-side integration plus authenticated request replay

### `src/providers/<provider>/markdown.ts`

Contains provider-specific markdown generation.

Markdown is intentionally provider-owned rather than globally normalized.

### `src/providers/<provider>/content-script.ts`

Contains provider-owned content-script code when a provider needs DOM access, runtime app state, or request interception.

### `src/providers/<provider>/page-bridge.ts`

Contains provider-owned page-context integration when a provider needs access beyond content-script boundaries.

### `src/providers/<provider>/index.ts`

Exports the assembled site capture.

## Provider-Owned Page Integration

Page-side code lives inside the provider folder rather than in one shared top-level content-script area.

This keeps site-specific logic localized:

- capture detection
- transport coordination
- markdown generation
- page-side integration

The rule is that provider-owned page-side files gather or bridge data, but do not take over shared orchestration or popup behavior.

## Unsupported Pages

A page is unsupported when no site capture recognizes it as a supported post page.

Examples:

- a non-supported host
- a supported host on a non-post route
- a page shape the site capture intentionally does not handle

Unsupported pages return the shared `unsupported` state to the popup.

## Markdown Ownership

Markdown formatting is site-specific.

This is an intentional architectural choice. Different sites carry different semantics and should not be forced into one markdown schema prematurely.

Examples:

- Reddit markdown can emphasize post body and comment nesting
- Twitter/X markdown can emphasize the root post and engagement context
- Discord markdown can emphasize ordered messages or thread messages

The popup remains unchanged because it only needs the final markdown string.

## Testing Strategy

The test suite is structured around behavior.

The primary test layers are:

- site capture boundary tests
- background orchestration tests
- lightweight popup behavior tests

### Site Capture Boundary Tests

These are the main tests for site-specific behavior.

Typical shape:

```txt
request -> site capture result
```

These tests verify:

- unsupported URLs return `null`
- supported content is rendered correctly
- nested structures are preserved correctly
- deleted or missing content is handled correctly
- transport failures surface correctly
- site-specific markdown output stays stable

### Background Orchestration Tests

These tests verify the shared capture pipeline:

- active tab lookup
- capture registry delegation
- unsupported state
- capture failure handling
- successful result delivery to the popup layer

### Popup Tests

Popup tests focus on visible behavior:

- loading renders
- unsupported renders
- success renders
- copy writes markdown to the clipboard

The popup is not tested heavily for internal implementation details.

## Extensibility

Adding a new site capture should require:

- creating a new provider folder
- implementing its capture boundary, transport, and markdown logic
- registering it in the capture registry

The popup and shared orchestration flow remain unchanged.

This lets the architecture support providers with very different retrieval strategies without forcing a shared content model too early.

## Summary

The architecture is centered on a shared capture pipeline with deep site-owned capture boundaries.

- The popup is generic.
- The background orchestrates.
- The provider owns capture behavior.
- Markdown is provider-specific.
- Unsupported pages return a shared unsupported state.

This structure keeps the user experience consistent while allowing the implementation details to vary by website.
