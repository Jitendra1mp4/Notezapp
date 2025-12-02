import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

/**
 * Compress and resize image
 */
export const compressImage = async (
  uri: string,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<string> => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.error('Error compressing image:', error);
    return uri;
  }
};

/**
 * Convert image URI to base64
 */
export const imageUriToBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting web image to base64:', error);
      throw error;
    }
  } else {
    // For mobile (iOS/Android) - use modern File API
    try {
      const file = new FileSystem.File(uri);
      const base64String = await file.text();
      
      // If text() doesn't work, try to read the file and convert
      if (!base64String) {
        // Fallback: read raw data and convert to base64
        const fileContent = await fetch(uri).then(r => r.blob());
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] || result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(fileContent);
        });
      }
      
      return base64String;
    } catch (error) {
      console.error('Error converting mobile image to base64:', error);
      
      // Ultimate fallback: fetch and convert as blob
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] || result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (fallbackError) {
        console.error('All base64 conversion methods failed:', fallbackError);
        throw fallbackError;
      }
    }
  }
};

/**
 * Convert base64 to data URI for display
 */
export const base64ToDataUri = (base64: string): string => {
  return `data:image/jpeg;base64,${base64}`;
};

/**
 * Create thumbnail
 */
export const createThumbnail = async (
  uri: string,
  size: number = 200
): Promise<string> => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: size, height: size } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    return uri;
  }
};
