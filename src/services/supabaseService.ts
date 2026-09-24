import { supabase, isSupabaseConfigured, PHOTO_BUCKET_NAME } from '../lib/supabase';
import { InventoryItem, Technician, AuditLog, UserProfile, ProofPhoto } from '../types';

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
 * Fetch all registered profiles from Supabase
 */
export async function fetchProfilesFromSupabase(): Promise<UserProfile[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.warn('Failed to fetch profiles from Supabase:', error?.message);
      return null;
    }

    return data.map((row: any): UserProfile => ({
      id: row.id,
      name: row.name || 'FiberX User',
      email: row.email,
      role: (row.role as any) || 'ADMIN',
      badgeId: row.badge_id || 'FX-USR',
      department: row.department || 'Operations',
      phone: row.phone || undefined,
      status: (row.status as any) || 'ACTIVE',
      avatarUrl: row.avatar_url || undefined,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.warn('Unexpected error in fetchProfilesFromSupabase:', err);
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

    return data.map((row: any): Technician => ({
      id: row.id,
      name: row.name,
      employeeId: row.employee_id,
      phone: row.phone || '',
      assignedVan: row.assigned_van || 'Van 01',
      area: row.area || 'Service Area',
      isFlagged: row.is_flagged || false,
      flagReason: row.flag_reason || undefined,
      contactPerson: row.contact_person || undefined,
      hubAddress: row.hub_address || undefined,
      activeJobCount: row.active_job_count || 0,
      completedCount: row.completed_count || 0,
      avatarUrl: row.avatar_url || undefined,
    }));
  } catch {
    return null;
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

    return data.map((row: any): InventoryItem => {
      // Check notes for serialized photo proofs or archive flags
      let extraPhotos: string[] = [];
      let cleanNotes = row.notes || '';
      let isArchived = row.status === 'ARCHIVED';

      if (cleanNotes.includes('[ARCHIVED]')) {
        isArchived = true;
        cleanNotes = cleanNotes.replace('[ARCHIVED]', '').trim();
      }

      if (cleanNotes.includes('[PHOTOS]:')) {
        try {
          const parts = cleanNotes.split('[PHOTOS]:');
          cleanNotes = parts[0].trim();
          extraPhotos = JSON.parse(parts[1]);
        } catch {
          // ignore parse error
        }
      }

      // Determine proper lifecycle status
      let lifecycleStatus: InventoryItem['lifecycleStatus'] = 'IN_STOCK';
      if (isArchived || row.status === 'DEFECTIVE') {
        lifecycleStatus = 'OUT_OF_STOCK_REMOVED';
      } else if (
        row.status === 'INSTALLED_VERIFIED' ||
        row.status === 'INSTALLED_CLOSED' ||
        row.status === 'INSTALLED'
      ) {
        lifecycleStatus = 'INSTALLED_DEPLOYED';
      } else if (
        row.assigned_technician_id ||
        row.status === 'ASSIGNED' ||
        row.status === 'AWAITING_ADMIN_VERIFICATION' ||
        row.status === 'SUSPECTED_DUPLICATE' ||
        row.status === 'REJECTED_INVALID_TAG'
      ) {
        lifecycleStatus = 'ASSIGNED_RESERVED';
      }

      // Determine verification status
      let verificationStatus: InventoryItem['verificationStatus'] = 'UNLINKED_READY';
      if (row.verification_status) {
        verificationStatus = row.verification_status;
      } else if (
        row.status === 'AWAITING_ADMIN_VERIFICATION' ||
        row.is_return_pending
      ) {
        verificationStatus = 'AWAITING_VERIFICATION';
      } else if (
        row.status === 'INSTALLED_VERIFIED' ||
        row.status === 'INSTALLED_CLOSED' ||
        row.customer_account_number
      ) {
        verificationStatus = 'VERIFIED_CONNECTED';
      } else if (
        row.status === 'SUSPECTED_DUPLICATE' ||
        row.status === 'REJECTED_INVALID_TAG'
      ) {
        verificationStatus = 'FLAGGED_ACTION_REQUIRED';
      }

      const allPhotos = Array.from(
        new Set([row.photo_url, ...(Array.isArray(extraPhotos) ? extraPhotos : [])].filter(Boolean))
      );

      return {
        id: row.id,
        name: row.name || 'Hardware Asset',
        serialNumber: row.serial_number,
        sku: row.model || row.name || 'FX-HW',
        description: row.name || '',
        category: row.category || 'MODEM_ONT',
        brand: row.brand || 'FiberX',
        modelName: row.model || 'Standard Hardware',
        quantity: row.quantity || 1,
        unit: row.unit || 'pcs',
        bypassBarcode: false,
        lifecycleStatus,
        verificationStatus,
        status: isArchived ? 'ARCHIVED' : row.status || 'IN_STOCK',
        storageBin: row.current_location || 'Rack A-01',
        assignedTechnicianId: row.assigned_technician_id || undefined,
        assignedTechnicianName: row.assigned_technician_name || undefined,
        assignedAt: row.assigned_at || undefined,
        assignedByUserId: row.assigned_by_user_id || undefined,
        assignedByUserName: row.assigned_by_user_name || undefined,
        slotNumber: row.slot_label || undefined,
        pairedItemId: row.paired_parent_id || undefined,
        pairingStatus: row.paired_parent_id ? 'PAIRED' : 'UNPAIRED',
        customerAccountNumber: row.customer_account_number || undefined,
        customerName: row.customer_name || undefined,
        customerAddress: row.customer_address || undefined,
        opticalRx: row.optical_rx || undefined,
        installationDate: row.installation_date || undefined,
        submittedByTechnicianId: row.submitted_by_technician_id || undefined,
        submittedByTechnicianName: row.submitted_by_technician_name || undefined,
        submittedAt: row.submitted_at || undefined,
        adminVerificationStatus: (row.verification_status as any) || (row.status === 'INSTALLED_VERIFIED' ? 'APPROVED' : 'PENDING'),
        verifiedByAdminName: row.verified_by_admin_name || undefined,
        verifiedAt: row.verified_at || undefined,
        adminRejectionReason: row.rejection_notes || undefined,
        photoUrl: row.photo_url || undefined,
        photoProofUrl: row.photo_url || (allPhotos[0] || ''),
        photoProofUrls: allPhotos,
        photoStoragePath: row.photo_storage_path || undefined,
        isReturnPending: Boolean(row.is_return_pending),
        returnReason: row.return_reason || undefined,
        notes: cleanNotes || undefined,
        receivedDate: row.created_at || new Date().toISOString(),
        receivedBy: 'Central Receiving',
        archived: isArchived,
      };
    });
  } catch {
    return null;
  }
}

/**
 * Sync an inventory item to Supabase PostgreSQL table
 */
export async function syncInventoryItemToSupabase(item: InventoryItem): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    let combinedNotes = item.notes || '';
    if (item.archived && !combinedNotes.includes('[ARCHIVED]')) {
      combinedNotes = `[ARCHIVED] ${combinedNotes}`.trim();
    }
    if (item.photoProofUrls && item.photoProofUrls.length > 1) {
      combinedNotes = `${combinedNotes} [PHOTOS]:${JSON.stringify(item.photoProofUrls)}`;
    }

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
      condition: 'GOOD_CONDITION',
      status: item.archived ? 'ARCHIVED' : item.status || 'IN_STOCK',
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
      is_return_pending: Boolean(item.isReturnPending),
      return_reason: item.returnReason || null,
      notes: combinedNotes || null,
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
 * Batch sync inventory items to Supabase
 */
export async function batchSyncInventoryToSupabase(items: InventoryItem[]): Promise<boolean> {
  if (!isSupabaseConfigured() || items.length === 0) return false;
  try {
    const rows = items.map((item) => {
      let combinedNotes = item.notes || '';
      if (item.archived && !combinedNotes.includes('[ARCHIVED]')) {
        combinedNotes = `[ARCHIVED] ${combinedNotes}`.trim();
      }
      if (item.photoProofUrls && item.photoProofUrls.length > 1) {
        combinedNotes = `${combinedNotes} [PHOTOS]:${JSON.stringify(item.photoProofUrls)}`;
      }

      return {
        id: item.id,
        name: item.name,
        serial_number: item.serialNumber,
        barcode: item.serialNumber,
        category: item.category,
        brand: item.brand || 'FiberX',
        model: item.modelName || item.sku || 'Standard Hardware',
        quantity: item.quantity || 1,
        unit: item.unit || 'pcs',
        condition: 'GOOD_CONDITION',
        status: item.archived ? 'ARCHIVED' : item.status || 'IN_STOCK',
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
        is_return_pending: Boolean(item.isReturnPending),
        return_reason: item.returnReason || null,
        notes: combinedNotes || null,
      };
    });

    const { error } = await supabase.from('inventory_items').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('Batch inventory sync failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Unexpected error in batchSyncInventoryToSupabase:', err);
    return false;
  }
}

/**
 * Delete single inventory item from Supabase
 */
export async function deleteInventoryItemFromSupabase(itemId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Batch delete inventory items from Supabase
 */
export async function batchDeleteInventoryItemsFromSupabase(itemIds: string[]): Promise<boolean> {
  if (!isSupabaseConfigured() || itemIds.length === 0) return false;
  try {
    const { error } = await supabase.from('inventory_items').delete().in('id', itemIds);
    return !error;
  } catch {
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
 * Delete a technician record from Supabase
 */
export async function deleteTechnicianFromSupabase(techId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from('technicians').delete().eq('id', techId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch audit logs from Supabase
 */
export async function fetchAuditLogsFromSupabase(): Promise<AuditLog[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(150);

    if (error || !data) return null;

    return data.map((row: any): AuditLog => ({
      id: row.id,
      action: row.action,
      details: row.details,
      timestamp: row.timestamp,
      performedBy: row.user_name || 'System User',
      role: (row.user_role as any) || 'ADMIN',
      itemId: row.item_id || undefined,
      itemSku: row.item_name || undefined,
      itemSerial: row.serial_number || undefined,
      technicianId: row.user_id || undefined,
    }));
  } catch {
    return null;
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
 * Sync an account closure record to Supabase
 */
export async function syncAccountClosureToSupabase(closure: {
  id: string;
  accountNumber: string;
  customerName: string;
  customerAddress?: string;
  technicianId?: string;
  technicianName: string;
  technicianVan?: string;
  equipmentSerial: string;
  equipmentModel?: string;
  opticalRx?: string;
  status?: string;
  notes?: string;
  installationPhotos?: any[];
  photoUrl?: string;
  verifiedByAdminName?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const row = {
      id: closure.id,
      account_number: closure.accountNumber,
      customer_name: closure.customerName,
      customer_address: closure.customerAddress || null,
      technician_id: closure.technicianId || null,
      technician_name: closure.technicianName,
      technician_van: closure.technicianVan || null,
      equipment_serial: closure.equipmentSerial,
      equipment_model: closure.equipmentModel || null,
      optical_rx: closure.opticalRx || null,
      status: closure.status || 'AWAITING_VERIFICATION',
      notes: closure.notes || null,
      installation_photos: closure.installationPhotos || [],
      photo_url: closure.photoUrl || null,
      verified_by_admin_name: closure.verifiedByAdminName || null,
      verified_at: closure.verifiedAt || null,
      rejection_reason: closure.rejectionReason || null,
    };

    const { error } = await supabase.from('account_closures').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase account closure sync failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Unexpected error in syncAccountClosureToSupabase:', err);
    return false;
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

    // 3. If TECHNICIAN role, ensure record exists in technicians table too
    if (user.role === 'TECHNICIAN') {
      const techRow = {
        id: user.technicianId || authId,
        name: user.name,
        employee_id: user.badgeId,
        phone: user.phone || null,
        assigned_van: user.assignedVan || 'Van 01',
        area: user.assignedArea || 'Field Operations',
        active_job_count: 0,
        completed_count: 0,
      };
      await supabase.from('technicians').upsert(techRow, { onConflict: 'id' });
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

    // If technician, update technicians table as well
    if (user.role === 'TECHNICIAN') {
      const techRow = {
        id: user.technicianId || user.id,
        name: user.name,
        employee_id: user.badgeId,
        phone: user.phone || null,
        assigned_van: user.assignedVan || 'Van 01',
        area: user.assignedArea || 'Field Operations',
      };
      await supabase.from('technicians').upsert(techRow, { onConflict: 'id' });
    }

    return true;
  } catch (err) {
    console.warn('Unexpected error in syncUserProfileToSupabase:', err);
    return false;
  }
}

/**
 * Delete user from public.profiles and technicians in Supabase
 */
export async function deleteUserFromSupabase(userEmailOrId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const isEmail = userEmailOrId.includes('@');
    if (isEmail) {
      await supabase.from('profiles').delete().eq('email', userEmailOrId.trim().toLowerCase());
    } else {
      await supabase.from('profiles').delete().eq('id', userEmailOrId);
      await supabase.from('technicians').delete().eq('id', userEmailOrId);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Subscribe to live Postgres changes across all FiberX tables
 */
export function subscribeToSupabaseChanges(onUpdate: (table: string, payload: any) => void): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  try {
    const channelName = `fiberx_realtime_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, (payload) => {
        onUpdate('inventory_items', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technicians' }, (payload) => {
        onUpdate('technicians', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        onUpdate('profiles', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'account_closures' }, (payload) => {
        onUpdate('account_closures', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, (payload) => {
        onUpdate('audit_logs', payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Channel connected
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Failed to initialize Supabase Realtime channel:', err);
    return () => {};
  }
}
