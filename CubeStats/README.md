# CubeStats

A 3x3 Rubik's cube timer and statistics web application.

## Features

- Timer with inspection time support
- Scramble generation (WCA, Cross, F2L, OLL, PLL)
- Virtual cube display (Flat view + Three.js 3D view)
- Bluetooth smart cube support
- CFOP analysis
- Internationalization (English, Chinese, Japanese)

## Deployment

This project is deployed via GitHub Pages. Simply push to the `main` branch and the site will be available at:

`https://newonejoe.github.io/CubeStats/`

## Development

The application is a single HTML file with embedded CSS and JavaScript. No build step required.

To test locally:

```bash
# Simply open index.html in a browser
# Or use a simple HTTP server
python3 -m http.server 8000
```

Then open http://localhost:8000
