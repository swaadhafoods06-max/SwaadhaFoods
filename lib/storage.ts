import { supabase } from './supabase-admin';

export async function uploadImage(file: File, bucket: 'banners' | 'products' | 'media' = 'products'): Promise<string> {
  if (!supabase) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30);
  const path = `${Date.now()}-${safeName}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || `image/${ext}`
  });

  if (uploadError) {
    throw new Error(`Upload to '${bucket}' bucket failed: ${uploadError.message}. Make sure the bucket exists in Supabase Storage.`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
