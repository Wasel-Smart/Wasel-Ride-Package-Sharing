declare module 'expo-image-picker' {
  export function requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean }>;
  export function launchImageLibraryAsync(options: {
    mediaTypes: string[];
    allowsEditing: boolean;
    aspect?: [number, number];
    quality?: number;
    base64?: boolean;
  }): Promise<{ canceled: boolean; assets?: Array<{ uri?: string }> }>;
}
