# Screenshots Directory

This directory contains screenshots of the FraudGuard Simulator dashboard for documentation purposes.

## Required Screenshots

1. **01-onboarding.png** - Welcome screen showing the onboarding card with feature highlights
2. **02-streaming.png** - Real-time transaction streaming view with fraud detection in action
3. **03-shap-modal.png** - Transaction detail panel showing SHAP feature explanations
4. **04-metrics-dashboard.png** - Analytics dashboard with charts and KPIs
5. **05-mobile-view.png** - Mobile responsive layout (portrait orientation)

## How to Capture Screenshots

### Option 1: Browser DevTools

1. Start the application locally:
   ```bash
   # Terminal 1: Backend
   cd backend && python -m uvicorn main:app --reload --port 8000
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

2. Open `http://localhost:5173` in Chrome/Edge

3. For each screenshot:
   - Navigate to the desired view
   - Press `F12` to open DevTools
   - Click the device toolbar icon (or `Ctrl+Shift+M`)
   - Set viewport to 1280x800 for desktop shots
   - Set viewport to 375x812 (iPhone X) for mobile
   - Press `Ctrl+Shift+P` → type "screenshot" → select "Capture full size screenshot"

### Option 2: Windows Snipping Tool

1. Press `Win+Shift+S` to open Snipping Tool
2. Select the region to capture
3. Save images to this directory

### Recommended Viewport Sizes

| Screenshot | Viewport | Notes |
|------------|----------|-------|
| 01-onboarding | 1280x800 | Show full width layout |
| 02-streaming | 1280x800 | With ~10 transactions visible |
| 03-shap-modal | 1280x900 | Detail panel expanded |
| 04-metrics-dashboard | 1280x800 | Charts fully rendered |
| 05-mobile-view | 375x812 | iPhone X dimensions |

### Image Optimization

After capturing, optimize images for web:

```bash
# Using ImageMagick
magick convert screenshot.png -quality 85 -resize 1600x screenshot.png

# Or using online tools like TinyPNG.com
```

Target file sizes:
- Desktop: < 200KB each
- Mobile: < 100KB

## Screenshot Checklist

- [ ] 01-onboarding.png - Onboarding card visible, clean state
- [ ] 02-streaming.png - Transactions flowing, mix of fraud/safe
- [ ] 03-shap-modal.png - Modal open with SHAP explanation visible
- [ ] 04-metrics-dashboard.png - Charts populated with data
- [ ] 05-mobile-view.png - Mobile layout, bottom nav visible
