// Popup script for managing enhancements
document.addEventListener('DOMContentLoaded', async () => {
    const loadingEl = document.getElementById('loading');
    const enhancementsEl = document.getElementById('enhancements');
    const optionsLink = document.getElementById('optionsLink');

    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if we're on a timecard page
        if (!tab.url.includes('oraclecloud.com') || !tab.url.includes('timecards')) {
        loadingEl.textContent = 'Navigate to your Oracle timecard to use this extension.';
        return;
        }

        // Get enhancements from content script
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getEnhancements' });
        
        if (!response || !response.enhancements) {
        loadingEl.textContent = 'Failed to load enhancements. Please refresh the page.';
        return;
        }

        // Hide loading and show enhancements
        loadingEl.style.display = 'none';
        enhancementsEl.style.display = 'block';

        // Render enhancements
        renderEnhancements(response.enhancements);

    } catch (error) {
        console.error('Error loading popup:', error);
        loadingEl.textContent = 'Error loading enhancements. Please refresh the page.';
    }

    // Options link
    optionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });
});

function renderEnhancements(enhancements) {
    const enhancementsEl = document.getElementById('enhancements');
    
    enhancements.forEach(enhancement => {
        const enhancementEl = createEnhancementElement(enhancement);
        enhancementsEl.appendChild(enhancementEl);
    });
}

function createEnhancementElement(enhancement) {
    const div = document.createElement('div');
    div.className = 'enhancement';
    
    div.innerHTML = `
        <div class="enhancement-info">
        <div class="enhancement-name">${formatEnhancementName(enhancement.name)}</div>
        <div class="enhancement-description">${enhancement.description}</div>
        </div>
        <div class="toggle-switch ${enhancement.enabled ? 'enabled' : ''}" data-name="${enhancement.name}" data-enabled="${enhancement.enabled}"></div>
    `;

    // Add click handler for toggle
    const toggle = div.querySelector('.toggle-switch');
    toggle.addEventListener('click', () => {
        const currentEnabled = toggle.dataset.enabled === 'true';
        toggleEnhancement(enhancement.name, !currentEnabled, toggle);
    });

    return div;
}

function formatEnhancementName(name) {
    return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

async function toggleEnhancement(name, enabled, toggleEl) {
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Send toggle message to content script
        const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleEnhancement',
        name: name,
        enabled: enabled
        });

        if (response && response.success) {
        // Update UI
        if (enabled) {
            toggleEl.classList.add('enabled');
        } else {
            toggleEl.classList.remove('enabled');
        }
        
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