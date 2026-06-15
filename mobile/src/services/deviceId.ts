import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_KEY = 'qtrivia_device_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    let id = await AsyncStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = generateUUID();
      await AsyncStorage.setItem(DEVICE_KEY, id);
    }
    cachedDeviceId = id;
    return id;
  } catch {
    // Fallback: generate ephemeral ID (won't persist across sessions)
    if (!cachedDeviceId) cachedDeviceId = generateUUID();
    return cachedDeviceId;
  }
}

export const currentPlatform = Platform.OS;
