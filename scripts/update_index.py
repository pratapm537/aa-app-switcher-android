
import os
path = r"e:\Quick-App-Switcher\app\index.tsx"
content = """import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, AppState, StyleSheet, Alert, ActivityIndicator, ScrollView, Modal, FlatList, Image, TextInput, Switch, SafeAreaView } from 'react-native';
import QuickAppSwitcherOverlayModule from '../modules/overlay/src/QuickAppSwitcherOverlayModule';
import { Theme } from '../theme/theme';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SettingsCard } from '../components/ui/SettingsCard';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { OpacitySlider } from '../components/ui/OpacitySlider';

type OnboardingState = 'CHECKING' | 'ONBOARDING_OVERLAY' | 'ONBOARDING_USAGE' | 'READY' | 'ERROR';
type ScreenState = 'SETTINGS' | 'APPEARANCE' | 'APPS';

export default function HomeScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [hasUsageAccess, setHasUsageAccess] = useState(false);
  const [homeBehavior, setHomeBehavior] = useState('hide');
  const [iconSize, setIconSize] = useState<"small" | "medium" | "large">('small');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.85);
  const [iconSpacing, setIconSpacing] = useState<number>(8);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<{packageName: string, label: string, icon: string}[]>([]);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [onboardingState, setOnboardingState] = useState<OnboardingState>('CHECKING');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [activeScreen, setActiveScreen] = useState<ScreenState>('SETTINGS');
  const [isOverlayRunning, setIsOverlayRunning] = useState(false);

  const checkPermissions = () => {
    try {
      const perm = QuickAppSwitcherOverlayModule.checkOverlayPermission();
      setHasPermission(perm);
      
      let usagePerm = false;
      if (typeof QuickAppSwitcherOverlayModule.hasUsageAccess === 'function') {
        usagePerm = QuickAppSwitcherOverlayModule.hasUsageAccess();
        setHasUsageAccess(usagePerm);
      }

      if (!perm) {
        setOnboardingState('ONBOARDING_OVERLAY');
      } else if (!usagePerm) {
        setOnboardingState('ONBOARDING_USAGE');
      } else {
        setOnboardingState('READY');
      }
    } catch (error: any) {
      console.error("Error checking permissions:", error);
      setErrorMessage(error?.message || "Unknown error");
      setOnboardingState('ERROR');
    }
  };

  const loadPreferences = () => {
    let behavior: "hide" | "show" = 'hide';
    if (typeof QuickAppSwitcherOverlayModule.getHomeScreenBehavior === 'function') {
      behavior = QuickAppSwitcherOverlayModule.getHomeScreenBehavior();
    }
    setHomeBehavior(behavior);

    let loadedIconSize: "small" | "medium" | "large" = 'small';
    if (typeof QuickAppSwitcherOverlayModule.getIconSize === 'function') {
      loadedIconSize = QuickAppSwitcherOverlayModule.getIconSize();
    }
    setIconSize(loadedIconSize);

    let loadedOpacity = 0.85;
    if (typeof QuickAppSwitcherOverlayModule.getOverlayOpacity === 'function') {
      loadedOpacity = QuickAppSwitcherOverlayModule.getOverlayOpacity();
    }
    setOverlayOpacity(loadedOpacity);

    let loadedSpacing = 8;
    if (typeof QuickAppSwitcherOverlayModule.getIconSpacing === 'function') {
      loadedSpacing = QuickAppSwitcherOverlayModule.getIconSpacing();
    }
    setIconSpacing(loadedSpacing);

    if (typeof QuickAppSwitcherOverlayModule.getSelectedApp === 'function') {
      const apps = [];
      for (let i = 1; i <= 5; i++) {
        const pkg = QuickAppSwitcherOverlayModule.getSelectedApp(i);
        if (pkg) {
          apps.push(pkg);
        }
      }
      setSelectedApps(apps);
    }

    if (typeof QuickAppSwitcherOverlayModule.getInstalledApps === 'function') {
      setInstalledApps(QuickAppSwitcherOverlayModule.getInstalledApps());
    }
  };

  useEffect(() => {
    checkPermissions();
    loadPreferences();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });
    return () => subscription.remove();
  }, []);

  const requestPermission = () => {
    QuickAppSwitcherOverlayModule.requestOverlayPermission();
  };

  const requestUsageAccess = () => {
    if (typeof QuickAppSwitcherOverlayModule.requestUsageAccess === 'function') {
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
    if (value) startOverlay();
    else stopOverlay();
  };

  const handleBehaviorChange = (behavior: 'hide' | 'show') => {
    setHomeBehavior(behavior);
    if (typeof QuickAppSwitcherOverlayModule.setHomeScreenBehavior === 'function') {
      QuickAppSwitcherOverlayModule.setHomeScreenBehavior(behavior);
    }
  };

  const handleIconSizeChange = (size: 'small' | 'medium' | 'large') => {
    setIconSize(size);
    if (typeof QuickAppSwitcherOverlayModule.setIconSize === 'function') {
      QuickAppSwitcherOverlayModule.setIconSize(size);
    }
  };

  const handleOpacityChange = (value: number) => {
    setOverlayOpacity(value);
    if (typeof QuickAppSwitcherOverlayModule.setOverlayOpacity === 'function') {
      QuickAppSwitcherOverlayModule.setOverlayOpacity(value);
    }
  };

  const handleIconSpacingChange = (spacing: number) => {
    setIconSpacing(spacing);
    if (typeof QuickAppSwitcherOverlayModule.setIconSpacing === 'function') {
      QuickAppSwitcherOverlayModule.setIconSpacing(spacing);
    }
  };

  const handleAppSelected = (packageName: string) => {
    if (editingSlot !== null) {
      if (editingSlot > selectedApps.length) {
        const newApps = [...selectedApps, packageName];
        QuickAppSwitcherOverlayModule.saveSelectedApps(newApps);
        setSelectedApps(newApps);
      } else {
        QuickAppSwitcherOverlayModule.setSelectedApp(editingSlot, packageName);
        const newApps = [...selectedApps];
        newApps[editingSlot - 1] = packageName;
        setSelectedApps(newApps);
      }
    }
    setIsPickerVisible(false);
    setEditingSlot(null);
  };

  const handleRemoveApp = (index: number) => {
    if (selectedApps.length <= 1) return;
    const newApps = [...selectedApps];
    newApps.splice(index, 1);
    QuickAppSwitcherOverlayModule.saveSelectedApps(newApps);
    setSelectedApps(newApps);
  };

  const getAppName = (packageName: string) => {
    const app = installedApps.find(a => a.packageName === packageName);
    return app ? app.label : packageName;
  };

  const getAppIcon = (packageName: string) => {
    const app = installedApps.find(a => a.packageName === packageName);
    return app?.icon ? `data:image/png;base64,${app.icon}` : null;
  };

  if (onboardingState === 'ERROR') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.description}>Failed to verify permissions: {errorMessage}</Text>
        <TouchableOpacity onPress={checkPermissions} style={styles.buttonPrimary}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (onboardingState === 'CHECKING') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Theme.colors.accent} />
      </View>
    );
  }

  if (onboardingState === 'ONBOARDING_OVERLAY') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Overlay Permission</Text>
        <Text style={styles.description}>
          AA App Switcher needs permission to display the floating app switcher over other apps.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.buttonPrimary}>
          <Text style={styles.buttonText}>Allow Overlay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (onboardingState === 'ONBOARDING_USAGE') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Usage Access</Text>
        <Text style={styles.description}>
          AA App Switcher uses Usage Access to know which app is currently open.
        </Text>
        <TouchableOpacity onPress={requestUsageAccess} style={styles.buttonPrimary}>
          <Text style={styles.buttonText}>Allow Usage Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderSettings = () => (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <ScreenHeader title="Settings" />
      
      <SettingsCard 
        title="App Switcher" 
        description="STATUS"
        rightElement={
          <Switch 
            value={isOverlayRunning}
            onValueChange={toggleOverlay}
            trackColor={{ false: Theme.colors.border, true: Theme.colors.accent }}
            thumbColor="#fff"
          />
        }
      />

      <SettingsCard 
        title="Appearance" 
        description="Customize icons, size, and spacing"
        icon={<Text style={{ fontSize: 20 }}>🎨</Text>}
        rightElement={<Text style={{ color: Theme.colors.textTertiary, fontSize: 20 }}>›</Text>}
        onPress={() => setActiveScreen('APPEARANCE')}
      />

      <SettingsCard 
        title="Apps" 
        description="Configure active applications"
        icon={<Text style={{ fontSize: 20 }}>grid</Text>}
        rightElement={<Text style={{ color: Theme.colors.textTertiary, fontSize: 20 }}>›</Text>}
        onPress={() => setActiveScreen('APPS')}
      />

      <SettingsCard 
        title="Activation" 
        description="Set edge swipe area"
        icon={<Text style={{ fontSize: 20 }}>👆</Text>}
        rightElement={<Text style={{ color: Theme.colors.textTertiary, fontSize: 20 }}>›</Text>}
        onPress={() => {}}
      />
    </ScrollView>
  );

  const renderAppearance = () => (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <ScreenHeader title="Appearance" onBack={() => setActiveScreen('SETTINGS')} />
      
      {/* Icon Preview Area */}
      <View style={styles.previewContainer}>
        {selectedApps.slice(0, 4).map((pkg, idx) => {
          const iconUri = getAppIcon(pkg);
          return (
            <View key={idx} style={styles.previewAppBox}>
              {iconUri ? (
                <Image source={{ uri: iconUri }} style={styles.previewAppIcon} />
              ) : (
                <View style={styles.previewAppIconPlaceholder} />
              )}
            </View>
          );
        })}
      </View>

      <SettingsCard title="Icon Size" description="Scale of the switcher icons" icon={<Text>📏</Text>}>
        <SegmentedControl 
          options={[
            { label: 'SMALL', value: 'small' },
            { label: 'MEDIUM', value: 'medium' },
            { label: 'LARGE', value: 'large' }
          ]}
          selectedValue={iconSize}
          onValueChange={handleIconSizeChange}
        />
      </SettingsCard>

      <SettingsCard 
        title="Opacity" 
        description="Overlay transparency level" 
        icon={<Text>💧</Text>}
        rightElement={<Text style={{ color: Theme.colors.accent, fontWeight: 'bold' }}>{Math.round(overlayOpacity * 100)}%</Text>}
      >
        <OpacitySlider value={overlayOpacity} onValueChange={handleOpacityChange} />
      </SettingsCard>

      <SettingsCard title="Spacing" description="Distance between icons" icon={<Text>↔️</Text>}>
        <SegmentedControl 
          options={[
            { label: 'TIGHT', value: 4 },
            { label: 'DEFAULT', value: 8 },
            { label: 'LOOSE', value: 16 }
          ]}
          selectedValue={iconSpacing}
          onValueChange={handleIconSpacingChange}
        />
      </SettingsCard>
    </ScrollView>
  );

  const renderApps = () => (
    <View style={styles.scrollContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScreenHeader title="Apps" onBack={() => setActiveScreen('SETTINGS')} />
        
        {selectedApps.map((pkg, index) => (
          <View key={`app-${index}`} style={styles.appRowCard}>
            <View style={styles.appRowIconContainer}>
              {getAppIcon(pkg) ? (
                <Image source={{ uri: getAppIcon(pkg)! }} style={styles.appRowIcon} />
              ) : (
                <View style={styles.appRowIconPlaceholder} />
              )}
            </View>
            <View style={styles.appRowInfo}>
              <Text style={styles.appRowName} numberOfLines={1}>{getAppName(pkg)}</Text>
            </View>
            <View style={styles.appRowActions}>
              <TouchableOpacity onPress={() => { setEditingSlot(index + 1); setIsPickerVisible(true); }} style={styles.appRowButton}>
                <Text style={styles.appRowButtonText}>Change</Text>
              </TouchableOpacity>
              {selectedApps.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveApp(index)} style={[styles.appRowButton, { marginLeft: 8 }]}>
                  <Text style={[styles.appRowButtonText, { color: Theme.colors.textSecondary }]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {selectedApps.length < 5 && (
          <TouchableOpacity 
            style={styles.fabContainer} 
            onPress={() => { setEditingSlot(selectedApps.length + 1); setIsPickerVisible(true); }}
            activeOpacity={0.8}
          >
            <View style={styles.fab}>
              <Text style={styles.fabText}>+</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* App Picker Modal */}
      <Modal visible={isPickerVisible} animationType="slide" onRequestClose={() => { setIsPickerVisible(false); setSearchQuery(''); }}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select App</Text>
            <TouchableOpacity onPress={() => { setIsPickerVisible(false); setSearchQuery(''); }}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search apps..."
                placeholderTextColor={Theme.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                  <Text style={styles.clearSearchText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={installedApps.filter(app => {
              if (selectedApps.includes(app.packageName)) return false;
              const trimmedQuery = searchQuery.trim();
              if (trimmedQuery.length === 0) return true;
              return app.label.toLowerCase().includes(trimmedQuery.toLowerCase());
            })}
            keyExtractor={item => item.packageName}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No apps found</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerRow} onPress={() => { handleAppSelected(item.packageName); setSearchQuery(''); }}>
                {item.icon ? (
                  <Image source={{ uri: `data:image/png;base64,${item.icon}` }} style={styles.pickerIcon} />
                ) : (
                  <View style={styles.pickerIconPlaceholder} />
                )}
                <Text style={styles.pickerAppName}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {activeScreen === 'SETTINGS' && renderSettings()}
      {activeScreen === 'APPEARANCE' && renderAppearance()}
      {activeScreen === 'APPS' && renderApps()}
    </SafeAreaView>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
  },
  title: {
    ...Theme.typography.screenTitle,
    textAlign: 'center',
  },
  description: {
    ...Theme.typography.description,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  buttonPrimary: {
    backgroundColor: Theme.colors.accent,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.radius.medium,
    width: '100%',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  buttonText: {
    color: Theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  // Appearance Preview
  previewContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
    paddingVertical: Theme.spacing.lg,
  },
  previewAppBox: {
    width: 60,
    height: 60,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.medium,
    marginHorizontal: Theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.card,
  },
  previewAppIcon: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.small,
  },
  previewAppIconPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: Theme.colors.border,
    borderRadius: Theme.radius.small,
  },
  // App Row Cards
  appRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
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
    fontWeight: '600',
  },
  fabContainer: {
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.xxl,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.card,
    elevation: 4,
  },
  fabText: {
    color: Theme.colors.surface,
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  // Modal & Search
  modalContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: '600',
  },
  searchContainer: {
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
  },
  emptyText: {
    ...Theme.typography.description,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  }
});
"""
with open(path, "w", encoding="utf-8") as file:
    file.write(content)
