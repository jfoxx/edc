# Form Picker - DA Library Plugin

A Document Authoring (DA) library plugin that allows authors to browse and insert AEM Forms URLs into their documents.

## Overview

The Form Picker plugin connects to an external query index to display available AEM Forms authored via the Universal Editor. Authors can search, preview, and insert form URLs directly into their documents with a single click.

## Features

- **External Index Support**: Fetches forms from a configurable query index URL (supports cross-domain)
- **Search & Filter**: Real-time filtering of forms by name or path
- **Preview**: Open forms in a new tab before inserting
- **One-Click Insert**: Click a form to insert its URL into the document
- **Spectrum Styling**: Adobe Spectrum design system with proper icons and typography
- **Standalone Testing**: Test the plugin locally without DA context

## Installation

### 1. Deploy Files

Ensure these files are deployed to your AEM Edge Delivery site:

```
tools/
  form-picker/
    form-picker.html
    form-picker.js
    form-picker.css
    README.md
```

### 2. Configure Sidekick

Add the plugin to your `tools/sidekick/config.json`:

```json
{
  "plugins": [
    {
      "id": "da-plugin-form-picker",
      "title": "Forms",
      "environments": ["edit"],
      "daLibrary": true,
      "url": "/tools/form-picker/form-picker.html"
    }
  ]
}
```

### 3. Configure Forms Index

Update the `CONFIG` object in `form-picker.js` to point to your forms query index:

```javascript
const CONFIG = {
  // Full URL to the external forms query index
  formsIndexUrl: 'https://main--your-project--your-org.aem.live/query-index-forms.json',

  // Optional: Filter forms by path prefix
  pathFilter: null, // e.g., '/content/forms' or '/forms'

  // Field mappings from your index structure
  fields: {
    title: 'title',
    path: 'path',
    description: 'description',
  },
};
```

## Query Index Format

The plugin expects a query index JSON in this format:

```json
{
  "total": 2,
  "offset": 0,
  "limit": 500,
  "data": [
    {
      "path": "/content/forms/contact-us",
      "title": "Contact Us Form",
      "description": "General contact form"
    },
    {
      "path": "/content/forms/newsletter",
      "title": "Newsletter Signup",
      "description": "Subscribe to our newsletter"
    }
  ]
}
```

### Creating a Forms Index

Add a forms index configuration to your `helix-query.yaml`:

```yaml
indices:
  forms:
    include:
      - '/content/**/forms/**'
    target: /query-index-forms.json
    properties:
      title:
        select: head > meta[property="og:title"]
        value: attribute(el, "content")
      description:
        select: head > meta[name="description"]
        value: attribute(el, "content")
      path:
        select: none
        value: path
```

## Usage

1. Open a document in DA edit mode
2. Click the **Library** icon in the sidebar
3. Select the **Forms** tab
4. Browse or search for a form
5. Click a form to insert its URL
6. (Optional) Click the preview icon to open the form in a new tab

## Inserted HTML

When a form is selected, the plugin inserts:

```html
<p><a href="https://your-domain.aem.live/path/to/form">https://your-domain.aem.live/path/to/form</a></p>
```

This link is consumed by the Form block to render the form on the page.

## Local Development

### Testing Standalone

1. Start the local dev server: `aem up`
2. Open: `http://localhost:3000/tools/form-picker/form-picker.html`
3. The plugin runs in standalone mode with mock actions

### Testing in DA

1. Start the local dev server: `aem up`
2. Open DA with local reference: `https://da.live/edit#/your-org/your-site/path?ref=local`
3. Open the Library panel and select Forms

## Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `formsIndexUrl` | string | Full URL to the query index JSON |
| `pathFilter` | string \| null | Filter forms by path prefix |
| `fields.title` | string | Field name for form title in index |
| `fields.path` | string | Field name for form path in index |
| `fields.description` | string | Field name for form description in index |

## Customization

### Styling

The plugin uses Adobe Spectrum design tokens defined as CSS custom properties. Modify `form-picker.css` to customize:

- Colors: `--spectrum-gray-*`, `--spectrum-blue-*`
- Spacing: `--spectrum-spacing-*`
- Typography: `--spectrum-font-*`

### Icons

Icons are defined as inline SVG in the `ICONS` object in `form-picker.js`. Replace with any Spectrum workflow icons from [spectrum.adobe.com/page/icons](https://spectrum.adobe.com/page/icons/).

## Troubleshooting

### Forms not loading

- Check the browser console for CORS errors
- Verify the `formsIndexUrl` is accessible
- Ensure the index returns valid JSON with a `data` array

### Plugin not appearing in DA

- Confirm `config.json` is deployed and valid
- Check that `daLibrary: true` is set
- Verify the plugin URL is accessible

### Wrong field mappings

- Check your index JSON structure
- Update `CONFIG.fields` to match your field names

## License

Apache License 2.0
