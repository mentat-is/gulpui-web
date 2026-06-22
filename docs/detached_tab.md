# Detached Tabs

gULP can open some workspace tools in separate browser windows. These are the
detached tabs used by Notes, Table View, Dashboard View, the AI Assistant ecc..

## What Detached Tabs Are

A detached tab is not just a visual popup copied from the main page. It runs its
own small React application in a separate browser window. The main tab remains
the owner of the active operation, selected sources, filters, theme, and user
session. Detached tabs receive lightweight updates from the main tab so they can
stay aligned without slowing down the timeline.

This design keeps heavy windows, such as dashboards or tables, from forcing the
main timeline to re-render across browser windows.

## Normal Behavior

When the main tab is inside an operation and sources are selected, detached tabs
are active. They can show notes, table rows, dashboards, assistant content, and
plugin UI for the current operation.

When the main tab leaves an operation page, detached tabs stay open but enter an
idle state. This is intentional: the detached tab no longer has a valid operation
context, so it waits instead of showing stale data.

When the main tab enters another operation and the user selects sources or loads
a saved session, the detached tabs receive the new operation context and resume.

When the login session is lost, detached tabs enter a login-required state. After
logging in again, the user must return to an operation and select sources or load
a saved session before the detached tabs can resume.

## What The Waiting Screen Means

Detached tabs can show one of these waiting states:

- `Preparing operation context`: the main tab is on an operation page, but the
  detached tab has not received selected sources yet.
- `Waiting for an operation`: the main tab is outside an operation page.
- `Login required`: the main tab is logged out or the backend rejected the
  current session.

These states protect the user from working with stale operation data.

## Known Limitation: Browser Reload

Hard browser reloads of the main operation page, such as F5 or the browser reload
button, are currently a known limitation. In some cases the detached tab can stay
on `Preparing operation context` even after the main tab finishes reloading and
sources are selected again.

The safe workaround is to close and reopen the detached tab, or click the same
detached-tab button in the main UI to recreate/focus the window. 

## Under The Hood

Detached tabs communicate with the main tab through a browser `BroadcastChannel`
wrapper called `WindowBridge`. The main tab sends small messages for theme
changes, selected events, operation snapshots, and lifecycle status. Detached
tabs can send messages back when the user selects an event, toggles flags, or
asks the main tab to open a related dialog.

A persistent detached-window coordinator lives above the routed pages. This lets
detached windows survive normal navigation between Home, Users, Groups, and
operation pages. Route-specific components can open detached windows, but they
do not own the detached window lifecycle.
