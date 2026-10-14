# Permissions

Justifications for each permission in [manifest.json](manifest.json), written to paste into the Chrome Web Store "Privacy practices" tab. Update this file whenever the manifest's `permissions`, `host_permissions`, or `content_scripts.matches` change.

## Change log

| Release | Permission changes |
| --- | --- |
| 2.8 (performance and robustness update) | None. The permissions are the same as 2.7: `activeTab`, `scripting`, `storage`, and the existing content-script host match. |
| 2.8 (previous-timecard request log) | No new permissions or host access. Adds a second `content_scripts` entry with the same match as the existing one. It runs `src/page-request-log.js` in the page's `MAIN` world at `document_start`. See "Host access" below. |

## Single purpose

Adds visual and summary features to the Oracle Cloud time entry page: a grand total, weekend and alternate-row shading, a red line before today's date, and a summary of previous pay periods.

## Permission justifications

### `storage`
Saves the user's settings: which enhancements are turned on and the colors they picked for weekend shading, alternate-row shading, and the red line. It uses `chrome.storage.sync` so the settings follow the user across their browsers. Only these settings are stored. No timecard data or personal information is stored.

### `activeTab`
When the user opens the extension popup, this permission lets the extension read the current tab's URL to check that it is an Oracle timecard page. It also allows the "Show Previous Timecard" action, which the user starts by clicking, to run on that tab. Access is limited to the tab the user opened the popup on.

### `scripting`
Used only when the user clicks "Show Previous Timecard" in the popup. The extension runs a function that ships inside the extension package in the timecard page (`world: "MAIN"`). That function calls Oracle's own timecard REST API on the same Oracle domain, so the requests use the user's existing Oracle sign-in. It loads the previous pay period and, when the user opens the "Last 12 Months" tab, earlier pay periods. The results are summarized in a dialog on the page. The extension does not load or run any remote code.

### Host access: `*://hcmq.fa.us2.oraclecloud.com/fscmUI/redwood/time/timecards/*` (content script match)
The content scripts run only on Oracle timecard pages. They add the total-hours cell, the column and row shading, the dynamic red line, and the previous-timecard dialog. They do not run on any other site.

One small script, `src/page-request-log.js`, runs in the page's own context (`world: "MAIN"`) as the page starts loading (`document_start`). It uses the standard `PerformanceObserver` API to note the URLs of Oracle's own timecard API requests, so "Show Previous Timecard" can find the request for the displayed pay period. That keeps working in long sessions after the browser's resource timing buffer (250 entries by default) is full. The script keeps the last 50 of those URLs in page memory only. It does not wrap or change any request, send anything, or store anything. It uses the same match pattern as the other content scripts, so the extension gets no new host access.

## Data usage disclosures

- **Remote code:** No. All JavaScript ships in the extension package.
- **Data handled:** Timecard content shown on the page (project and task names, hours, pay-period dates, and the worker's Oracle person ID used in API queries). It is read and processed only in the user's browser to build the totals and summaries.
- **Data collected or transmitted:** None. The extension sends no data to the developer or any third party. Its only network requests go to the Oracle timecard API on the page's own domain, using the user's existing Oracle session.
- **Data sold or used for unrelated purposes:** No.
