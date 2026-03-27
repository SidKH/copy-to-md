# Architecture

## Overview

The extension is structured around a provider-based capture pipeline.

The popup UX is shared across all supported websites. It always follows the same interaction model:

- the user opens a supported post page
- the user clicks the extension
- the popup loads capture data for the active tab
- the popup shows token count
- the user clicks `Copy markdown`

Site-specific behavior is isolated behind providers. Each provider owns:

- URL detection
- data extraction
- site-specific markdown formatting
- any page-side integration needed by that site

The shared system is responsible for orchestration and presentation, not site-specific capture logic.

## Design Principles

- Keep the popup visually generic.
- Keep provider logic co-located and provider-owned.
- Standardize the capture flow, not the markdown structure.
- Treat extraction strategy as provider-specific.
- Prefer behavior-focused integration tests over implementation-heavy unit tests.

## System Boundaries

The extension is split into three main runtime areas:

- popup
- background
- providers

### Popup

The popup is a generic UI layer. It does not know about Reddit, Twitter/X, Discord, or any future provider.

Its responsibilities are:

- loading state
- unsupported state
- error state
- success state
- token counting
- clipboard copy

The popup only consumes a generic capture result.

### Background

The background layer is the shared orchestrator. It coordinates the full capture flow for the active tab.

Its responsibilities are:

- resolve the active tab
- select the matching provider
- invoke provider extraction
- invoke provider markdown generation
- convert failures into consistent popup-facing states

The background layer does not contain provider-specific parsing or formatting logic.

### Providers

A provider encapsulates all logic for one site.

Its responsibilities are:

- determine whether a URL is supported
- extract the site’s raw data
- generate markdown from that site’s raw data
- optionally run page-side helpers such as content scripts or page bridges

Each provider is free to use a different extraction technique. The system does not require providers to normalize their content into one shared document model.

## Capture Flow

The extension uses a single shared pipeline:

```txt
popup -> background -> provider -> markdown -> popup
```

Detailed flow:

1. The popup opens.
2. The popup requests capture data for the active tab.
3. The background retrieves the active tab URL and ID.
4. The background selects the first provider that supports the URL.
5. The provider extracts raw site data.
6. The provider converts that raw data into markdown.
7. The background returns the capture result to the popup.
8. The popup renders the shared success UI and allows copy.

If no provider supports the page, the system returns `unsupported`.

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

This keeps the UI generic and stable even when providers differ significantly in their payload shape or markdown format.

## Provider Contract

Providers share a minimal interface:

```ts
type ProviderContext = {
  tabId: number;
  url: string;
};

type Provider = {
  id: string;
  supports(url: string): boolean;
  extract(ctx: ProviderContext): Promise<unknown>;
  toMarkdown(raw: unknown, ctx: ProviderContext): string;
};
```

This contract deliberately avoids a deep shared normalization model.

Different providers may expose different raw data shapes and different markdown conventions. The common architecture is the capture pipeline itself, not a universal content schema.

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
      extract.ts
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
- provider selection
- extraction
- markdown generation
- error handling

### `src/background/messages.ts`

Defines message names shared between popup, background, and any provider-owned page-side code.

### `src/core/provider.ts`

Defines shared provider contracts and types.

### `src/core/registry.ts`

Registers all providers and exposes provider lookup helpers.

### `src/core/errors.ts`

Defines shared error types used to represent unsupported pages, extraction failures, and formatting failures.

### `src/providers/<provider>/detect.ts`

Contains provider-specific URL detection logic.

### `src/providers/<provider>/extract.ts`

Contains provider-specific extraction logic.

Examples:

- Reddit can use public fetch
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

Exports the assembled provider.

## Provider-Owned Page Integration

Page-side code lives inside the provider folder rather than in one shared top-level content-script area.

This keeps site-specific logic localized:

- provider detection
- extraction
- markdown generation
- page-side integration

The rule is that provider-owned page-side files gather or bridge data, but do not take over shared orchestration or popup behavior.

## Unsupported Pages

A page is unsupported when no provider recognizes it as a supported post page.

Examples:

- a non-supported host
- a supported host on a non-post route
- a page shape the provider intentionally does not handle

Unsupported pages return the shared `unsupported` state to the popup.

## Markdown Ownership

Markdown formatting is provider-specific.

This is an intentional architectural choice. Different sites carry different semantics and should not be forced into one markdown schema prematurely.

Examples:

- Reddit markdown can emphasize post body and comment nesting
- Twitter/X markdown can emphasize the root post and engagement context
- Discord markdown can emphasize ordered messages or thread messages

The popup remains unchanged because it only needs the final markdown string.

## Testing Strategy

The test suite is structured around behavior.

The primary test layers are:

- provider integration tests
- background orchestration tests
- a small number of detection tests
- lightweight popup behavior tests

### Provider Integration Tests

These are the main tests for provider behavior.

Typical shape:

```txt
raw fixture -> provider markdown output
```

These tests verify:

- supported content is rendered correctly
- nested structures are preserved correctly
- deleted or missing content is handled correctly
- provider-specific markdown output stays stable

### Background Orchestration Tests

These tests verify the shared capture pipeline:

- active tab lookup
- provider selection
- unsupported state
- provider failure handling
- successful result delivery to the popup layer

### Detection Tests

These remain small and cheap:

- supported route
- unsupported route
- unsupported host

### Popup Tests

Popup tests focus on visible behavior:

- loading renders
- unsupported renders
- success renders
- copy writes markdown to the clipboard

The popup is not tested heavily for internal implementation details.

## Extensibility

Adding a new provider should require:

- creating a new provider folder
- implementing its detection, extraction, and markdown logic
- registering it in the provider registry

The popup and shared orchestration flow remain unchanged.

This lets the architecture support providers with very different extraction strategies without forcing a shared content model too early.

## Summary

The architecture is centered on a shared capture pipeline with provider-owned site logic.

- The popup is generic.
- The background orchestrates.
- The provider owns capture behavior.
- Markdown is provider-specific.
- Unsupported pages return a shared unsupported state.

This structure keeps the user experience consistent while allowing the implementation details to vary by website.
