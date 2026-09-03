# AA App Switcher

A lightweight Android app that provides a fast and convenient way to switch between selected applications using an overlay-based app switcher.

## Overview

AA App Switcher is designed to make switching between frequently used Android applications faster and more convenient.

Instead of repeatedly opening the launcher or navigating through recent apps, users can access their selected applications through a compact overlay switcher.

The project is built with React Native and Expo, with Android-native functionality used where required for the overlay experience.

---

## Features

### ⚡ Quick App Switching
Launch frequently used applications directly from the AA App Switcher overlay.

### 📱 Custom App Selection
Users can choose which applications appear in the switcher.

### 🔄 Dynamic App Management
Selected applications can be added, changed, removed, and reordered without rebuilding the application.

### 🔎 App Picker Search
The application picker supports:

- Case-insensitive search
- Partial application-name matching
- Clear search functionality
- No-results state

### 🎨 Customizable Appearance
The app provides theme and visual customization options for the switcher interface.

### 🌓 Light & Dark Theme
The settings interface supports light and dark appearance modes.

### 👆 Touch-Friendly Interface
The switcher is designed for quick interaction and launching with minimal user effort.

### 🪟 Android Overlay
The core switching experience uses Android overlay functionality to display the switcher above other applications.

### 🔔 Update Availability
AA App Switcher can check a lightweight remote version metadata file and notify users when a newer application version is available.

The version check is designed to be:

- Lightweight
- Silent when unavailable
- Dependency-free
- Independent of the core switching functionality

---

## Technology Stack

- React Native
- Expo
- Expo Router
- TypeScript
- Android Native APIs
- Kotlin
- Gradle
- Hermes JavaScript Engine

The project uses native Android functionality for the overlay service while keeping the application interface and configuration workflow primarily in React Native/Expo.

---

## Android Architecture

The application consists of two primary layers:

### React Native / Expo Layer

Responsible for:

- Application UI
- Settings
- App selection
- Search
- Theme handling
- Preview
- User interactions
- Version availability indicator

### Android Native Layer

Responsible for functionality that requires direct Android platform access, including:

- Overlay service
- Displaying the switcher above other applications
- Launching selected Android applications
- Android-specific service behavior

The native Android implementation is kept separate from the React Native UI layer to minimize unnecessary coupling.

---

## App Selection

AA App Switcher maintains a configurable list of selected applications.

Users can:

1. Open the application picker.
2. Search installed applications.
3. Select an application.
4. Add it to the switcher.
5. Replace or remove selected applications.
6. Launch applications directly from the switcher.

A minimum selected-app requirement is maintained so the switcher cannot be left without a usable application slot.

---

## Update System

AA App Switcher uses a lightweight remote version metadata system.

The application checks:

```text
version.json


