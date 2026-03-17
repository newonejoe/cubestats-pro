# 3x3 Cubing Data Analysis Application

## Project Overview
- **Project Name**: CubeStats Pro
- **Tech Stack**: ASP.NET Core 10.0 Web API + SQLite + Vanilla JS Frontend + AOT Compilation
- **Reference Repo**: https://github.com/cs0x7f/cstimer
- **Type**: Web Application with Bluetooth Cube Integration
- **Core Functionality**: 
 - Session: Coach + Multiple users
 - User: Timer-based speedcubing session tracking with bluetooth cube connectivity and CFOP step analysis
 - Coach: Admin page for analysis 
 - Storage: SQLite or other light weight storage.
 - Use github to serve this application
- **Target Users**: Speedcubers who use bluetooth-enabled cubes for solving

---

## UI/UX Specification

### Layout Structure

**Main Sections:**
1. **Header** - App title, connection status, language selector, settings toggle
2. **Timer Display** - Large centered timer with scramble display
3. **Control Panel** - Start/Stop, inspection time, scramble type
4. **Session Stats** - Recent solve times, average, best
5. **Analysis Panel** - CFOP breakdown (O-step, P-step indicators)
6. **History Panel** - Solves list with filtering

**Responsive Breakpoints:**
- Mobile: < 768px (stacked layout)
- Tablet: 768px - 1024px (2-column)
- Desktop: > 1024px (full 3-column layout)

### Visual Design

**Color Palette:**
- Background: `#0a0a0f` (deep dark)
- Surface: `#14141f` (card background)
- Primary: `#00d4aa` (teal accent - for active states)
- Secondary: `#ff6b35` (orange - for O-step analysis)
- Tertiary: `#7c3aed` (purple - for P-step analysis)
- Text Primary: `#f0f0f5`
- Text Secondary: `#8888a0`
- Success: `#22c55e`
- Warning: `#eab308`
- Error: `#ef4444`

**Typography:**
- Font Family: `"JetBrains Mono", "Fira Code", monospace` for timer
- Font Family: `"DM Sans", sans-serif` for UI text
- Timer: 72px bold
- Headings: 24px semibold
- Body: 16px regular
- Small: 14px

**Spacing:**
- Base unit: 8px
- Card padding: 24px
- Section gaps: 32px

**Visual Effects:**
- Cards: subtle glow on hover (`box-shadow: 0 0 20px rgba(0, 212, 170, 0.1)`)
- Timer: pulsing glow when running
- Smooth transitions: 200ms ease-out
- Glassmorphism panels: `backdrop-filter: blur(10px)`
- Virtual cube: smooth 3D rotation animations (0.3s ease)

### Components

**Virtual Cube Display:**

Both views are displayed simultaneously side by side or stacked:

*Flat View (Scramble Target Display):*
- Displays the cube state after applying the current scramble
- Shows the target configuration the user needs to solve
- Unfolded cube net layout (3 rows: Empty-U-Empty, L-F-R-B, Empty-D-Empty)
- Standard WCA colors: White (U), Yellow (D), Green (F), Blue (B), Red (R), Orange (L)
- Updates automatically when new scramble is generated
- Always shows solved state initially, then shows scramble target when generated
- Table-based rendering with 9 stickers per face

*3D View (Bluetooth Real-time Status):*
- Three.js powered 3D Rubik's cube
- Reflects the current state of the physical Bluetooth cube
- Always starts from solved/reset state when cube is connected or when a new solve begins
- Updates in real-time as moves are detected from the Bluetooth cube
- Used during solving to show actual cube state

*3D Rendering Specifications:*
- Three.js WebGL rendering
- 3x3x3 cubie structure with black core and colored stickers
- Semi-transparent black core (opacity: 0.15) to see internal structure
- Gap between cubies: 1.12 units
- Camera position: (0, 0, 6) - perpendicular to white-green edge
- Cube rotation: X-axis 45° to show white and green faces equally
- View aligned along white-green edge (the edge connecting white and green faces)
- Sticker colors: White (top), Yellow (bottom), Green (front), Blue (back), Red (right), Orange (left)
- WebGL canvas: 400x400 pixels

*Shared Specifications:*
- Flat view: Table-based rendering (6 faces, 9 stickers each)
- 3D view: Three.js WebGL rendering
- Standard colors: White (U), Yellow (D), Red (R), Orange (L), Green (F), Blue (B)
- Reset button to restore solved state
- Animates scramble moves in sequence
- Toggle button to switch between viewing flat-only or 3D-only (but both are visible by default)

**Timer Display:**
- Large digital display (MM:SS.ms)
- Inspection countdown (15 seconds)
- States: idle, inspecting, solving, paused

**Scramble Display:**
- Current scramble in standard notation
- Scramble type selector: **WCA** (standard), **PLL** (last layer), **OLL** (first layer)
- Scramble length selector (20, 25, 30 moves for WCA)
- **Flat View Cube Preview**: Shows the scramble target state (applied scramble to solved cube)

**Cube Connection Panel:**
- Scan button for bluetooth devices
- Connection status indicator
- Last connected cube memory

**Session Statistics:**
- Current solve time
- Average of 5/12/100
- Best time
- Rolling averages

**CFOP Analysis Panel:**
- O-step indicator (cross + F2L awareness)
- P-step indicator (PLL recognition)
- Color-coded performance (green/yellow/red)

**Solve History:**
- Scrollable list with timestamps
- Click to view details
- Export to CSV

**Internationalization (i18n):**
- Language selector in header
- Supported languages: English (default), Chinese (中文), Japanese (日本語)
- All UI text translatable
- Persisted language preference in localStorage

---

## Functionality Specification

### Core Features

**1. Timer System:**
- Precise millisecond timing
- Configurable inspection time (0-15 seconds)
- Spacebar to start/stop
- Touch-friendly controls
- DNF/+2 penalty support

**2. Scramble Generation:**
- Random state scrambles (WCA standard)
- **Scramble Types**:
  - **WCA**: Standard random state scrambles (20/25/30 moves)
  - **PLL**: Permutation of Last Layer scrambles (21 unique cases)
  - **OLL**: Orientation of Last Layer scrambles (57 unique cases)
- Standard notation output (R, R', R2, etc.)
- Scramble preview
- Virtual cube updates to show scramble state in real-time

**3. Bluetooth Cube Integration:**
- Scan for BLE cubes (Giiker, Xiaomi, etc.)
- Connect/disconnect functionality
- Real-time move detection
- Auto-scramble verification

**4. Data Collection:**
- Solve times storage (localStorage)
- Move count tracking
- Session timestamps
- Export functionality (JSON/CSV)

**5. CFOP Analysis (O-step & P-step):**

*O-step (Orientation):*
- Cross solution time indicator
- First pair insertion analysis
- Color code: orange theme
- Shows: cross efficiency, F2L pair recognition

*P-step (Permutation):*
- Last layer permutation detection
- PLL case recognition
- Color code: purple theme
- Shows: PLL case, recognition time

**6. Statistics:**
- Ao5, Ao12, Ao100
- Best single, best Ao5
- Session history
- Trend graphs (optional)

### User Interactions

1. **Start Solve**: Press spacebar or tap start button
2. **Inspection**: 15-second countdown before solve
3. **Solving**: Timer runs, bluetooth cube tracks moves
4. **Finish**: Timer stops, data saved, analysis displayed
5. **Review**: View solve history, export data

### Data Handling

- All data stored in browser localStorage
- Structure: `{ solves: [...], sessions: [...] }`
- Export to JSON/CSV
- No server required

---

## Acceptance Criteria

1. ✓ Timer displays and counts accurately
2. ✓ Scrambler generates valid random scrambles
3. ✓ Bluetooth scan discovers available cubes
4. ✓ Solves are saved to localStorage
5. ✓ Session statistics calculate correctly
6. ✓ CFOP O-step indicator shows after solve
7. ✓ CFOP P-step indicator shows after solve
8. ✓ Data can be exported to CSV
9. ✓ Responsive on mobile/tablet/desktop
10. ✓ Keyboard shortcuts work (spacebar)
11. ✓ Virtual cube displays 3D cube state
12. ✓ Virtual cube animates scramble sequence
13.  Virtual cube is interactive (fixed view)

---

## Technical Implementation

- Single HTML file with embedded CSS/JS
- No framework dependencies (vanilla JS)
- Web Bluetooth API for cube connection
- localStorage for persistence
- CSS Grid/Flexbox for layout

---

## 3x3 Cube Structure

### Piece Types

A standard 3x3 Rubik's Cube has **54 stickers** across **26 visible pieces**:

| Piece Type | Count | Description |
|------------|-------|-------------|
| Center | 6 | 1 per face, defines face color, doesn't move relative to other centers |
| Corner | 8 | 3 colors each, located at cube corners |
| Edge | 12 | 2 colors each, between corners |

**Note**: The "center" pieces (with 1 sticker each) are fixed relative to each other - they don't change position during cube rotations.

---

### Standard Color Scheme (WCA)

| Face | Color | Position |
|------|-------|----------|
| U (Up) | White | Top |
| D (Down) | Yellow | Bottom (opposite White) |
| F (Front) | Green | Front |
| B (Back) | Blue | Back (opposite Green) |
| R (Right) | Red | Right side |
| L (Left) | Orange | Left side (opposite Red) |

**Opposite Face Pairs:**
- White ↔ Yellow
- Red ↔ Orange
- Green ↔ Blue

---

### Face Positions (Bird's Eye View)

When viewing the cube from above with White on top and Green in front:

```
           +---+---+---+
           | W | W | W |  ← Up (White)
           +---+---+---+
    +------+------+------+------+------+
    | O    | G    | R    | B    |      |  ← Left-Front-Right-Back
    +------+------+------+------+------+
           | Y | Y | Y |  ← Down (Yellow)
           +---+---+---+
```

**3D View Reference:**
- **U (White)**: Top face
- **D (Yellow)**: Bottom face
- **F (Green)**: Front face (toward viewer)
- **B (Blue)**: Back face
- **R (Red)**: Right face
- **L (Orange)**: Left face

---

### Corner Pieces (8 total)

Each corner has 3 colors. Standard solved state positions:

| Position | Colors | Adjacent Faces |
|----------|--------|----------------|
| URF | White-Green-Right | U + F + R |
| UFL | White-Green-Orange | U + F + L |
| ULB | White-Blue-Orange | U + B + L |
| UBR | White-Blue-Red | U + B + R |
| DFR | Yellow-Green-Right | D + F + R |
| DLF | Yellow-Green-Orange | D + F + L |
| DBL | Yellow-Blue-Orange | D + B + L |
| DRB | Yellow-Blue-Red | D + B + R |

---

### Edge Pieces (12 total)

Each edge has 2 colors. Standard solved state positions:

| Position | Colors | Adjacent Faces |
|----------|--------|----------------|
| UF | White-Green | U + F |
| UL | White-Blue | U + L |
| UB | White-Blue | U + B |
| UR | White-Red | U + R |
| FR | Green-Red | F + R |
| FL | Green-Orange | F + L |
| BL | Blue-Orange | B + L |
| BR | Blue-Red | B + R |
| DF | Yellow-Green | D + F |
| DL | Yellow-Orange | D + L |
| DB | Yellow-Blue | D + B |
| DR | Yellow-Red | D + R |

---

### Cube State Representation

In code, the cube state is represented as 6 arrays of 9 stickers each:

```
cubeState = {
    U: ['white', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'white'],
    D: ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
    F: ['green', 'green', 'green', 'green', 'green', 'green', 'green', 'green', 'green'],
    B: ['blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
    R: ['red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red'],
    L: ['orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange']
}
```

**Sticker Index Mapping (0-8):**
```
0 | 1 | 2
---------
3 | 4 | 5
---------
6 | 7 | 8
```

Index 4 is always the center piece of each face.

---

## Technical Requirements

- **.NET Version**: .NET 10.0
- **Compilation**: Self-contained single-file deployment (AOT disabled for compatibility)
- **Runtime**: Self-contained single-file deployment
- **Target Platform**: Linux x64

### Build Configuration

- Self-contained: true
- PublishSingleFile: true
- RuntimeIdentifier: linux-x64
- Executable: `cubestats` (~50MB)
- Static files served from `wwwroot/` folder

### Deployment

- **.NET API**: Deploy to Linux server or Azure Web App
- **Static Frontend**: GitHub Pages deployment from `wwwroot/` content
