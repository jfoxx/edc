# Stale Content Finder

Find pages whose `last-modified` metadata is at least the selected number of
calendar months old. The starting path defaults to `/`; the age threshold defaults
to 6 months and accepts whole numbers from 1 to 60. An empty threshold uses 6.

The app preserves recursive discovery, batched metadata checks, cancellation,
oldest-first results, edit and preview links, and CSV export of all or selected
results. Selection is retained while results arrive and reset on a new scan.
Missing or unparseable modification metadata is skipped.

Both CSV exports include `Path`, `Name`, `Last Modified`, and `Months Ago` columns.

## UI

The app loads the experimental, evergreen
[Experience Workspace UI SDK](https://www.aem.live/docs/ew/developing/sdk-ui-components).
It uses `sl-input` for path and age inputs and `sl-button` for scan, cancel,
selection, exports, and result actions. Native, labelled checkboxes retain reliable
selection and CSV behavior. Cards, progress, feedback, and results use Spectrum 2
tokens with system-font fallbacks; Typekit is not required.

Colors use the SDK's available light-theme palette: orange-200/900 for stale
content, green-900 for success, red-900 for errors, and blue-900 for actions.
Color fallbacks match those SDK palette values. The SDK does not expose a white
surface token, so cards use `--stale-surface-background`, defaulting to Spectrum's
static white. Filled feedback messages also use static white text. Dark-theme
support is not implied by this light-theme palette.

In Experience Workspace, the app uses the SDK's site context and authentication.
Standalone preview uses the existing test context, not authenticated site data.
Live scans require the app to be opened from Experience Workspace.

## Validation

```sh
npx --no-install eslint --no-ignore tools/stale-content/stale-content.js
npx --no-install stylelint tools/stale-content/stale-content.css
```
