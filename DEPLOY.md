# DayFrame — PWA Deployment Guide

## Files in this package
```
index.html       ← The app
manifest.json    ← PWA manifest (name, icons, display mode)
sw.js            ← Service worker (offline support)
icons/
  icon-192.png   ← App icon (home screen)
  icon-512.png   ← App icon (splash screen)
```

---

## Option A — Netlify (recommended, free)

1. Go to https://netlify.com and sign up (free)
2. Drag and drop this entire folder onto the Netlify dashboard
3. Netlify gives you a URL like `https://dayframe-abc123.netlify.app`
4. Done — visit the URL on any device

**Custom domain (optional):**  
Netlify → Site settings → Domain management → Add custom domain

---

## Option B — GitHub Pages (free)

1. Create a free account at https://github.com
2. New repository → name it `dayframe` → set to Public
3. Upload all files (drag into the repository on GitHub.com)
4. Settings → Pages → Source: `main` branch → Save
5. Your URL: `https://YOUR-USERNAME.github.io/dayframe`

---

## Option C — Cloudflare Pages (free, fastest CDN)

1. https://pages.cloudflare.com → Connect to Git or upload directly
2. Upload folder → deploy
3. Get a `*.pages.dev` URL instantly

---

## Installing as an App

### iPhone / iPad (Safari)
1. Open the URL in Safari
2. Tap the Share button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap Add — DayFrame appears on your home screen
5. Opens fullscreen, no browser chrome, works offline ✓

### Android (Chrome)
1. Open the URL in Chrome
2. Tap the three-dot menu → **Add to Home screen** (or an install banner appears)
3. Tap Add — appears in your app drawer like a native app ✓

### Desktop (Chrome / Edge)
1. Open the URL
2. Look for the install icon in the address bar (computer with down arrow)
3. Click **Install** — opens in its own window, no browser tabs ✓

---

## Updating the app

Just re-upload the files. The service worker auto-refreshes on next visit.

To force an immediate refresh for all users, change `CACHE_NAME` in `sw.js`  
from `'dayframe-v1'` to `'dayframe-v2'` before uploading.

---

## Your data

All data is stored in **localStorage** in each browser/device.  
It does not sync between devices — each device keeps its own data.

To back up: open the app → open browser console (F12) →  
`copy(localStorage.getItem('dayframe_data'))` → paste into a text file.

To restore: `localStorage.setItem('dayframe_data', '<paste here>')`
