// Popup script for managing enhancements
document.addEventListener('DOMContentLoaded', async () => {
    const loadingEl = document.getElementById('loading');
    const enhancementsEl = document.getElementById('enhancements');
    const optionsLink = document.getElementById('optionsLink');

    // Options link
    optionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Check if we're on a timecard page
        if (!tab?.id || !tab.url || !tab.url.includes('oraclecloud.com') || !tab.url.includes('timecards')) {
        loadingEl.textContent = 'Navigate to your Oracle timecard to use this extension.';
        return;
        }

        // Get enhancements from content script
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getEnhancements' });

        if (!response || !response.enhancements) {
        loadingEl.textContent = 'Failed to load enhancements. Please refresh the page.';
        return;
        }

        // Hide loading and show actions + enhancements
        loadingEl.style.display = 'none';
        document.getElementById('actions').style.display = 'block';
        enhancementsEl.style.display = 'block';

        // Render enhancements
        renderEnhancements(response.enhancements, tab.id);

        // Wire up previous timecard button
        const prevBtn = document.getElementById('showPrevTimecard');
        prevBtn.addEventListener('click', async () => {
          prevBtn.disabled = true;
          prevBtn.textContent = 'Loading…';
          try {
            const { prevData, currentData } = await fetchPreviousTimecardFromPage(tab.id);
            await chrome.tabs.sendMessage(tab.id, { action: 'showPreviousTimecardData', prevData, currentData });
            window.close();
          } catch (err) {
            prevBtn.textContent = '← Show Previous Timecard';
            prevBtn.disabled = false;
            alert(`Could not load previous timecard: ${err.message}`);
          }
        });

    } catch (error) {
        console.error('Error loading popup:', error);
        loadingEl.textContent = 'Error loading enhancements. Please refresh the page.';
    }
});

function renderEnhancements(enhancements, tabId) {
    const enhancementsEl = document.getElementById('enhancements');
    const fragment = document.createDocumentFragment();

    enhancements.forEach(enhancement => {
        fragment.appendChild(createEnhancementElement(enhancement, tabId));
    });
    enhancementsEl.appendChild(fragment);
}

function createEnhancementElement(enhancement, tabId) {
    const div = document.createElement('div');
    div.className = 'enhancement';

    div.innerHTML = `
        <div class="enhancement-info">
        <div class="enhancement-name"></div>
        <div class="enhancement-description"></div>
        </div>
        <div class="toggle-switch"></div>
    `;
    div.querySelector('.enhancement-name').textContent = formatEnhancementName(enhancement.name);
    div.querySelector('.enhancement-description').textContent = enhancement.description;

    const toggle = div.querySelector('.toggle-switch');
    toggle.classList.toggle('enabled', Boolean(enhancement.enabled));
    toggle.dataset.name = enhancement.name;
    toggle.dataset.enabled = String(Boolean(enhancement.enabled));

    // Add click handler for toggle
    toggle.addEventListener('click', () => {
        const currentEnabled = toggle.dataset.enabled === 'true';
        toggleEnhancement(tabId, enhancement.name, !currentEnabled, toggle);
    });

    return div;
}

function formatEnhancementName(name) {
    return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

async function toggleEnhancement(tabId, name, enabled, toggleEl) {
    try {
        // Send toggle message to content script
        const response = await chrome.tabs.sendMessage(tabId, {
        action: 'toggleEnhancement',
        name: name,
        enabled: enabled
        });

        if (response && response.success) {
        // Update UI
        toggleEl.classList.toggle('enabled', enabled);

        // Update the data attribute to track current state
        toggleEl.dataset.enabled = enabled.toString();
        } else {
        console.error('Failed to toggle enhancement:', response?.error);
        alert('Failed to toggle enhancement. Please try again.');
        }
    } catch (error) {
        console.error('Error toggling enhancement:', error);
        alert('Error toggling enhancement. Please refresh the page and try again.');
    }
}

// Fetches the current and previous timecards in a single script injection and,
// on success, installs the page-side helper used by the Last 12 Months tab.
async function fetchPreviousTimecardFromPage(tabId) {
    const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: loadTimecardsInPage
    });

    if (result?.result?.error) throw new Error(result.result.error);
    if (!result?.result?.prevData) throw new Error('No data returned from API.');
    return result.result;
}

// Runs in the page's MAIN world so that Oracle's own fetch middleware (which
// injects the Bearer token) is active when we call fetch(). chrome.scripting
// serializes this function, so it must not reference anything outside itself.
async function loadTimecardsInPage() {
    const headers = { accept: 'application/json', 'accept-language': 'en' };
    const EXPAND = [
        'timeCardLayouts', 'timeCards', 'timeCardLayouts.timeCardFields',
        'timeCards.publicHolidays', 'timeCards.timeEntries', 'timeCards.approvalTasks',
        'timeCards.timeEntries.timeCardFieldValues', 'timeCards.emptyEntries',
        'timeCards.emptyEntries.timeCardFieldValues', 'timeCards.messages',
        'timeCards.timeEntries.messages', 'timeCards.scheduledHours',
        'timeCards.changeRequests', 'timeCards.timeEntries.changeRequests'
    ].join(',');

    const oneDayBefore = (dateString) => {
        if (typeof dateString !== 'string') return null;
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        if (!Number.isFinite(date.getTime())) return null;
        date.setDate(date.getDate() - 1);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T00:00:00`;
    };

    const buildPeriodUrl = (baseUrl, personId, asOfDate) => {
        const url = new URL(baseUrl);
        url.searchParams.set('expand', EXPAND);
        url.searchParams.set('finder', `findByPersonIdAndDate;UserContext=WORKER,PersonId=${personId},AsOfDate=${asOfDate}`);
        url.searchParams.set('limit', '5000');
        url.searchParams.set('onlyData', 'true');
        return url.toString();
    };

    // Keep only the fields the modal reads. Full responses can be very large and
    // are otherwise copied page → popup → content script (and per period for the
    // Last 12 Months tab).
    const pickItems = (collection, pick) => ({
        items: Array.isArray(collection?.items) ? collection.items.map(pick) : []
    });
    const trimTimecardData = (data) => {
        if (!data || typeof data !== 'object') return data;
        const item = data.items?.[0];
        if (!item) return { items: [] };
        const layout = item.timeCardLayouts?.items?.[0];
        const card = item.timeCards?.items?.[0];
        return {
            items: [{
                StartDate: item.StartDate,
                StopDate: item.StopDate,
                PersonId: item.PersonId,
                timeCardLayouts: { items: [{
                    timeCardFields: pickItems(layout?.timeCardFields, field => ({
                        Label: field?.Label,
                        TimeCardFieldId: field?.TimeCardFieldId
                    }))
                }] },
                timeCards: { items: [{
                    timeEntries: pickItems(card?.timeEntries, entry => ({
                        Measure: entry?.Measure,
                        timeCardFieldValues: pickItems(entry?.timeCardFieldValues, value => ({
                            TimeCardFieldId: value?.TimeCardFieldId,
                            DisplayValue: value?.DisplayValue
                        }))
                    }))
                }] }
            }]
        };
    };

    // Track URLs fetched by this extension so findLastTimecardEntry doesn't pick
    // them up on subsequent clicks and keep going further back each time.
    if (!window.__ote_fetchedUrls) window.__ote_fetchedUrls = new Set();
    const fetchedUrls = window.__ote_fetchedUrls;

    // src/page-request-log.js records Oracle's requests from page load and keeps
    // working after the resource timing buffer is full (250 entries by default),
    // when new requests stop appearing in getEntriesByType(). The buffer scan
    // remains as a fallback for pages where that script didn't run; whichever
    // entry started last wins.
    const findLastTimecardEntry = () => {
        let latest = null;
        try {
            latest = window.__ote_timecardRequestLog?.latest(fetchedUrls) || null;
        } catch (err) {
            latest = null;
        }

        const entries = performance.getEntriesByType('resource');
        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            if (entry.name.includes('/timeCardEntryDetails') && !fetchedUrls.has(entry.name)) {
                if (!latest || entry.startTime > latest.startTime) latest = entry;
                break;
            }
        }
        return latest;
    };

    // Find any timeCardEntryDetails request Oracle already made for this page,
    // excluding URLs our extension has fetched.
    const entry = findLastTimecardEntry();
    if (!entry) {
        return { error: 'API URL not found. Please reload the timecard page and try again.' };
    }

    const currentUrl = new URL(entry.name);
    const baseUrl = currentUrl.origin + currentUrl.pathname.split('/timeCardEntryDetails')[0] + '/timeCardEntryDetails';
    const finder = currentUrl.searchParams.get('finder') || '';
    const asOfDateMatch = finder.match(/AsOfDate=([^,&]+)/);

    // Always fetch the current timecard data first
    const currentResp = await fetch(entry.name, { credentials: 'include', headers });
    if (!currentResp.ok) return { error: `Could not read current timecard: API returned ${currentResp.status}` };
    const currentData = await currentResp.json();

    let prevUrl;

    if (asOfDateMatch) {
        // Fast path: AsOfDate is in the URL — set it to 1 day before the current
        // period's StartDate so we land exactly in the prior pay period.
        const startDate = currentData?.items?.[0]?.StartDate?.slice(0, 10);
        if (!startDate) {
            return { error: 'Could not read period start date from current timecard.' };
        }
        const newDate = oneDayBefore(startDate);
        if (!newDate) return { error: 'Could not parse current period start date.' };
        currentUrl.searchParams.set('finder', finder.replace(/AsOfDate=[^,&]+/, `AsOfDate=${newDate}`));
        prevUrl = currentUrl.toString();
    } else {
        // Slow path: use the already-fetched current data to get StartDate and PersonId,
        // then build a findByPersonIdAndDate URL for the previous period.
        const item = currentData?.items?.[0];
        const startDate = item?.StartDate?.slice(0, 10);
        const personId = item?.PersonId;

        if (!startDate || !personId) {
            return { error: 'Could not read period start date from current timecard.' };
        }

        // 1 day before the period start lands safely in the prior period
        const prevDate = oneDayBefore(startDate);
        if (!prevDate) return { error: 'Could not parse current period start date.' };

        // Build a findByPersonIdAndDate URL using the same API base path
        prevUrl = buildPeriodUrl(baseUrl, personId, prevDate);
    }

    fetchedUrls.add(prevUrl);
    const r = await fetch(prevUrl, { credentials: 'include', headers });
    if (!r.ok) return { error: `API returned ${r.status}` };
    const prevData = await r.json();

    // Install the Last 12 Months fetch helper (once per page). It is ready before
    // the modal opens, so the tab can't post a request nobody is listening for.
    if (!window.__ote_12m_injected) {
        window.__ote_12m_injected = true;

        const TOTAL = 24;
        const post = (message) => window.postMessage(message, window.location.origin);

        window.addEventListener('message', async (event) => {
            if (event.source !== window || event.origin !== window.location.origin || event.data?.type !== 'ote-fetch-12m') return;

            const sessionToken = event.data.token || null;
            if (!event.data.startDate || !event.data.personId) {
                post({ type: 'ote-12m-error', periods: [], message: 'Missing startDate or personId in message', token: sessionToken });
                return;
            }

            const periods = [];
            let currentStart = event.data.startDate;

            try {
                for (let i = 0; i < TOTAL; i++) {
                    const asOfDate = oneDayBefore(currentStart);
                    if (!asOfDate) throw new Error('Could not parse period start date');
                    const url = buildPeriodUrl(baseUrl, event.data.personId, asOfDate);

                    fetchedUrls.add(url);
                    const resp = await fetch(url, { credentials: 'include', headers });
                    if (!resp.ok) throw new Error(`API returned ${resp.status} on period ${i + 1}`);
                    const data = await resp.json();

                    const periodItem = data?.items?.[0];
                    if (!periodItem) break; // no more history

                    const pStart = periodItem.StartDate?.slice(0, 10);
                    periods.push({ data: trimTimecardData(data), startDate: pStart });
                    currentStart = pStart;

                    post({ type: 'ote-12m-progress', done: i + 1, total: TOTAL, token: sessionToken });
                }
                post({ type: 'ote-12m-done', periods, token: sessionToken });
            } catch (err) {
                post({ type: 'ote-12m-error', periods, message: err.message, token: sessionToken });
            }
        });
    }

    return { prevData: trimTimecardData(prevData), currentData: trimTimecardData(currentData) };
}
