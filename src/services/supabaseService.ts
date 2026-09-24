import { supabase, isSupabaseConfigured, PHOTO_BUCKET_NAME } from '../lib/supabase';
import { InventoryItem, Technician, AuditLog, UserProfile } from '../types';

export interface SupabaseHealthCheck {
  isConfigured: boolean;
  canConnect: boolean;
  bucketExists: boolean;
  message: string;
}

/**
 * Test connectivity to Supabase and verify potobucket presence
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthCheck> {
  if (!isSupabaseConfigured()) {
    return {
      isConfigured: false,
      canConnect: false,
      bucketExists: false,
      message: 'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set.',
    };
  }

  try {
    // 1. Test database query
    const { error: dbError } = await supabase.from('inventory_items').select('id').limit(1);

    // 2. Test storage bucket access
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    const hasPotobucket = Boolean(buckets?.some((b) => b.name === PHOTO_BUCKET_NAME || b.id === PHOTO_BUCKET_NAME));

    if (dbError && !bucketError) {
      return {
        isConfigured: true,
        canConnect: true,
        bucketExists: hasPotobucket,
        message: `Connected to Supabase, but table check returned: ${dbError.message}. Run supabase/schema.sql in the SQL Editor.`,
      };
    }

    return {
      isConfigured: true,
      canConnect: true,
      bucketExists: hasPotobucket,
      message: hasPotobucket
        ? `Successfully connected to Supabase and verified '${PHOTO_BUCKET_NAME}' bucket.`
        : `Connected to Supabase, but '${PHOTO_BUCKET_NAME}' was not found. Please run supabase/schema.sql.`,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      canConnect: false,
      bucketExists: false,
      message: `Connection test failed: ${err?.message || 'Network error'}`,
    };
  }
}

/**
 * Sync an inventory item to Supabase PostgreSQL table
 */
export async function syncInventoryItemToSupabase(item: InventoryItem): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const row = {
      id: item.id,
      name: item.name,
      serial_number: item.serialNumber,
      barcode: item.serialNumber,
      category: item.category,
      brand: item.brand || 'FiberX',
      model: item.modelName || item.sku || 'Standard Hardware',
      quantity: item.quantity || 1,
      unit: item.unit || 'pcs',
      condition: 'GOOD',
      status: item.status || 'IN_STOCK',
      current_location: item.storageBin || 'Main Warehouse Hub',
      assigned_technician_id: item.assignedTechnicianId || null,
      assigned_technician_name: item.assignedTechnicianName || null,
      assigned_at: item.assignedAt || null,
      assigned_by_user_id: item.assignedByUserId || null,
      assigned_by_user_name: item.assignedByUserName || null,
      slot_label: item.slotNumber || null,
      paired_parent_id: item.pairedItemId || null,
      is_slot_tied: Boolean(item.slotNumber),
      customer_account_number: item.customerAccountNumber || null,
      customer_name: item.customerName || null,
      customer_address: item.customerAddress || null,
      optical_rx: item.opticalRx || null,
      installation_date: item.installationDate || null,
      submitted_by_technician_id: item.submittedByTechnicianId || null,
      submitted_by_technician_name: item.submittedByTechnicianName || null,
      submitted_at: item.submittedAt || null,
      verification_status: item.verificationStatus || item.adminVerificationStatus || 'UNLINKED_READY',
      verified_by_admin_name: item.verifiedByAdminName || null,
      verified_at: item.verifiedAt || null,
      rejection_notes: item.adminRejectionReason || null,
      photo_url: item.photoUrl || item.photoProofUrl || null,
      photo_storage_path: item.photoStoragePath || null,
      is_return_pending: item.isReturnPending || false,
      return_reason: item.returnReason || null,
      notes: item.notes || null,
    };

    const { error } = await supabase.from('inventory_items').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase inventory sync failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Unexpected error in syncInventoryItemToSupabase:', err);
    return false;
  }
}

/**
 * Sync a technician record to Supabase
 */
export async function syncTechnicianToSupabase(tech: Technician): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const row = {
      id: tech.id,
      name: tech.name,
      employee_id: tech.employeeId,
      phone: tech.phone || null,
      assigned_van: tech.assignedVan || null,
      area: tech.area || null,
      is_flagged: tech.isFlagged || false,
      flag_reason: tech.flagReason || null,
      contact_person: tech.contactPerson || null,
      hub_address: tech.hubAddress || null,
      active_job_count: tech.activeJobCount || 0,
      completed_count: tech.completedCount || 0,
      avatar_url: tech.avatarUrl || null,
    };

    const { error } = await supabase.from('technicians').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase technician sync failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Unexpected error in syncTechnicianToSupabase:', err);
    return false;
  }
}

/**
 * Record an audit log entry in Supabase
 */
export async function recordAuditLogInSupabase(log: AuditLog): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const row = {
      id: log.id,
      action: log.action,
      details: log.details,
      item_id: log.itemId || null,
      item_name: log.itemSku || null,
      serial_number: log.itemSerial || null,
      user_id: log.technicianId || null,
      user_name: log.performedBy,
      user_role: log.role || 'ADMIN',
      timestamp: log.timestamp,
      metadata: {},
    };

    const { error } = await supabase.from('audit_logs').insert([row]);
    if (error) {
      console.warn('Supabase audit log insert failed:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch inventory items from Supabase
 */
export async function fetchInventoryFromSupabase(): Promise<InventoryItem[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;

    return data.map((row: any): InventoryItem => ({
      id: row.id,
      name: row.name || 'Hardware Asset',
      serialNumber: row.serial_number,
      sku: row.model || row.name || 'FX-HW',
      description: row.name || '',
      category: row.category || 'MODEM_ONT',
      brand: row.brand || 'FiberX',
      modelName: row.model || 'Standard ONT',
      quantity: row.quantity || 1,
      unit: row.unit || 'pcs',
      bypassBarcode: false,
      lifecycleStatus: row.assigned_technician_id ? 'ASSIGNED_RESERVED' : 'IN_STOCK',
      verificationStatus: row.verification_status || 'UNLINKED_READY',
      status: row.status || 'IN_STOCK',
      storageBin: row.current_location || 'Rack A-01',
      assignedTechnicianId: row.assigned_technician_id,
      assignedTechnicianName: row.assigned_technician_name,
      assignedAt: row.assigned_at,
      assignedByUserId: row.assigned_by_user_id,
      assignedByUserName: row.assigned_by_user_name,
      slotNumber: row.slot_label,
      pairedItemId: row.paired_parent_id,
      customerAccountNumber: row.customer_account_number,
      customerName: row.customer_name,
      customerAddress: row.customer_address,
      opticalRx: row.optical_rx,
      installationDate: row.installation_date,
      submittedByTechnicianId: row.submitted_by_technician_id,
      submittedByTechnicianName: row.submitted_by_technician_name,
      submittedAt: row.submitted_at,
      adminVerificationStatus: row.verification_status,
      verifiedByAdminName: row.verified_by_admin_name,
      verifiedAt: row.verified_at,
      adminRejectionReason: row.rejection_notes,
      photoUrl: row.photo_url,
      photoProofUrl: row.photo_url,
      photoStoragePath: row.photo_storage_path,
      isReturnPending: row.is_return_pending,
      returnReason: row.return_reason,
      notes: row.notes,
      receivedDate: row.created_at || new Date().toISOString(),
      receivedBy: 'Central Receiving',
      archived: false,
    }));
  } catch {
    return null;
  }
}

/**
 * Fetch technicians from Supabase
 */
export async function fetchTechniciansFromSupabase(): Promise<Technician[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      employeeId: row.employee_id,
      phone: row.phone || '',
      assignedVan: row.assigned_van || '',
      area: row.area || '',
      isFlagged: row.is_flagged || false,
      flagReason: row.flag_reason,
      contactPerson: row.contact_person,
      hubAddress: row.hub_address,
      activeJobCount: row.active_job_count || 0,
      completedCount: row.completed_count || 0,
      avatarUrl: row.avatar_url,
    }));
  } catch {
    return null;
  }
}

/**
 * Register a new user in Supabase Authentication (auth.users)
 * and synchronize their profile into public.profiles
 */
export async function registerUserInSupabaseAuthAndDb(
  user: UserProfile,
  customPassword?: string
): Promise<{ success: boolean; authUserId?: string; message?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase credentials are not configured in environment.',
    };
  }

  try {
    const password =
      customPassword?.trim() ||
      (user.password && user.password.trim()) ||
      `${(user.badgeId || 'FiberX').replace(/[^a-zA-Z0-9]/g, '')}@2026!`;

    // 1. Create user in Supabase Authentication (auth.users)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email.trim(),
      password,
      options: {
        data: {
          name: user.name,
          role: user.role,
          badgeId: user.badgeId,
          department: user.department,
          phone: user.phone || '',
          assignedVan: user.assignedVan || '',
          assignedArea: user.assignedArea || '',
          technicianId: user.technicianId || '',
        },
      },
    });

    if (authError) {
      console.warn('Supabase auth.users signup notice:', authError.message);
    }

    const authId = authData?.user?.id || user.id;

    // 2. Synchronize to public.profiles table
    const profileRow = {
      id: authId,
      name: user.name,
      email: user.email.trim().toLowerCase(),
      role: user.role,
      badge_id: user.badgeId,
      department: user.department,
      phone: user.phone || null,
      status: user.status || 'ACTIVE',
      avatar_url: user.avatarUrl || null,
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileRow, { onConflict: 'email' });

    if (profileError) {
      console.warn('Supabase public.profiles upsert warning:', profileError.message);
    }

    return {
      success: true,
      authUserId: authId,
      message: authError
        ? `Profile synced to public.profiles (${authError.message})`
        : 'Registered in Supabase auth.users & public.profiles',
    };
  } catch (err: any) {
    console.warn('Unexpected error in registerUserInSupabaseAuthAndDb:', err);
    return {
      success: false,
      message: err?.message || 'Failed to register user in Supabase',
    };
  }
}

/**
 * Synchronize user profile updates to public.profiles
 */
export async function syncUserProfileToSupabase(user: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const row = {
      id: user.id,
      name: user.name,
      email: user.email.trim().toLowerCase(),
      role: user.role,
      badge_id: user.badgeId,
      department: user.department,
      phone: user.phone || null,
      status: user.status || 'ACTIVE',
      avatar_url: user.avatarUrl || null,
    };

    const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'email' });
    if (error) {
      console.warn('Supabase syncUserProfileToSupabase failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Unexpected error in syncUserProfileToSupabase:', err);
    return false;
  }
}

/**
 * Delete user from public.profiles in Supabase
 */
export async function deleteUserFromSupabase(userEmailOrId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const isEmail = userEmailOrId.includes('@');
    const query = isEmail
      ? supabase.from('profiles').delete().eq('email', userEmailOrId.trim().toLowerCase())
      : supabase.from('profiles').delete().eq('id', userEmailOrId);

    const { error } = await query;
    return !error;
  } catch {
    return false;
  }
}

