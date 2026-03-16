# 3x3 Cubing Data Analysis Application

## Project Overview
- **Project Name**: CubeStats Pro
- **Tech Stack**: ASP.NET Core 8.0 Web API + SQLite + Vanilla JS Frontend
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
1. **Header** - App title, connection status, settings toggle
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
- 3D CSS-rendered Rubik's cube (6 faces, 9 stickers each)
- Standard colors: White (U), Yellow (D), Red (R), Orange (L), Blue (F), Green (B)
- Mouse drag to rotate view (orbit controls)
- Scroll wheel to zoom in/out
- Reset button to restore solved state
- Animates scramble moves in sequence
- Click on face to highlight that face

**Timer Display:**
- Large digital display (MM:SS.ms)
- Inspection countdown (15 seconds)
- States: idle, inspecting, solving, paused

**Scramble Display:**
- Current scramble in standard notation
- Scramble length selector (20, 25, 30 moves)
- **Virtual Cube Preview**: 3D interactive cube visualization showing scramble state

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
- Random state scrambles
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
13. ✓ Virtual cube is interactive (rotatable view)

---

## Technical Implementation

- Single HTML file with embedded CSS/JS
- No framework dependencies (vanilla JS)
- Web Bluetooth API for cube connection
- localStorage for persistence
- CSS Grid/Flexbox for layout
