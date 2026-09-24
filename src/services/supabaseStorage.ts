import { supabase, PHOTO_BUCKET_NAME, isSupabaseConfigured } from '../lib/supabase';

export interface UploadPhotoParams {
  file: File | Blob | string; // File, Blob, or base64 data URL
  fileName?: string;
  technicianId?: string;
  accountNumber?: string;
  equipmentSerial?: string;
  photoType?:
    | 'INSTALLATION'
    | 'BARCODE_SCAN'
    | 'METER_READING'
    | 'DAMAGE_REPORT'
    | 'INSTALLATION_PHOTO'
    | 'BARCODE_TAG'
    | 'NAP_PORT'
    | 'ONT_STATUS'
    | string;
}

export interface UploadPhotoResult {
  success: boolean;
  publicUrl: string;
  filePath: string;
  error?: string;
}

/**
 * Upload an installation or verification photo to Supabase 'potobucket'
 */
export async function uploadPhotoToPotobucket(
  params: UploadPhotoParams
): Promise<UploadPhotoResult> {
  const { file, fileName, technicianId, accountNumber, equipmentSerial, photoType = 'INSTALLATION' } = params;

  const timestamp = Date.now();
  const safeAcc = (accountNumber || 'unlinked').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeTech = (technicianId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = fileName ? fileName.replace(/[^a-zA-Z0-9_.-]/g, '_') : `photo_${timestamp}.jpg`;
  const filePath = `technicians/${safeTech}/${safeAcc}/${photoType.toLowerCase()}_${timestamp}_${safeName}`;

  // If Supabase is not configured, fallback gracefully by converting to Data URL for local presentation
  if (!isSupabaseConfigured()) {
    if (typeof file === 'string') {
      return {
        success: true,
        publicUrl: file,
        filePath,
      };
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      return {
        success: true,
        publicUrl: dataUrl,
        filePath,
      };
    } catch {
      return {
        success: false,
        publicUrl: '',
        filePath: '',
        error: 'Failed to process photo locally',
      };
    }
  }

  try {
    let fileBody: Blob | File;
    let contentType = 'image/jpeg';

    if (typeof file === 'string') {
      // Base64 data URL
      const response = await fetch(file);
      fileBody = await response.blob();
      contentType = fileBody.type || 'image/jpeg';
    } else {
      fileBody = file;
      contentType = file.type || 'image/jpeg';
    }

    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET_NAME)
      .upload(filePath, fileBody, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('Supabase storage upload error:', error.message);
      // Graceful fallback to data url so the user flow is not interrupted
      if (typeof file === 'string') {
        return { success: true, publicUrl: file, filePath };
      }
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      return { success: true, publicUrl: dataUrl, filePath, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(PHOTO_BUCKET_NAME)
      .getPublicUrl(data.path);

    // Record in public.installation_photos metadata table if available
    try {
      await supabase.from('installation_photos').insert([
        {
          bucket_id: PHOTO_BUCKET_NAME,
          file_path: data.path,
          file_name: safeName,
          mime_type: contentType,
          public_url: publicUrlData.publicUrl,
          technician_id: technicianId,
          account_number: accountNumber,
          equipment_serial: equipmentSerial,
          photo_type: photoType,
        },
      ]);
    } catch (tblErr) {
      console.warn('Failed to insert metadata into installation_photos table:', tblErr);
    }

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      filePath: data.path,
    };
  } catch (err: any) {
    console.error('Unexpected error uploading to potobucket:', err);
    return {
      success: false,
      publicUrl: '',
      filePath: '',
      error: err?.message || 'Upload failed',
    };
  }
}

/**
 * Delete a photo from potobucket
 */
export async function deletePhotoFromPotobucket(filePath: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !filePath) return false;
  try {
    const { error } = await supabase.storage.from(PHOTO_BUCKET_NAME).remove([filePath]);
    if (error) {
      console.warn('Failed to delete from potobucket:', error);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * List photos stored in potobucket
 */
export async function listPotobucketPhotos(folder = 'technicians') {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET_NAME).list(folder, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Failed to list potobucket:', err);
    return [];
  }
}
