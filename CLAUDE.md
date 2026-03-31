# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CubeStats is a 3x3 Rubik's cube timer and statistics web application with Bluetooth smart cube support. The project consists of two versions:

1. **Legacy**: `CubeStats/` - Simple single HTML file version (standalone)
2. **Modern**: `CubeStatsApi/` + `frontend/` - Full-stack application with .NET backend and Vite/TypeScript frontend

The modern version is the primary application and is what should be developed.

## Architecture

- **Backend**: ASP.NET Core 10.0 Web API (.NET 10)
- **Database**: SQLite (stored in `cubestats.db` at root)
- **Frontend**: Vanilla TypeScript with Vite build system
- **Static Files**: Served from `CubeStatsApi/wwwroot/` (built from `frontend/`)
- **Deployment**: Azure Web App (API) + GitHub Pages (static frontend)

## Common Commands

### Frontend Development
```bash
cd frontend
npm run dev      # Start development server (proxies /api to localhost:5208)
npm run build    # Build for production (outputs to ../CubeStatsApi/wwwroot)
npm run test     # Run tests with vitest
```

### Backend Development
```bash
cd CubeStatsApi
dotnet build     # Build the API
dotnet run       # Run the API (serves on localhost:5208)
```

### Full Stack Development
Run backend and frontend in separate terminals:
1. `dotnet run` in `CubeStatsApi/`
2. `npm run dev` in `frontend/`

The frontend proxies API calls to the backend. Access at http://localhost:5173

## Project Structure

```
cc-tutorial/
├── CubeStatsApi/           # .NET 10 Web API
│   ├── Routes/             # API endpoints
│   │   ├── UsersRoutes.cs
│   │   ├── SessionsRoutes.cs
│   │   ├── SolvesRoutes.cs
│   │   └── AnalysisRoutes.cs
│   ├── Data/               # Database utilities
│   ├── JsonModels.cs       # JSON serialization models
│   ├── Program.cs          # App entry point
│   ├── wwwroot/            # Static files (built frontend)
│   └── CubeStatsApi.csproj
│
├── frontend/               # Vite + TypeScript frontend
│   ├── src/
│   │   ├── main.ts         # Entry point
│   │   ├── kernel.ts       # Core kernel
│   │   ├── style.css       # Global styles
│   │   ├── modules/        # Feature modules
│   │   │   ├── timer_functions.ts
│   │   │   ├── scramble_generator.ts
│   │   │   ├── cfop_analysis.ts
│   │   │   ├── virtual_cube.ts
│   │   │   ├── bluetooth.ts
│   │   │   ├── statistics.ts
│   │   │   ├── history.ts
│   │   │   └── internationalization.ts
│   │   ├── hardware/       # Bluetooth cube drivers
│   │   │   ├── manager.ts  # Driver coordinator
│   │   │   ├── giiker.ts
│   │   │   ├── gan.ts
│   │   │   ├── qiyi.ts
│   │   │   ├── gocube.ts
│   │   │   └── moyu.ts
│   │   └── lib/            # Utilities
│   ├── public/             # Static assets
│   ├── index.html          # HTML template
│   └── package.json
│
├── CubeStats/              # Legacy single-file version
├── SPEC.md                 # Detailed specification
├── cubestats.db            # SQLite database
└── Dockerfile              # Container configuration
```

## Database

SQLite database at project root (`cubestats.db`). Tables created via `DatabaseExtensions.InitializeDatabase()` in `CubeStatsApi/Data/DatabaseExtensions.cs`.

## Bluetooth Cube Support

The `frontend/src/hardware/` directory contains drivers for:
- **Giiker** (Xiaomi Mi Smart Cube)
- **GAN** (GAN Cube with BLE)
- **Qiyi** (Qiyi Smart Cube)
- **GoCube** (Smart Cube)
- **Moyu** (Moyu Smart Cube)

Each driver implements the Web Bluetooth API for BLE communication with the cubes.

## Internationalization

Supported languages: English, Chinese (中文), Japanese (日本語). Managed in `frontend/src/modules/internationalization.ts`.

## Key Technical Details

- Timer uses millisecond precision with inspection time (15s WCA standard)
- Scramble types: WCA (20/25/30 moves), Cross, F2L, OLL (57 cases), PLL (21 cases)
- Virtual cube: Three.js for 3D rendering, table-based flat view
- Cube state: 6 faces × 9 stickers (54 total), standard WCA colors
- CFOP analysis tracks Cross, F2L, OLL, PLL step times
