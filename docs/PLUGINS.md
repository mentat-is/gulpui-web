## Creating a Plugin

To create a plugin, you need to add two files in the following directory:
`gulpui-web/src/plugins`

1. A `.tsx` file — this will contain the plugin code.
2. A corresponding `.json` file — this will define the plugin metadata.

### Example

```
coconut.tsx  
coconut.tsx.json
```

---

## Plugin `.tsx` File

* The `.tsx` file must export a `default export`.
  This component will be used as a trigger to launch the plugin.

* The main logic and UI of the plugin should be encapsulated inside a **separate namespace**.
  You can refer to `example.tsx` for a sample structure.

### Interacting with Application Data

To interact with the application's state and data:

* Use `Info.tsx` — provides access to shared app data.
* Import `Info` and `app` using `useApplication` hook:

```tsx
import { useApplication } from '@/context/Application.context';

const { app, Info } = useApplication();
```

### UI Interaction Helpers

For displaying notifications and dialogs, you can use the following helpers:

```tsx
import { spawnBanner, spawnDialog } from '@/utils/ui';
```

* `spawnBanner()` — show a banner notification.
* `spawnDialog()` — open a dialog window.

---

## Plugin `.json` File

The `.json` file must define the plugin metadata.
The structure of this metadata is described in:
`gulpui-web/src/context/Extension.context.tsx` → `KNOWN_PLUGINS`

### Example `.json` File (src/plugins/coconut.tsx.json)

```json
{
  "display_name": "Example UI Plugin",
  "plugin": "some_gulp_plugin.py",
  "extension": true,
  "version": "1.0.0",
  "desc": "THIS IS A SAMPLE UI PLUGIN!",
  "path": "/home/gulp/src/gulp/plugins/ui/example_ui_plugin.tsx",
  "filename": "example_ui_plugin.tsx",
  "type": []
}
```

---

## UI & Components Best Practices

It is highly recommended to **reuse existing UI components** from:

* Local project folders:

  * `@/ui`
  * `@/components`

* External shared libraries:

  * `@impactium/components`
  * `@impactium/icons`

This ensures **consistent styling** and reduces duplication across the project.
