import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Returns the paddingBottom needed so scroll content clears the floating tab bar.
//
// Android: tab bar sits at bottom:(14 + insets.bottom) to avoid nav buttons,
//          so content needs 72 + 14 + insets.bottom.
//
// iOS: tab bar sits at bottom:14. ScrollView adds insets.bottom automatically
//      via contentInsetAdjustmentBehavior="automatic", so we subtract it to
//      avoid double-counting (e.g. iPhone X: 86 - 34 = 52px).
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'android') {
    return 72 + 14 + insets.bottom;
  }
  return Math.max(72 + 14 - insets.bottom, 20);
}
