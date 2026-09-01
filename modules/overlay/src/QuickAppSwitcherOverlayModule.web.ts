import { registerWebModule, NativeModule } from 'expo';

// QuickAppSwitcherOverlayModule is not available on the web platform.
class QuickAppSwitcherOverlayModule extends NativeModule<{}> {}

export default registerWebModule(QuickAppSwitcherOverlayModule, 'QuickAppSwitcherOverlayModule');
