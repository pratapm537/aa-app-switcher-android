import { NativeModule, requireNativeModule } from 'expo';

declare class QuickAppSwitcherOverlayModule extends NativeModule<{}> {
  checkOverlayPermission(): boolean;
  requestOverlayPermission(): void;
  startOverlay(): void;
  stopOverlay(): void;
  getHomeScreenBehavior(): "hide" | "show";
  setHomeScreenBehavior(value: "hide" | "show"): void;
  hasUsageAccess(): boolean;
  requestUsageAccess(): void;
  getIconSize(): "small" | "medium" | "large";
  setIconSize(value: "small" | "medium" | "large"): void;
  getOverlayOpacity(): number;
  setOverlayOpacity(value: number): void;
  getIconSpacing(): number;
  setIconSpacing(value: number): void;
  getInstalledApps(): { packageName: string; label: string; icon: string }[];
  getSelectedApp(slot: number): string;
  setSelectedApp(slot: number, packageName: string): void;
  saveSelectedApps(packages: string[]): void;
  getSwitcherStyle(): "with_dock" | "without_dock";
  setSwitcherStyle(style: "with_dock" | "without_dock"): void;
  getDarkMode(): boolean;
  setDarkMode(value: boolean): void;
  getDockBackgroundColor(): string;
  setDockBackgroundColor(color: string): void;
}

export default requireNativeModule<QuickAppSwitcherOverlayModule>('QuickAppSwitcherOverlay');
