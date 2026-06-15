import { createNavigationContainerRef } from '@react-navigation/native';
import { MainStackParamList } from './MainNavigator';

export const navigationRef = createNavigationContainerRef<MainStackParamList>();

export function navigate(name: keyof MainStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params);
  }
}
