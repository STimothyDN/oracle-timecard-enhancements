# Oracle Timecard Totals

A tiny Chrome extension that automatically sums the “Totals” column in an Oracle JET `<oj-data-grid>` time‐card and injects the grand total into the bottom‐right corner.

## Features

- Detects the per‐row totals in the right‐most column  
- Parses “X hours” strings and sums them  
- Writes the result into the `timecard-datagrid:bcorner` cell  
- Auto‐updates on grid re‐renders via a debounced `MutationObserver`

## Installation

1. Clone this repo to your local machine
2. Open Chrome → `chrome://extensions` 
3. Ensure **Developer mode** in the top right is toggled
4. Click **Load unpacked** and select the `timecard-totals/` folder the repo was cloned to 

## Usage

1. Navigate to your Oracle time‐card page.  
2. After the grid renders, the extension will populate the bottom‐right cell with your weekly total.