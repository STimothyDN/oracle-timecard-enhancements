// Runs in the page's MAIN world at document_start (see manifest.json).
//
// Records the /timeCardEntryDetails requests Oracle makes so the popup's
// "Show Previous Timecard" action can find the one for the displayed period.
// Reading performance.getEntriesByType('resource') alone is not enough: the
// browser stops adding entries to that buffer once it is full (250 by
// default), which a long-lived Redwood session reaches quickly. A
// PerformanceObserver still receives every entry after that point.
//
// This only observes resource timing entries. It does not wrap fetch or
// XMLHttpRequest or change any request the page makes.
(() => {
    if (window.__ote_timecardRequestLog || typeof PerformanceObserver !== 'function') return;

    const MAX_ENTRIES = 50;
    const entries = [];

    // Skip URLs this extension fetched (see loadTimecardsInPage in popup.js) so
    // they don't push Oracle's own requests out of the log.
    const record = (list) => {
        const fetchedUrls = window.__ote_fetchedUrls;
        for (const entry of list) {
            if (!entry.name.includes('/timeCardEntryDetails') || fetchedUrls?.has(entry.name)) continue;
            entries.push({ name: entry.name, startTime: entry.startTime });
            if (entries.length > MAX_ENTRIES) entries.shift();
        }
    };

    let observer;
    try {
        observer = new PerformanceObserver(list => record(list.getEntries()));
        observer.observe({ type: 'resource', buffered: true });
    } catch (err) {
        return; // The popup falls back to the resource timing buffer.
    }

    window.__ote_timecardRequestLog = {
        // Returns { name, startTime } for the latest-starting request whose URL
        // is not in `exclude`, or null. Matches what scanning the resource
        // timing buffer backwards returned before the buffer filled up.
        latest(exclude) {
            // Entries the observer callback hasn't received yet.
            record(observer.takeRecords());
            let latest = null;
            for (const entry of entries) {
                if (exclude?.has(entry.name)) continue;
                if (!latest || entry.startTime >= latest.startTime) latest = entry;
            }
            return latest;
        }
    };
})();
