// Options page script
document.addEventListener('DOMContentLoaded', () => {
    loadEnhancementSettings();
});

async function loadEnhancementSettings() {
    try {
        // Get saved preferences
        const result = await chrome.storage.sync.get(['enhancementPreferences', 'weekendShadeColor', 'redLineColor']);
        const preferences = result.enhancementPreferences || {};
        const weekendColor = result.weekendShadeColor || 'rgb(251,249,248)';
        const redLineColor = result.redLineColor || 'rgb(214,45,32)'; // Default Oracle red color

        // Define enhancements with their options
        const enhancements = [
        {
            name: 'timecard-totals',
            title: 'Timecard Totals',
            description: 'Automatically calculates and displays the total hours in the bottom-right corner of the timecard.',
            enabled: preferences['timecard-totals'] !== false,
            options: []
        },
        {
            name: 'weekend-shading',
            title: 'Weekend Shading',
            description: 'Applies a subtle background color to weekend columns (Saturday and Sunday) for better visual distinction.',
            enabled: preferences['weekend-shading'] !== false,
            options: [
            {
                name: 'shadeColor',
                label: 'Weekend Shade Color',
                type: 'color',
                value: weekendColor,
                description: 'Choose the background color for weekend columns'
            }
            ]
        },
        {
            name: 'dynamic-red-line',
            title: 'Dynamic Red Line',
            description: 'Shows a single red line before the current date column instead of the default weekly red lines.',
            enabled: preferences['dynamic-red-line'] !== false,
            options: [
            {
                name: 'redLineColor',
                label: 'Red Line Color',
                type: 'color',
                value: redLineColor,
                description: 'Choose the color for the dynamic red line'
            }
            ]
        }
        ];

        renderEnhancements(enhancements);
    } catch (error) {
        console.error('Error loading enhancement settings:', error);
        showSaveStatus('Error loading settings', 'error');
    }
}

function renderEnhancements(enhancements) {
    const container = document.getElementById('enhancements-list');
    container.innerHTML = '';

    enhancements.forEach(enhancement => {
        const card = createEnhancementCard(enhancement);
        container.appendChild(card);
    });
}

function createEnhancementCard(enhancement) {
    const card = document.createElement('div');
    card.className = 'enhancement-card';

    const hasOptions = enhancement.options && enhancement.options.length > 0;

    card.innerHTML = `
        <div class="enhancement-header">
        <div class="enhancement-title">${enhancement.title}</div>
        <div class="toggle-switch ${enhancement.enabled ? 'enabled' : ''}" data-name="${enhancement.name}"></div>
        </div>
        <div class="enhancement-description">${enhancement.description}</div>
        ${hasOptions ? `
        <div class="enhancement-options ${enhancement.enabled ? 'visible' : ''}" data-name="${enhancement.name}">
            ${enhancement.options.map(option => createOptionHTML(option)).join('')}
        </div>
        ` : ''}
    `;

    // Add toggle event listener
    const toggle = card.querySelector('.toggle-switch');
    toggle.addEventListener('click', () => {
        const newEnabled = !enhancement.enabled;
        enhancement.enabled = newEnabled;
        
        toggle.classList.toggle('enabled', newEnabled);
        
        // Show/hide options
        const optionsDiv = card.querySelector('.enhancement-options');
        if (optionsDiv) {
        optionsDiv.classList.toggle('visible', newEnabled);
        }
        
        saveEnhancementPreference(enhancement.name, newEnabled);
    });

    // Add option event listeners
    enhancement.options?.forEach(option => {
        const input = card.querySelector(`[data-option="${option.name}"]`);
        if (input) {
        input.addEventListener('change', () => {
            saveOptionValue(option.name, input.value);
        });
        }
        
        // Add reset button event listener for color options
        if (option.type === 'color') {
        const resetBtn = card.querySelector(`.reset-color-btn[data-option="${option.name}"]`);
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
            resetColorToDefault(option.name, input);
            });
        }
        }
    });

    return card;
}

function createOptionHTML(option) {
    switch (option.type) {
        case 'color':
        // Convert rgb string to hex for color input
        const hexValue = rgbToHex(option.value);
        return `
            <div class="option-group">
            <label class="option-label">${option.label}</label>
            <div class="color-control-group">
                <input type="color" class="color-input" value="${hexValue}" data-option="${option.name}">
                <button type="button" class="reset-color-btn" data-option="${option.name}" title="Reset to default color">Reset</button>
            </div>
            <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">${option.description}</p>
            </div>
        `;
        case 'text':
        return `
            <div class="option-group">
            <label class="option-label">${option.label}</label>
            <input type="text" class="option-input" value="${option.value}" data-option="${option.name}">
            <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">${option.description}</p>
            </div>
        `;
        default:
        return '';
    }
}

async function saveEnhancementPreference(name, enabled) {
    try {
        const result = await chrome.storage.sync.get(['enhancementPreferences']);
        const preferences = result.enhancementPreferences || {};
        preferences[name] = enabled;
        
        await chrome.storage.sync.set({ enhancementPreferences: preferences });
        
        // Notify active timecard tabs
        const tabs = await chrome.tabs.query({ 
        url: ['*://hcmq.fa.us2.oraclecloud.com/fscmUI/redwood/time/timecards/*']
        });
        
        tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
            action: 'toggleEnhancement',
            name: name,
            enabled: enabled
        });
        });
        
        showSaveStatus('Settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving preference:', error);
        showSaveStatus('Error saving settings', 'error');
    }
}

async function saveOptionValue(optionName, value) {
    try {
        if (optionName === 'shadeColor') {
        // Convert hex to rgb format
        const rgbValue = hexToRgb(value);
        await chrome.storage.sync.set({ weekendShadeColor: rgbValue });
        
        // Notify active timecard tabs
        const tabs = await chrome.tabs.query({ 
            url: ['*://hcmq.fa.us2.oraclecloud.com/fscmUI/redwood/time/timecards/*']
        });
        
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
            action: 'updateWeekendColor',
            color: rgbValue
            });
        });
        } else if (optionName === 'redLineColor') {
        // Convert hex to rgb format
        const rgbValue = hexToRgb(value);
        await chrome.storage.sync.set({ redLineColor: rgbValue });
        
        // Notify active timecard tabs
        const tabs = await chrome.tabs.query({ 
            url: ['*://hcmq.fa.us2.oraclecloud.com/fscmUI/redwood/time/timecards/*']
        });
        
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
            action: 'updateRedLineColor',
            color: rgbValue
            });
        });
        }
        
        showSaveStatus('Settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving option:', error);
        showSaveStatus('Error saving settings', 'error');
    }
}

async function resetColorToDefault(optionName, colorInput) {
    try {
        if (optionName === 'shadeColor') {
        const defaultColor = 'rgb(251,249,248)';
        const defaultHex = rgbToHex(defaultColor);
        
        // Update the color input value
        colorInput.value = defaultHex;
        
        // Save the default value
        await chrome.storage.sync.set({ weekendShadeColor: defaultColor });
        
        // Notify active timecard tabs
        const tabs = await chrome.tabs.query({ 
            url: ['*://hcmq.fa.us2.oraclecloud.com/fscmUI/redwood/time/timecards/*']
        });
        
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
            action: 'updateWeekendColor',
            color: defaultColor
            });
        });
        
        showSaveStatus('Color reset to default', 'success');
        } else if (optionName === 'redLineColor') {
        const defaultColor = 'rgb(214,45,32)'; // Default Oracle red
        const defaultHex = rgbToHex(defaultColor);
        
        // Update the color input value
        colorInput.value = defaultHex;
        
        // Save the default value
        await chrome.storage.sync.set({ redLineColor: defaultColor });
        
        // Notify active timecard tabs
        const tabs = await chrome.tabs.query({ 
            url: ['*://hcmq.fa.us2.oraclecloud.com/fscmUI/redwood/time/timecards/*']
        });
        
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
            action: 'updateRedLineColor',
            color: defaultColor
            });
        });
        
        showSaveStatus('Color reset to default', 'success');
        }
    } catch (error) {
        console.error('Error resetting color:', error);
        showSaveStatus('Error resetting color', 'error');
    }
}

function showSaveStatus(message, type) {
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = message;
    statusEl.className = `save-status ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 3000);
}

// Utility functions for color conversion
function rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;
    
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '#fbf9f8'; // Default color
    
    const [, r, g, b] = match;
    return '#' + [r, g, b].map(x => {
        const hex = parseInt(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r},${g},${b})`;
}
