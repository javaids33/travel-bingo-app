import { supabase } from './supabase';

/**
 * Uploads an image to Supabase Storage.
 * @param uri Local file URI from Camera or Picker
 * @param bucket Storage bucket name (default: 'game-photos')
 * @returns Public URL of the uploaded image
 */
export async function uploadImage(uri: string, bucket: string = 'game-photos'): Promise<string> {
    try {
        const ext = uri.substring(uri.lastIndexOf('.') + 1);
        const fileName = `${Date.now()}.${ext}`;

        // Expo requires creating a Blob or FormData
        const formData = new FormData();
        formData.append('file', {
            uri,
            name: fileName,
            type: `image/${ext}`
        } as any);

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, formData, {
                contentType: `image/${ext}`,
            });

        if (error) {
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
}
