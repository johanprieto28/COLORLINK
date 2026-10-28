import { supabase, isSupabaseConfigured } from '../supabase/client';

export interface StorageUploadResult {
  url: string;
  storage_path: string;
  nombre_archivo: string;
  tamano_bytes: number;
  mime_type: string;
  is_remote: boolean;
}

/**
 * Uploads project evidence photo to Supabase Storage bucket 'evidencias'.
 * Saves file in storage and returns public URL and metadata.
 * In case Supabase storage is unavailable or pending bucket creation,
 * provides a resilient base64/objectUrl fallback so user experience is not blocked.
 */
export async function uploadEvidenceFile(
  file: File,
  projectId: string
): Promise<StorageUploadResult> {
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `proyectos/${projectId || 'temp'}/${timestamp}_${cleanName}`;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.storage
        .from('evidencias')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('evidencias')
          .getPublicUrl(data.path);

        return {
          url: publicUrlData.publicUrl,
          storage_path: data.path,
          nombre_archivo: file.name,
          tamano_bytes: file.size,
          mime_type: file.type || 'image/jpeg',
          is_remote: true,
        };
      }
    } catch (err) {
      console.warn('Supabase storage upload error, falling back to local object reader:', err);
    }
  }

  // Resilient fallback for demonstration / offline setup
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        url: reader.result as string,
        storage_path: `local_fallback/${filePath}`,
        nombre_archivo: file.name,
        tamano_bytes: file.size,
        mime_type: file.type || 'image/jpeg',
        is_remote: false,
      });
    };
    reader.readAsDataURL(file);
  });
}
