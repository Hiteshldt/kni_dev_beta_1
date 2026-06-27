import * as ImagePicker from 'expo-image-picker';
import { Api } from './api';

// Pick from gallery or camera, then upload to the API. Returns the stored path
// ("/uploads/..") or null if cancelled / permission denied.
export async function pickAndUpload(fromCamera: boolean): Promise<string | null> {
  const perm = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const opts: ImagePicker.ImagePickerOptions = {
    quality: 0.6,
    allowsEditing: true,
    aspect: [4, 3],
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  };
  const res = fromCamera
    ? await ImagePicker.launchCameraAsync(opts)
    : await ImagePicker.launchImageLibraryAsync(opts);

  if (res.canceled || !res.assets?.length) return null;
  const { path } = await Api.upload(res.assets[0].uri);
  return path;
}
