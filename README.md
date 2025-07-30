# Oracle Timecard Enhancements

A modular browser extension that enhances Oracle JET `<oj-data-grid>` timecards with configurable features. Users can toggle enhancements on/off and customize settings through an intuitive interface.

## Features

### 🧮 Timecard Totals
- Automatically calculates and displays total hours in the bottom-right corner
- Parses "X hours" strings from row totals and sums them
- Updates dynamically when the timecard changes

### 🎨 Weekend Shading
- Applies subtle background shading to weekend columns (Saturday & Sunday)
- Customizable shade color through options page
- Helps visually distinguish weekends from weekdays

### ⚙️ User Configuration
- **Popup Interface**: Quick toggle switches for each enhancement
- **Options Page**: Advanced settings and customization
- **Persistent Settings**: User preferences saved and synchronized
- **Modular Design**: Easy to add new enhancements

## Installation

### Chrome and Chromium based browsers
1. This extension is available for download as a Chrome extension via this link on the [Chrome Web Store](https://chromewebstore.google.com/detail/oracle-timecard-enhanceme/ihljhabfbpnoifdhmikabpcajbmpifbb?authuser=0&hl=en)

### Chrome (side-load method)
1. Clone this repository to your local machine
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked** and select the project folder

### Firefox
1. Clone this repository to your local machine
2. Open Firefox → `about:debugging`
3. Click **This Firefox** in the left sidebar
4. Click **Load Temporary Add-on** and select `manifest.json`

**Note**: Firefox temporary add-ons are removed on restart.

### Microsoft Edge
1. Clone this repository to your local machine
2. Open Edge → Click the three-dot menu in the top-right corner → Extensions → Manage extensions
3. Toggle **Developer mode** to On (lower-left corner of the Extensions page)
4. Click **Load unpacked** and select the project folder (must contain the manifest.json file)

## Usage

1. **Navigate** to your Oracle timecard page
2. **Click the extension icon** to access quick toggles
3. **Right-click the icon** → "Options" for advanced settings
4. **Configure** which enhancements you want enabled

## Adding New Enhancements

To add a new enhancement:

1. **Create a new enhancement class** extending the base Enhancement class:
```javascript
class MyNewEnhancement extends Enhancement {
  constructor() {
    super('my-enhancement', 'Description of what it does', true);
  }

  async onInit() {
    // Initialize your enhancement
  }

  async onUpdate() {
    // Handle DOM updates
  }

  async onCleanup() {
    // Clean up when disabled
  }
}
```

2. **Register it** in `src/content-main.js`:
```javascript
manager.registerEnhancement(new MyNewEnhancement());
```

3. **Add to manifest.json** if you created a new file:
```json
"js": [
  "src/enhancements/base.js",
  "src/enhancements/my-new-enhancement.js",
  // ... other files
]
```

## Configuration Options

### Weekend Shading
- **Shade Color**: Customize the background color for weekend columns
- **Default**: Light gray (`rgb(251,249,248)`)

