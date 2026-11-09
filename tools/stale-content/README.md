# Stale Content Finder

Find pages whose `last-modified` metadata is at least the selected number of
calendar months old. The starting path defaults to `/`; the age threshold defaults
to 6 months and accepts whole numbers from 1 to 60. An empty threshold uses 6.

The app preserves recursive discovery, batched metadata checks, cancellation,
oldest-first results, edit and preview links, and CSV export of all or selected
results. Selection is retained while results arrive and reset on a new scan.
Missing or unparseable modification metadata is skipped.

Both CSV exports include `Path`, `Name`, `Last Modified`, and `Months Ago` columns.

## Add to your apps

The app is hosted once and can be registered in other sites without copying its
code. Add a row to your site's Experience Workspace config sheet, **apps** tab:

| title | description | image | path |
| --- | --- | --- | --- |
| `Stale Content Finder` | Find pages with outdated modification metadata | *(optional icon URL)* | `/app/jfoxx/edc/tools/stale-content/stale-content?org={org}&site={site}` |

Replace `{org}` and `{site}` with the organization and site to scan. The shared
app's code stays in `jfoxx/edc`; the query parameters select the **content**
location, not the code repository.

Omit the query parameters to let people choose a location when opening the app:
`/app/jfoxx/edc/tools/stale-content/stale-content`.

## Choose a location

1. Open the app from Experience Workspace and sign in.
2. Enter **Organization** and **Site**, then set the starting path and age.
3. Select **Scan for Stale Content**. A starting path may be `/` or a subfolder.

Location defaults use this order:

1. Explicit `?org=...&site=...` query parameters.
2. The Experience Workspace SDK's organization/site context, when provided.
3. The last successfully accessed location, remembered in this browser.

Organization and site are resolved as a pair: a partial query or context does not
silently borrow the missing field from a different saved location. Enter the
missing value before scanning. Names must start with a letter or number and use
only letters, numbers, dots, hyphens, or underscores, not URLs or paths.

The app checks access before crawling and updates its URL and remembered location
once that check succeeds. Failure to remember this app's location is logged
without blocking scans. The chooser does not grant access: scans use your existing Experience
Workspace permissions. Location fields are locked during a scan; cancel or wait
for it to finish before changing sites. Changing either field clears old results,
selection, and statistics so exports cannot be confused with another location.

## UI

The app loads the experimental, evergreen
[Experience Workspace UI SDK](https://www.aem.live/docs/ew/developing/sdk-ui-components).
It uses `sl-input` for organization, site, path, and age inputs and `sl-button` for scan, cancel,
selection, exports, and result actions. Native, labelled checkboxes retain reliable
selection and CSV behavior. Cards, progress, feedback, and results use Spectrum 2
tokens with system-font fallbacks; Typekit is not required.

Colors use the SDK's available light-theme palette: orange-200/900 for stale
content, green-900 for success, red-900 for errors, and blue-900 for actions.
Color fallbacks match those SDK palette values. The SDK does not expose a white
surface token, so cards use `--stale-surface-background`, defaulting to Spectrum's
static white. Filled feedback messages also use static white text. Dark-theme
support is not implied by this light-theme palette.

In Experience Workspace, the app uses the App SDK's authenticated `daFetch` for
metadata and access checks, including refreshed tokens, alongside the shared
tree utility for recursive crawling. Edit/preview links and CSV filenames use the
selected content location.

Direct standalone/local preview renders the real UI and location defaults but
disables scanning with an explicit connection notice. It does not invent a test
organization or token. Live scans require opening the app from Experience
Workspace so it can supply authentication.

## Validation

```sh
npx --no-install eslint --no-ignore tools/stale-content/stale-content.js
npx --no-install stylelint tools/stale-content/stale-content.css
```
