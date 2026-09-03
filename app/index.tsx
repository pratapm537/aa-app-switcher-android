import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  BackHandler,
  Easing,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { OpacitySlider } from "../components/ui/OpacitySlider";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { SettingsCard } from "../components/ui/SettingsCard";
import QuickAppSwitcherOverlayModule from "../modules/overlay/src/QuickAppSwitcherOverlayModule";
import {
  DarkTheme,
  LightTheme,
  Theme,
  ThemeContext,
  getTypography,
} from "../theme/theme";

type OnboardingState = "CHECKING" | "READY" | "ERROR";
type ScreenState = "SETTINGS" | "APPEARANCE" | "APPS" | "ABOUT" | "PRIVACY";

export default function HomeScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [hasUsageAccess, setHasUsageAccess] = useState(false);
  const [homeBehavior, setHomeBehavior] = useState("show");
  const [iconSize, setIconSize] = useState<"small" | "medium" | "large">(
    "small",
  );
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.85);
  const [iconSpacing, setIconSpacing] = useState<number>(8);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<
    { packageName: string; label: string; icon: string }[]
  >([]);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [tempSelectedApps, setTempSelectedApps] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [onboardingState, setOnboardingState] =
    useState<OnboardingState>("CHECKING");
  const [errorMessage, setErrorMessage] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const isInitialMount = useRef(true);
  const onboardingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isNavigatingToSettings = useRef(false);
  const isReminderTimerActive = useRef(false);
  const isPermissionAlertVisible = useRef(false);
  const [switcherStyle, setSwitcherStyle] = useState<
    "with_dock" | "without_dock"
  >("with_dock");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [dockBackgroundColor, setDockBackgroundColor] = useState("#1C1C1E");
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ScreenState>("APPEARANCE");
  const [isOverlayRunning, setIsOverlayRunning] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionLayouts = useRef<{ [key: string]: number }>({});
  const drawerSlideAnim = useRef(new Animated.Value(-300)).current;
  const drawerFadeAnim = useRef(new Animated.Value(0)).current;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastSlideY = useRef(new Animated.Value(20)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastOpacity.setValue(0);
    toastSlideY.setValue(20);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(toastSlideY, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    toastTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(toastSlideY, {
          toValue: 20,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastMessage(null);
      });
    }, 1500);
  };

  const scrollToSection = (sectionId: string) => {
    const y = sectionLayouts.current[sectionId];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y, animated: true });
    } else if (sectionId === "top" && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerSlideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.poly(4)),
        useNativeDriver: true,
      }),
      Animated.timing(drawerFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(drawerSlideAnim, {
        toValue: -320,
        duration: 250,
        easing: Easing.in(Easing.poly(4)),
        useNativeDriver: true,
      }),
      Animated.timing(drawerFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDrawerOpen(false);
      if (typeof callback === "function") callback();
    });
  };

  const navigateTo = (
    sectionId: string,
    targetScreen: ScreenState = "APPEARANCE",
  ) => {
    closeDrawer(() => {
      if (activeScreen !== targetScreen) {
        setActiveScreen(targetScreen);
        if (sectionId) {
          setTimeout(() => scrollToSection(sectionId), 100);
        }
      } else if (sectionId) {
        scrollToSection(sectionId);
      }
    });
  };

  const startReminderTimer = () => {
    if (onboardingTimeoutRef.current) {
      clearTimeout(onboardingTimeoutRef.current);
    }
    isReminderTimerActive.current = true;
    onboardingTimeoutRef.current = setTimeout(() => {
      if (isPermissionAlertVisible.current) {
        return;
      }
      isReminderTimerActive.current = false;
      const perm = QuickAppSwitcherOverlayModule.checkOverlayPermission();
      let usagePerm = false;
      if (typeof QuickAppSwitcherOverlayModule.hasUsageAccess === "function") {
        usagePerm = QuickAppSwitcherOverlayModule.hasUsageAccess();
      }

      setHasPermission(perm);
      setHasUsageAccess(usagePerm);

      if (!perm || !usagePerm) {
        setOnboardingStep(!perm ? 1 : 2);
        setShowOnboarding(true);
      }
    }, 10000);
  };

  const checkPermissions = async () => {
    try {
      const perm = QuickAppSwitcherOverlayModule.checkOverlayPermission();
      setHasPermission(perm);

      let usagePerm = false;
      if (typeof QuickAppSwitcherOverlayModule.hasUsageAccess === "function") {
        usagePerm = QuickAppSwitcherOverlayModule.hasUsageAccess();
        setHasUsageAccess(usagePerm);
      }

      setOnboardingState("READY");

      if (!perm || !usagePerm) {
        setIsOverlayRunning(false);
        QuickAppSwitcherOverlayModule.stopOverlay();
      } else {
        if (onboardingTimeoutRef.current) {
          clearTimeout(onboardingTimeoutRef.current);
          onboardingTimeoutRef.current = null;
        }
        isReminderTimerActive.current = false;
        setShowOnboarding(false);
      }

      if (perm && usagePerm) {
        return;
      }

      setOnboardingStep(!perm ? 1 : 2);

      if (isInitialMount.current) {
        isInitialMount.current = false;
        if (onboardingTimeoutRef.current) {
          clearTimeout(onboardingTimeoutRef.current);
        }
        onboardingTimeoutRef.current = setTimeout(() => {
          setShowOnboarding(true);
        }, 3000);
      } else if (isNavigatingToSettings.current) {
        isNavigatingToSettings.current = false;
        setShowOnboarding(true);
      }
    } catch (error: any) {
      console.error("Error checking permissions:", error);
      setErrorMessage(error?.message || "Unknown error");
      setOnboardingState("ERROR");
    }
  };

  const loadPreferences = () => {
    let behavior: "hide" | "show" = "show";
    if (
      typeof QuickAppSwitcherOverlayModule.getHomeScreenBehavior === "function"
    ) {
      behavior = QuickAppSwitcherOverlayModule.getHomeScreenBehavior();
    }
    setHomeBehavior(behavior);

    let loadedIconSize: "small" | "medium" | "large" = "small";
    if (typeof QuickAppSwitcherOverlayModule.getIconSize === "function") {
      loadedIconSize = QuickAppSwitcherOverlayModule.getIconSize();
    }
    setIconSize(loadedIconSize);

    let loadedOpacity = 0.85;
    if (typeof QuickAppSwitcherOverlayModule.getOverlayOpacity === "function") {
      loadedOpacity = QuickAppSwitcherOverlayModule.getOverlayOpacity();
    }
    setOverlayOpacity(loadedOpacity);

    let loadedSpacing = 8;
    if (typeof QuickAppSwitcherOverlayModule.getIconSpacing === "function") {
      loadedSpacing = QuickAppSwitcherOverlayModule.getIconSpacing();
    }
    setIconSpacing(loadedSpacing);

    if (typeof QuickAppSwitcherOverlayModule.getSelectedApp === "function") {
      const apps = [];
      for (let i = 1; i <= 5; i++) {
        const pkg = QuickAppSwitcherOverlayModule.getSelectedApp(i);
        if (pkg) {
          apps.push(pkg);
        }
      }
      setSelectedApps(apps);
    }

    if (typeof QuickAppSwitcherOverlayModule.getInstalledApps === "function") {
      setInstalledApps(QuickAppSwitcherOverlayModule.getInstalledApps());
    }

    if (typeof QuickAppSwitcherOverlayModule.getSwitcherStyle === "function") {
      const style = QuickAppSwitcherOverlayModule.getSwitcherStyle();
      if (style === "with_dock" || style === "without_dock") {
        setSwitcherStyle(style);
      }
    }

    if (typeof QuickAppSwitcherOverlayModule.getDarkMode === "function") {
      setIsDarkMode(QuickAppSwitcherOverlayModule.getDarkMode());
    }

    if (
      typeof QuickAppSwitcherOverlayModule.getDockBackgroundColor === "function"
    ) {
      setDockBackgroundColor(
        QuickAppSwitcherOverlayModule.getDockBackgroundColor(),
      );
    }
  };

  const syncOverlayState = () => {
    if (typeof QuickAppSwitcherOverlayModule.isOverlayRunning === "function") {
      setIsOverlayRunning(QuickAppSwitcherOverlayModule.isOverlayRunning());
    }
  };

  useEffect(() => {
    checkPermissions();
    loadPreferences();
    syncOverlayState();
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkPermissions();
        syncOverlayState();
        if (isReminderTimerActive.current) {
          startReminderTimer();
        }
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        if (onboardingTimeoutRef.current) {
          clearTimeout(onboardingTimeoutRef.current);
        }
      }
    });
    return () => {
      subscription.remove();
      if (onboardingTimeoutRef.current) {
        clearTimeout(onboardingTimeoutRef.current);
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (
        activeScreen === "SETTINGS" ||
        activeScreen === "ABOUT" ||
        activeScreen === "PRIVACY"
      ) {
        setActiveScreen("APPEARANCE");
        return true;
      }
      if (activeScreen === "APPEARANCE") {
        BackHandler.exitApp();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [activeScreen]);

  const requestPermission = () => {
    isNavigatingToSettings.current = true;
    QuickAppSwitcherOverlayModule.requestOverlayPermission();
  };

  const requestUsageAccess = () => {
    isNavigatingToSettings.current = true;
    if (
      typeof QuickAppSwitcherOverlayModule.requestUsageAccess === "function"
    ) {
      QuickAppSwitcherOverlayModule.requestUsageAccess();
    }
  };

  const startOverlay = () => {
    QuickAppSwitcherOverlayModule.startOverlay();
    setIsOverlayRunning(true);
  };

  const stopOverlay = () => {
    QuickAppSwitcherOverlayModule.stopOverlay();
    setIsOverlayRunning(false);
  };

  const toggleOverlay = (value: boolean) => {
    if (value) {
      const perm = QuickAppSwitcherOverlayModule.checkOverlayPermission();
      let usagePerm = false;
      if (typeof QuickAppSwitcherOverlayModule.hasUsageAccess === "function") {
        usagePerm = QuickAppSwitcherOverlayModule.hasUsageAccess();
      }

      setHasPermission(perm);
      setHasUsageAccess(usagePerm);

      if (!perm || !usagePerm) {
        let title = "Permission Required";
        let message =
          "AA App Switcher needs Overlay Permission and Usage Access to activate App Switcher.";

        if (!perm && usagePerm) {
          message =
            "Overlay Permission is currently OFF. Please enable it to activate App Switcher.";
        } else if (perm && !usagePerm) {
          message =
            "Usage Access is currently OFF. Please enable it to activate App Switcher.";
        }

        isPermissionAlertVisible.current = true;
        Alert.alert(
          title,
          message,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                isPermissionAlertVisible.current = false;
                if (isReminderTimerActive.current) {
                  startReminderTimer();
                }
              },
            },
            {
              text: "OK",
              onPress: () => {
                isPermissionAlertVisible.current = false;
                setOnboardingStep(!perm ? 1 : 2);
                setShowOnboarding(true);
              },
            },
          ],
          {
            cancelable: true,
            onDismiss: () => {
              isPermissionAlertVisible.current = false;
              if (isReminderTimerActive.current) {
                startReminderTimer();
              }
            },
          },
        );
        return;
      }
      startOverlay();
      showToast("✓ App Switcher Activated");
    } else {
      stopOverlay();
      showToast("✓ App Switcher Deactivated");
    }
  };

  const handleBehaviorChange = (behavior: "hide" | "show") => {
    setHomeBehavior(behavior);
    if (
      typeof QuickAppSwitcherOverlayModule.setHomeScreenBehavior === "function"
    ) {
      QuickAppSwitcherOverlayModule.setHomeScreenBehavior(behavior);
    }
  };

  const handleSwitcherStyleChange = (style: "with_dock" | "without_dock") => {
    setSwitcherStyle(style);
    if (typeof QuickAppSwitcherOverlayModule.setSwitcherStyle === "function") {
      QuickAppSwitcherOverlayModule.setSwitcherStyle(style);
    }
    showToast(style === "with_dock" ? "✓ With Dock Enabled" : "✓ Dock Enabled");
  };

  const handleDarkModeChange = (value: boolean) => {
    setIsDarkMode(value);
    if (typeof QuickAppSwitcherOverlayModule.setDarkMode === "function") {
      QuickAppSwitcherOverlayModule.setDarkMode(value);
    }
  };

  const handleDockBackgroundColorChange = (color: string) => {
    setDockBackgroundColor(color);
    if (
      typeof QuickAppSwitcherOverlayModule.setDockBackgroundColor === "function"
    ) {
      QuickAppSwitcherOverlayModule.setDockBackgroundColor(color);
    }
  };

  const handleIconSizeChange = (size: string) => {
    const newSize = size as "small" | "medium" | "large";
    setIconSize(newSize);
    if (typeof QuickAppSwitcherOverlayModule.setIconSize === "function") {
      QuickAppSwitcherOverlayModule.setIconSize(newSize);
    }
  };

  const handleOpacityChange = (value: number) => {
    setOverlayOpacity(value);
    if (typeof QuickAppSwitcherOverlayModule.setOverlayOpacity === "function") {
      QuickAppSwitcherOverlayModule.setOverlayOpacity(value);
    }
  };

  const handleIconSpacingChange = (spacing: number) => {
    setIconSpacing(spacing);
    if (typeof QuickAppSwitcherOverlayModule.setIconSpacing === "function") {
      QuickAppSwitcherOverlayModule.setIconSpacing(spacing);
    }
  };

  const commitSelection = () => {
    // Only save if the array contents actually changed
    if (JSON.stringify(tempSelectedApps) !== JSON.stringify(selectedApps)) {
      QuickAppSwitcherOverlayModule.saveSelectedApps(tempSelectedApps);
      setSelectedApps(tempSelectedApps);
    }
    setIsPickerVisible(false);
    setSearchQuery("");
  };

  const toggleAppSelection = (packageName: string) => {
    if (tempSelectedApps.includes(packageName)) {
      // Remove it
      setTempSelectedApps(tempSelectedApps.filter((p) => p !== packageName));
    } else {
      // Add it
      if (tempSelectedApps.length >= 5) {
        Alert.alert(
          "Maximum Apps Reached",
          "You can add up to 5 apps. Remove an app before adding another.",
          [{ text: "OK" }],
        );
      } else {
        setTempSelectedApps([...tempSelectedApps, packageName]);
      }
    }
  };

  const handleRemoveApp = (index: number) => {
    if (selectedApps.length <= 1) return;
    const newApps = [...selectedApps];
    newApps.splice(index, 1);
    QuickAppSwitcherOverlayModule.saveSelectedApps(newApps);
    setSelectedApps(newApps);
  };

  const getAppName = (packageName: string) => {
    const app = installedApps.find((a) => a.packageName === packageName);
    return app ? app.label : packageName;
  };

  const getAppIcon = (packageName: string) => {
    const app = installedApps.find((a) => a.packageName === packageName);
    return app?.icon ? `data:image/png;base64,${app.icon}` : null;
  };

  const handleCancelOnboarding = () => {
    setShowOnboarding(false);
    startReminderTimer();
  };

  if (onboardingState === "ERROR") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.description}>
          Failed to verify permissions: {errorMessage}
        </Text>
        <TouchableOpacity
          onPress={checkPermissions}
          style={styles.buttonPrimary}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (onboardingState === "CHECKING") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Theme.colors.accent} />
      </View>
    );
  }

  const hexToRgba = (hex: string, alpha: number) => {
    let h = hex.replace("#", "");
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const renderSettings = () => (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
    >
      <ScreenHeader title="Appearance" onHamburger={openDrawer} />

      {/* 0. LIVE PREVIEW */}
      <View
        style={[
          styles.previewSection,
          {
            paddingVertical: currentTheme.spacing.md,
            marginBottom: currentTheme.spacing.lg,
          },
        ]}
      >
        <View
          style={[
            styles.previewContainer,
            switcherStyle === "with_dock"
              ? {
                  backgroundColor: hexToRgba(
                    dockBackgroundColor,
                    overlayOpacity,
                  ),
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 100, // Pill shape
                  ...currentTheme.shadow.card,
                }
              : null,
          ]}
        >
          {selectedApps.map((pkg, idx) => {
            const iconUri = getAppIcon(pkg);

            const containerSize =
              iconSize === "small" ? 30 : iconSize === "large" ? 44 : 36;
            const imageSize =
              iconSize === "small" ? 20 : iconSize === "large" ? 30 : 24;
            const marginLeft = idx === 0 ? 0 : iconSpacing;

            return (
              <View key={idx} style={{ marginLeft, position: "relative" }}>
                <View
                  style={[
                    styles.previewAppBox,
                    {
                      width: containerSize,
                      height: containerSize,
                      opacity:
                        switcherStyle === "with_dock" ? 1.0 : overlayOpacity,
                      backgroundColor:
                        switcherStyle === "with_dock"
                          ? "transparent"
                          : currentTheme.colors.surface,
                      elevation: switcherStyle === "with_dock" ? 0 : 2,
                      shadowOpacity: switcherStyle === "with_dock" ? 0 : 0.1,
                    },
                  ]}
                >
                  {iconUri ? (
                    <Image
                      source={{ uri: iconUri }}
                      style={[
                        styles.previewAppIcon,
                        { width: imageSize, height: imageSize },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.previewAppIconPlaceholder,
                        {
                          width: imageSize,
                          height: imageSize,
                          backgroundColor: currentTheme.colors.border,
                        },
                      ]}
                    />
                  )}
                </View>
              </View>
            );
          })}

          {switcherStyle === "with_dock" && (
            <View
              style={{
                marginLeft: iconSpacing,
                width:
                  iconSize === "small" ? 30 : iconSize === "large" ? 44 : 36,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 20 }}>▼</Text>
            </View>
          )}
        </View>
      </View>

      {/* 1. APP SWITCHER */}
      <View
        onLayout={(e) =>
          (sectionLayouts.current["activation"] = e.nativeEvent.layout.y)
        }
      >
        <SettingsCard
          title="App Switcher"
          description="STATUS"
          rightElement={
            <Switch
              value={isOverlayRunning}
              onValueChange={toggleOverlay}
              trackColor={{
                false: currentTheme.colors.border,
                true: currentTheme.colors.accent,
              }}
              thumbColor="#fff"
            />
          }
        />
      </View>

      {/* 2. APPS */}
      <View
        onLayout={(e) =>
          (sectionLayouts.current["apps"] = e.nativeEvent.layout.y)
        }
      >
        <SettingsCard title="Apps" description="Configure active applications">
          <View style={styles.previewContainer}>
            {selectedApps.map((pkg, idx) => {
              const iconUri = getAppIcon(pkg);

              const containerSize =
                iconSize === "small" ? 30 : iconSize === "large" ? 44 : 36;
              const imageSize =
                iconSize === "small" ? 20 : iconSize === "large" ? 30 : 24;
              const marginLeft = idx === 0 ? 0 : iconSpacing;

              return (
                <View key={idx} style={{ marginLeft, position: "relative" }}>
                  <View
                    style={[
                      styles.previewAppBox,
                      {
                        width: containerSize,
                        height: containerSize,
                        opacity: 1.0,
                        backgroundColor: currentTheme.colors.surface,
                        elevation: 2,
                        shadowOpacity: 0.1,
                      },
                    ]}
                  >
                    {iconUri ? (
                      <Image
                        source={{ uri: iconUri }}
                        style={[
                          styles.previewAppIcon,
                          { width: imageSize, height: imageSize },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.previewAppIconPlaceholder,
                          {
                            width: imageSize,
                            height: imageSize,
                            backgroundColor: currentTheme.colors.border,
                          },
                        ]}
                      />
                    )}
                  </View>
                  {selectedApps.length > 1 && (
                    <TouchableOpacity
                      style={styles.previewMinusButton}
                      onPress={() => handleRemoveApp(idx)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.previewMinusText}>−</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {selectedApps.length < 5 && (
              <TouchableOpacity
                style={[
                  styles.previewAddButton,
                  {
                    marginLeft: selectedApps.length === 0 ? 0 : iconSpacing,
                    borderColor: currentTheme.colors.textSecondary,
                  },
                ]}
                onPress={() => {
                  setTempSelectedApps([...selectedApps]);
                  setIsPickerVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.previewAddText,
                    { color: currentTheme.colors.textSecondary },
                  ]}
                >
                  +
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text
            style={[
              styles.previewFooterText,
              { color: currentTheme.colors.textSecondary },
            ]}
          >
            Maximum 5 apps are allowed
          </Text>
        </SettingsCard>
      </View>

      {/* 3. SWITCHER STYLE */}
      <View
        onLayout={(e) =>
          (sectionLayouts.current["appearance"] = e.nativeEvent.layout.y)
        }
      >
        <SettingsCard
          title="Switcher Style"
          description="Choose how Switcher appears"
        >
          <SegmentedControl
            options={[
              { label: "WITHOUT DOCK", value: "without_dock" },
              { label: "WITH DOCK", value: "with_dock" },
            ]}
            selectedValue={switcherStyle}
            onValueChange={(val) =>
              handleSwitcherStyleChange(val as "with_dock" | "without_dock")
            }
          />
        </SettingsCard>

        {/* 4. ICON SIZE */}
        <SettingsCard
          title="Icon Size"
          description="Scale of the switcher icons"
        >
          <SegmentedControl
            options={[
              { label: "SMALL", value: "small" },
              { label: "MEDIUM", value: "medium" },
              { label: "LARGE", value: "large" },
            ]}
            selectedValue={iconSize}
            onValueChange={handleIconSizeChange}
          />
        </SettingsCard>

        {/* 5. OPACITY */}
        <SettingsCard
          title="Opacity"
          description="Overlay transparency level"
          rightElement={
            <Text
              style={{ color: currentTheme.colors.accent, fontWeight: "bold" }}
            >
              {Math.round(overlayOpacity * 100)}%
            </Text>
          }
        >
          <OpacitySlider
            value={overlayOpacity}
            onValueChange={handleOpacityChange}
          />
        </SettingsCard>

        {/* 6. SPACING */}
        <SettingsCard title="Spacing" description="Distance between icons">
          <SegmentedControl
            options={[
              { label: "COMPACT", value: 4 },
              { label: "NORMAL", value: 8 },
              { label: "WIDE", value: 16 },
            ]}
            selectedValue={iconSpacing}
            onValueChange={handleIconSpacingChange}
          />
        </SettingsCard>
      </View>

      {/* 7. APPEARANCE */}
      <SettingsCard
        title="Appearance"
        description="Show or hide on home screen"
      >
        <SegmentedControl
          options={[
            { label: "KEEP", value: "show" },
            { label: "HIDE", value: "hide" },
          ]}
          selectedValue={homeBehavior}
          onValueChange={(val) => handleBehaviorChange(val as "hide" | "show")}
        />
      </SettingsCard>
    </ScrollView>
  );

  const renderSettingsScreen = () => (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
    >
      <ScreenHeader
        title="Settings"
        onBack={() => setActiveScreen("APPEARANCE")}
      />
      <SettingsCard title="Settings">
        {/* Dark Mode */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: currentTheme.spacing.md,
          }}
        >
          <View>
            <Text style={currentTypography.label}>Dark Mode</Text>
            <Text style={currentTypography.description}>
              Use dark theme for settings UI
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={handleDarkModeChange}
            trackColor={{
              false: currentTheme.colors.border,
              true: currentTheme.colors.accent,
            }}
            thumbColor="#fff"
          />
        </View>

        {/* Background Color */}
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: currentTheme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: currentTheme.colors.border,
          }}
          onPress={() => setIsColorPickerVisible(true)}
        >
          <View>
            <Text style={currentTypography.label}>Background Color</Text>
            <Text style={currentTypography.description}>
              Choose the dock background color
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: dockBackgroundColor,
                marginRight: currentTheme.spacing.sm,
                borderWidth: 1,
                borderColor: currentTheme.colors.border,
              }}
            />
            <Text
              style={{ color: currentTheme.colors.textSecondary, fontSize: 20 }}
            >
              ›
            </Text>
          </View>
        </TouchableOpacity>
      </SettingsCard>
    </ScrollView>
  );

  const renderAboutScreen = () => (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
    >
      <ScreenHeader
        title="About"
        onBack={() => setActiveScreen("APPEARANCE")}
      />

      <View
        style={{
          alignItems: "center",
          marginBottom: currentTheme.spacing.xl,
          marginTop: currentTheme.spacing.md,
        }}
      >
        <Image
          source={require("../assets/images/aa-app-switcher-icon.png")}
          style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text
          style={[
            currentTypography.screenTitle,
            { textAlign: "center", marginBottom: 8 },
          ]}
        >
          AA App Switcher
        </Text>
        <Text
          style={[
            currentTypography.description,
            { textAlign: "center", marginHorizontal: 20 },
          ]}
        >
          Quickly switch between your favorite apps from anywhere on your
          Android device.
        </Text>
      </View>

      <SettingsCard title="Features">
        <View style={{ paddingVertical: currentTheme.spacing.sm }}>
          <Text style={[currentTypography.label, { marginBottom: 4 }]}>
            • Floating App Switcher
          </Text>
          <Text style={[currentTypography.description, { marginBottom: 16 }]}>
            Quickly access your selected apps from anywhere on your phone.
          </Text>

          <Text style={[currentTypography.label, { marginBottom: 4 }]}>
            • Up to 5 Apps
          </Text>
          <Text style={[currentTypography.description, { marginBottom: 16 }]}>
            Select up to five apps for quick access.
          </Text>

          <Text style={[currentTypography.label, { marginBottom: 4 }]}>
            • Without Dock
          </Text>
          <Text style={[currentTypography.description, { marginBottom: 16 }]}>
            Use individual floating app icons without a dock.
          </Text>

          <Text style={[currentTypography.label, { marginBottom: 4 }]}>
            • With Dock
          </Text>
          <Text style={[currentTypography.description, { marginBottom: 16 }]}>
            Use a clean dock containing your selected apps.
          </Text>

          <Text style={[currentTypography.label, { marginBottom: 4 }]}>
            • Customizable Icon Size
          </Text>
          <Text style={[currentTypography.description, { marginBottom: 16 }]}>
            Choose Small, Medium, or Large icons.
          </Text>

          <Text style={[currentTypography.label, { marginBottom: 4 }]}>
            • Adjustable Opacity
          </Text>
          <Text style={[currentTypography.description, { marginBottom: 16 }]}>
            Control the transparency of the floating switcher.
          </Text>

          <Text style={[currentTypography.label, { marginBottom: 4 }]}>
            • Adjustable Spacing
          </Text>
          <Text style={[currentTypography.description, { marginBottom: 16 }]}>
            Choose Compact, Normal, or Wide spacing.
          </Text>

          <Text style={[currentTypography.label, { marginBottom: 4 }]}>
            • Magnetic Edge Positioning
          </Text>
          <Text style={[currentTypography.description, { marginBottom: 16 }]}>
            The switcher automatically snaps to the nearest screen edge.
          </Text>

          <Text style={[currentTypography.label, { marginBottom: 4 }]}>
            • Custom Dock Appearance
          </Text>
          <Text style={[currentTypography.description, { marginBottom: 4 }]}>
            Use Dark Mode and customize the dock background color.
          </Text>
        </View>
      </SettingsCard>

      <SettingsCard title="Version">
        <View style={{ paddingVertical: currentTheme.spacing.sm }}>
          <Text style={currentTypography.description}>Version 1.0.0</Text>

          <View style={{ marginTop: 20 }}>
            <Text
              style={[
                currentTypography.label,
                { fontSize: 14, marginBottom: 4 },
              ]}
            >
              Founder & Developer
            </Text>
            <Text style={currentTypography.description}>
              Mohit Pratap Mehra
            </Text>
          </View>
        </View>
      </SettingsCard>

      <View
        style={{
          alignItems: "center",
          marginTop: 24,
          marginBottom: 40,
          opacity: 0.6,
        }}
      >
        <Text
          style={[
            currentTypography.description,
            { fontSize: 12, textAlign: "center" },
          ]}
        >
          © 2026 Quick App Switcher
        </Text>
        <Text
          style={[
            currentTypography.description,
            { fontSize: 12, textAlign: "center" },
          ]}
        >
          All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );

  const renderPrivacyScreen = () => (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={[styles.scrollContent, { padding: 0 }]}
    >
      <ScreenHeader
        title="Privacy Policy"
        onBack={() => setActiveScreen("APPEARANCE")}
      />

      <View
        style={{
          backgroundColor: currentTheme.colors.surface,
          margin: currentTheme.spacing.md,
          padding: currentTheme.spacing.lg,
          borderRadius: 16,
          ...Theme.shadow.card,
        }}
      >
        <Text
          style={[
            currentTypography.screenTitle,
            { marginBottom: 24, textAlign: "center" },
          ]}
        >
          Privacy Policy{"\n"}
          <Text
            style={{
              fontSize: 16,
              fontWeight: "400",
              color: currentTheme.colors.textSecondary,
            }}
          >
            AA App Switcher
          </Text>
        </Text>

        <Text
          style={[
            currentTypography.cardTitle,
            { marginBottom: 8, fontSize: 18, fontWeight: "700" },
          ]}
        >
          1. Introduction
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 20, lineHeight: 24 },
          ]}
        >
          This Privacy Policy explains how AA App Switcher ("we", "our", or "the
          app") handles information on your device. We are committed to
          protecting your privacy. AA App Switcher is designed to operate
          entirely locally on your device without requiring internet access for
          its core features.
        </Text>

        <Text
          style={[
            currentTypography.cardTitle,
            { marginBottom: 8, fontSize: 18, fontWeight: "700" },
          ]}
        >
          2. Information We Access or Collect
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 20, lineHeight: 24 },
          ]}
        >
          AA App Switcher only accesses the minimum information necessary to
          provide its intended functionality. We do not require you to create an
          account. We do not collect your name, email address, phone number,
          contacts, location, photos, payment information, or any other personal
          information.
        </Text>

        <Text
          style={[
            currentTypography.cardTitle,
            { marginBottom: 8, fontSize: 18, fontWeight: "700" },
          ]}
        >
          3. Permissions We Use
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 12, lineHeight: 24 },
          ]}
        >
          Because AA App Switcher provides specialized navigation features, it
          requires specific Android permissions. We use only the following
          permissions:
        </Text>
        <Text
          style={[
            currentTypography.label,
            { marginBottom: 4, fontWeight: "600" },
          ]}
        >
          Display over other apps (Overlay):
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 12, lineHeight: 24 },
          ]}
        >
          Allows AA App Switcher to display the floating App Switcher/Dock over
          other applications so you can access it at any time.
        </Text>
        <Text
          style={[
            currentTypography.label,
            { marginBottom: 4, fontWeight: "600" },
          ]}
        >
          Usage Access:
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 12, lineHeight: 24 },
          ]}
        >
          Required to determine the currently active/foreground application so
          the App Switcher can provide its intended switching behavior and
          intelligently hide or show the dock.
        </Text>
        <Text
          style={[
            currentTypography.label,
            { marginBottom: 4, fontWeight: "600" },
          ]}
        >
          Foreground Service & Notifications:
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 20, lineHeight: 24 },
          ]}
        >
          Required by the Android system to run our background service reliably
          and display a persistent notification, ensuring the app switcher
          remains active while you use other apps.
        </Text>

        <Text
          style={[
            currentTypography.cardTitle,
            { marginBottom: 8, fontSize: 18, fontWeight: "700" },
          ]}
        >
          4. How We Use Information
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 20, lineHeight: 24 },
          ]}
        >
          The application context (such as knowing which app is in the
          foreground) is evaluated in real-time purely to determine whether the
          dock should be shown or hidden. This evaluation happens locally on
          your device. We do not log, track, or build profiles of your app usage
          history.
        </Text>

        <Text
          style={[
            currentTypography.cardTitle,
            { marginBottom: 8, fontSize: 18, fontWeight: "700" },
          ]}
        >
          5. Data Storage
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 20, lineHeight: 24 },
          ]}
        >
          The app stores your configuration preferences (such as your selected
          apps, icon size, spacing, opacity, and theme) directly on your
          device's local storage. This data never leaves your device.
        </Text>

        <Text
          style={[
            currentTypography.cardTitle,
            { marginBottom: 8, fontSize: 18, fontWeight: "700" },
          ]}
        >
          6. Data Sharing
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 20, lineHeight: 24 },
          ]}
        >
          We do not share any data with third parties. AA App Switcher does not
          include any third-party analytics, crash-reporting services, or
          advertising SDKs. No information is transmitted to our servers or any
          external services.
        </Text>

        <Text
          style={[
            currentTypography.cardTitle,
            { marginBottom: 8, fontSize: 18, fontWeight: "700" },
          ]}
        >
          7. Data Security
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 20, lineHeight: 24 },
          ]}
        >
          Your configuration data is secured by the Android operating system's
          standard application sandbox protections, which isolate our app's data
          from other applications.
        </Text>

        <Text
          style={[
            currentTypography.cardTitle,
            { marginBottom: 8, fontSize: 18, fontWeight: "700" },
          ]}
        >
          8. Data Retention and Deletion
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 20, lineHeight: 24 },
          ]}
        >
          Your preferences are retained on your device for as long as the app is
          installed. You can delete all data stored by AA App Switcher at any
          time by clearing the app's storage in your Android system settings or
          by completely uninstalling the app.
        </Text>

        <Text
          style={[
            currentTypography.cardTitle,
            { marginBottom: 8, fontSize: 18, fontWeight: "700" },
          ]}
        >
          9. Children's Privacy
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 20, lineHeight: 24 },
          ]}
        >
          Our application does not collect any personal information from anyone,
          including children under the age of 13.
        </Text>

        <Text
          style={[
            currentTypography.cardTitle,
            { marginBottom: 8, fontSize: 18, fontWeight: "700" },
          ]}
        >
          10. Changes to This Privacy Policy
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 20, lineHeight: 24 },
          ]}
        >
          We may update our Privacy Policy from time to time. Since the app does
          not collect your contact information, we cannot notify you directly of
          changes. We advise you to review this page periodically for any
          changes.
        </Text>

        <Text
          style={[
            currentTypography.cardTitle,
            { marginBottom: 8, fontSize: 18, fontWeight: "700" },
          ]}
        >
          11. Contact Us
        </Text>
        <Text
          style={[
            currentTypography.description,
            { marginBottom: 20, lineHeight: 24 },
          ]}
        >
          If you have any questions or suggestions about our Privacy Policy, do
          not hesitate to contact us at pratapm537@gmail.com.
        </Text>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );

  const renderAppPickerModal = () => (
    <Modal
      visible={isPickerVisible}
      animationType="slide"
      onRequestClose={commitSelection}
    >
      <SafeAreaView
        style={[
          styles.modalContainer,
          { backgroundColor: currentTheme.colors.background },
        ]}
      >
        <View
          style={[
            styles.modalHeader,
            { borderBottomColor: currentTheme.colors.border },
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              { color: currentTheme.colors.textPrimary },
            ]}
          >
            Select Apps
          </Text>
          <TouchableOpacity onPress={commitSelection}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: currentTheme.colors.surface,
              borderBottomColor: currentTheme.colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.searchInputWrapper,
              { backgroundColor: currentTheme.colors.background },
            ]}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[
                styles.searchInput,
                { color: currentTheme.colors.textPrimary },
              ]}
              placeholder="Search apps..."
              placeholderTextColor={currentTheme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearSearchButton}
              >
                <Text style={styles.clearSearchText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={installedApps.filter((app) => {
            const trimmedQuery = searchQuery.trim();
            if (trimmedQuery.length === 0) return true;
            return app.label.toLowerCase().includes(trimmedQuery.toLowerCase());
          })}
          keyExtractor={(item) => item.packageName}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: currentTheme.colors.textSecondary },
                ]}
              >
                {searchQuery.trim().length === 0
                  ? "No more apps available"
                  : "No apps found"}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.pickerRow,
                {
                  backgroundColor: currentTheme.colors.surface,
                  borderBottomColor: currentTheme.colors.background,
                },
              ]}
              onPress={() => toggleAppSelection(item.packageName)}
            >
              {item.icon ? (
                <Image
                  source={{ uri: `data:image/png;base64,${item.icon}` }}
                  style={styles.pickerIcon}
                />
              ) : (
                <View
                  style={[
                    styles.pickerIconPlaceholder,
                    { backgroundColor: currentTheme.colors.border },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.pickerAppName,
                  { color: currentTheme.colors.textPrimary, flex: 1 },
                ]}
              >
                {item.label}
              </Text>
              {tempSelectedApps.includes(item.packageName) && (
                <Text
                  style={{
                    color: "#10B981",
                    fontSize: 18,
                    fontWeight: "bold",
                    marginRight: 10,
                  }}
                >
                  ✓
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );

  const currentTheme = isDarkMode ? DarkTheme : LightTheme;
  const currentTypography = getTypography(currentTheme.colors);

  const PALETTE = [
    "#1C1C1E",
    "#000000",
    "#FFFFFF",
    "#8E8E93",
    "#3B82F6",
    "#8B4513",
    "#10B981",
    "#EF4444",
    "#06B6D4",
    "#F59E0B",
    "#EC4899",
    "#8B5CF6",
    "#14B8A6",
    "#F97316",
  ];

  const renderColorPickerModal = () => (
    <Modal
      visible={isColorPickerVisible}
      animationType="slide"
      onRequestClose={() => setIsColorPickerVisible(false)}
    >
      <SafeAreaView
        style={[
          styles.modalContainer,
          { backgroundColor: currentTheme.colors.background },
        ]}
      >
        <View
          style={[
            styles.modalHeader,
            { borderBottomColor: currentTheme.colors.border },
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              { color: currentTheme.colors.textPrimary },
            ]}
          >
            Background Color
          </Text>
          <TouchableOpacity onPress={() => setIsColorPickerVisible(false)}>
            <Text
              style={{
                color: currentTheme.colors.accent,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: currentTheme.spacing.lg }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {PALETTE.map((color, index) => {
              const isSelected =
                dockBackgroundColor.toLowerCase() === color.toLowerCase();
              return (
                <TouchableOpacity
                  key={index}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: color,
                    margin: 12,
                    borderWidth: 2,
                    borderColor: isSelected
                      ? currentTheme.colors.accent
                      : currentTheme.colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    ...currentTheme.shadow.card,
                  }}
                  onPress={() => handleDockBackgroundColorChange(color)}
                >
                  {isSelected && (
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: currentTheme.colors.accent,
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderDrawerModal = () => (
    <Modal
      visible={isDrawerOpen}
      transparent={true}
      animationType="none"
      onRequestClose={() => closeDrawer()}
    >
      <View style={{ flex: 1, flexDirection: "row" }}>
        <TouchableWithoutFeedback onPress={() => closeDrawer()}>
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#000",
              opacity: drawerFadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
            }}
          />
        </TouchableWithoutFeedback>
        <Animated.View
          style={{
            width: 320,
            height: "100%",
            backgroundColor: currentTheme.colors.surface,
            transform: [{ translateX: drawerSlideAnim }],
            paddingTop: 60,
            elevation: 16,
            shadowColor: "#000",
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
          }}
        >
          {/* Menu Header */}
          <View
            style={{
              paddingHorizontal: 24,
              paddingBottom: 24,
              borderBottomWidth: 1,
              borderBottomColor: currentTheme.colors.background,
            }}
          >
            <Image
              source={require("../assets/images/aa-app-switcher-icon.png")}
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                marginBottom: 16,
              }}
              resizeMode="contain"
            />
            <Text style={{ ...currentTypography.cardTitle, fontSize: 20 }}>
              AA App Switcher
            </Text>
          </View>

          {/* Menu Items */}
          <ScrollView style={{ flex: 1 }}>
            <View style={{ paddingVertical: 16 }}>
              <TouchableOpacity
                style={{ paddingVertical: 16, paddingHorizontal: 24 }}
                onPress={() => navigateTo("", "SETTINGS")}
              >
                <Text style={{ ...currentTypography.label, fontSize: 16 }}>
                  Settings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingVertical: 16, paddingHorizontal: 24 }}
                onPress={() => navigateTo("", "ABOUT")}
              >
                <Text style={{ ...currentTypography.label, fontSize: 16 }}>
                  About
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingVertical: 16, paddingHorizontal: 24 }}
                onPress={() => navigateTo("", "PRIVACY")}
              >
                <Text style={{ ...currentTypography.label, fontSize: 16 }}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderOnboardingModal = () => {
    return (
      <Modal
        visible={showOnboarding}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelOnboarding}
      >
        <View style={styles.onboardingBackdrop}>
          <View
            style={[
              styles.onboardingSheet,
              { backgroundColor: currentTheme.colors.surface },
            ]}
          >
            <View style={styles.onboardingContent}>
              <Text
                style={[
                  styles.onboardingTitle,
                  { color: currentTheme.colors.textPrimary },
                ]}
              >
                {onboardingStep === 1
                  ? "Step 1/2: Overlay Permission"
                  : "Step 2/2: Usage Access"}
              </Text>

              <Text
                style={[
                  styles.onboardingDescription,
                  { color: currentTheme.colors.textSecondary },
                ]}
              >
                {onboardingStep === 1
                  ? "Quick App Switcher needs this permission to display its floating app switcher interface over other apps. This allows you to quickly switch between apps from anywhere."
                  : "Quick App Switcher uses Usage Access to determine which app is currently open. This information is needed to build your recent apps list and enable fast switching."}
              </Text>

              <View style={styles.onboardingButtonGroup}>
                <TouchableOpacity
                  style={[
                    styles.onboardingButton,
                    styles.onboardingButtonSecondary,
                  ]}
                  onPress={handleCancelOnboarding}
                >
                  <Text
                    style={[
                      styles.onboardingButtonText,
                      { color: currentTheme.colors.textPrimary },
                    ]}
                  >
                    CANCEL
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.onboardingButton,
                    styles.onboardingButtonPrimary,
                    { backgroundColor: currentTheme.colors.accent },
                  ]}
                  onPress={
                    onboardingStep === 1
                      ? requestPermission
                      : requestUsageAccess
                  }
                >
                  <Text style={styles.onboardingButtonPrimaryText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ThemeContext.Provider
      value={{ isDarkMode, theme: currentTheme, typography: currentTypography }}
    >
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: currentTheme.colors.background },
        ]}
      >
        {activeScreen === "SETTINGS"
          ? renderSettingsScreen()
          : activeScreen === "ABOUT"
            ? renderAboutScreen()
            : activeScreen === "PRIVACY"
              ? renderPrivacyScreen()
              : renderSettings()}
        {renderAppPickerModal()}
        {renderColorPickerModal()}
        {renderDrawerModal()}
        {renderOnboardingModal()}
        {toastMessage && (
          <Animated.View
            style={[
              styles.toastContainer,
              {
                opacity: toastOpacity,
                transform: [{ translateY: toastSlideY }],
                backgroundColor: isDarkMode ? "#333333" : "#333333",
              },
            ]}
          >
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        )}
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Theme.spacing.lg,
  },
  title: {
    ...Theme.typography.screenTitle,
    textAlign: "center",
  },
  description: {
    ...Theme.typography.description,
    textAlign: "center",
    marginBottom: Theme.spacing.xl,
  },
  buttonPrimary: {
    backgroundColor: Theme.colors.accent,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.radius.medium,
    width: "100%",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  buttonText: {
    color: Theme.colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  previewSection: {
    alignItems: "center",
    marginBottom: Theme.spacing.xl,
    paddingVertical: Theme.spacing.lg,
  },
  previewContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  previewAppBox: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.medium,
    alignItems: "center",
    justifyContent: "center",
    ...Theme.shadow.card,
  },
  previewAppIcon: {
    borderRadius: Theme.radius.small,
  },
  previewAppIconPlaceholder: {
    backgroundColor: Theme.colors.border,
    borderRadius: Theme.radius.small,
  },
  previewMinusButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...Theme.shadow.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    elevation: 3,
  },
  previewMinusText: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: -2, // Optical alignment
  },
  previewAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...Theme.shadow.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderStyle: "dashed",
  },
  previewAddText: {
    color: Theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "300",
    marginTop: -2,
  },
  previewFooterText: {
    ...Theme.typography.smallLabel,
    color: Theme.colors.textSecondary,
    textAlign: "center",
  },
  appRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.large,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    ...Theme.shadow.card,
  },
  appRowIconContainer: {
    marginRight: Theme.spacing.md,
  },
  appRowIcon: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.small,
  },
  appRowIconPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: Theme.colors.border,
    borderRadius: Theme.radius.small,
  },
  appRowInfo: {
    flex: 1,
  },
  appRowName: {
    ...Theme.typography.label,
  },
  appRowActions: {
    flexDirection: "row",
  },
  appRowButton: {
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.small,
  },
  appRowButtonText: {
    ...Theme.typography.smallLabel,
    color: Theme.colors.textPrimary,
    fontWeight: "600",
  },
  fabContainer: {
    alignItems: "center",
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.xxl,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...Theme.shadow.card,
    elevation: 4,
  },
  fabText: {
    color: Theme.colors.surface,
    fontSize: 28,
    fontWeight: "300",
    marginTop: -2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    ...Theme.typography.cardTitle,
  },
  closeText: {
    color: Theme.colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  searchContainer: {
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.medium,
    paddingHorizontal: Theme.spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: Theme.colors.textPrimary,
  },
  clearSearchButton: {
    padding: Theme.spacing.xs,
  },
  clearSearchText: {
    fontSize: 20,
    color: Theme.colors.textTertiary,
  },
  emptyContainer: {
    padding: Theme.spacing.xxl,
    alignItems: "center",
  },
  emptyText: {
    ...Theme.typography.description,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  pickerIcon: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.small,
    marginRight: Theme.spacing.md,
  },
  pickerIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.small,
    backgroundColor: Theme.colors.border,
    marginRight: Theme.spacing.md,
  },
  pickerAppName: {
    ...Theme.typography.label,
  },
  onboardingBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  onboardingSheet: {
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    ...Theme.shadow.card,
    elevation: 24,
  },
  onboardingContent: {
    alignItems: "flex-start",
  },
  onboardingTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  onboardingDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  onboardingButtonGroup: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    gap: 12,
  },
  onboardingButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  onboardingButtonSecondary: {
    backgroundColor: "transparent",
  },
  onboardingButtonPrimary: {
    backgroundColor: Theme.colors.accent,
  },
  onboardingButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  onboardingButtonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  toastContainer: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#323232",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 9999,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
