# Date Inserter

DA authoring plugin for inserting plain ISO date text at the editor cursor.

- **Insert Now** inserts the current local date and time as `YYYY-MM-DDTHH:MM`.
- **Insert** inserts the selected date as `YYYY-MM-DD`, with `THH:MM` appended
  when an optional time is provided. Enter in either field also inserts.
- Times are local, with minute precision and no timezone suffix.
- After insertion, the plugin stays open so you can insert additional dates.

## UI

The plugin loads the evergreen [DA UI SDK](https://www.aem.live/docs/ew/developing/sdk-ui-components)
and uses `sl-input` for the date and `sl-button` for both actions. Layout uses
the SDK's Spectrum 2 color, corner, typography, and field tokens.
Typography uses the SDK's font stack with locally available fonts.
The optional time uses a labelled native input styled with the same tokens,
because the SDK currently does not style `type="time"`.

Controls initialize after the custom elements are registered. SDK loading and
insertion failures are displayed in the live status area. DA documents these
UI components as experimental.


Lint the plugin:

```sh
npx eslint --no-ignore tools/date-inserter/date-inserter.js
npx stylelint tools/date-inserter/date-inserter.css
```
