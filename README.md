# Quick App Switcher

Quick App Switcher is a React Native & native Android application that provides a highly customizable, persistent floating overlay to switch between your favorite apps instantly.

## Project Status

The core functionality has been implemented and refined over several stages. The app currently supports two distinct floating overlay modes: a classic "Floating Icons" mode and a modern "Assistive Dock" mode.

---

## What We Have Completed

### Step 4: Core Overlay & "Without Dock" Mode (Stable)
This phase established the robust native Android foundation and the React Native settings UI.

- **Floating Overlay Architecture**: Implemented a resilient native Android foreground service (`OverlayService.kt`) utilizing `WindowManager` to draw over other apps.
- **App Selection Sync**: Built a React Native App Picker that allows users to select 1–5 favorite apps, dynamically pulling installed packages and syncing them to the native service via `SharedPreferences`.
- **App Launching**: Implemented native `Intent` launching from the overlay icons.
- **Robust Touch & Drag**: Engineered a flawless touch handling system using `touchSlop` to distinguish between a tap (launch app) and a drag (move overlay), preventing accidental launches while moving.
- **Appearance Customization**:
  - **Icon Size**: Dynamic scaling for Small, Medium, and Large icons.
  - **Opacity**: Continuous slider to adjust the transparency of the overlay (10% to 100%).
  - **Spacing**: Configurable padding between icons (Tight, Default, Loose).
- **State Persistence**: Coordinates, edge bounds clamping, rotation adaptation, and visual preferences are fully persisted across device reboots and service restarts.

### Activation Zone (Experiment)
- We briefly implemented an experimental edge-based "Activation Zone" to trigger the overlay.
- After design review, we cleanly stripped out and removed all Activation Zone code to prioritize a simpler, always-visible assistive approach.

### Step 5: Switcher Style & Assistive Dock
Introduced a new overarching user preference to toggle how the Switcher is displayed, adding a highly polished "With Dock" mode while perfectly preserving the existing "Without Dock" mode.

- **React Native Preview**: Upgraded the Appearance Settings screen to offer a live preview of the pill-shaped dock when the style is toggled.
- **Dock Architecture**: Integrated a dynamic `GradientDrawable` pill background that wraps the app icons cleanly.
- **Magnetic Edge Snapping**: The dock intelligently calculates the distance to the screen bounds on touch release (`ACTION_UP`) and magnetically snaps to the Left, Right, Top, or Bottom edge while respecting safe margins.
- **Adaptive Orientation**: The layout dynamically pivots based on its snapped edge:
  - Left / Right Edge = Vertical stack
  - Top / Bottom Edge = Horizontal row
- **Expand & Collapse Interaction**: 
  - Added a minimal floating handle ("⋮") for the collapsed state.
  - Tapping the handle expands the dock to reveal the app icons.
- **Manual Collapse Control**: 
  - Added a contextual arrow button (◀, ▶, ▲, ▼) indicating the direction of collapse based on the current edge.
  - Removed automatic collapse on app launch, meaning the dock stays conveniently open until the user explicitly taps the arrow to close it.
- **Visual Polish & Opacity Architecture**: Isolated the native alpha channels so that the dock background remains subtle and translucent (respecting the Opacity slider), while the actual native launcher icons scale perfectly (`FIT_CENTER`) and remain 100% vividly opaque and crisp.

---

## Next Steps
- Clear the C++ cache (`./gradlew clean`) to resolve a known React Native Reanimated/Worklets linking issue.
- Perform a final manual device test on the Motorola Edge 30 Ultra to verify all 28 checklist behaviors for the newly implemented dock logic.
