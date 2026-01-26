/**
 * Utility to migrate old localStorage data to new user-specific format
 * 
 * Before: 'fin-vision-completed-uploads' (shared across all users)
 * After: 'fin-vision-uploads-{emailHash}' (user-specific)
 */

export function migrateOldStorageData(userEmail: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const oldKey = 'fin-vision-completed-uploads';
    const oldData = localStorage.getItem(oldKey);
    
    if (!oldData) {
      console.log('📭 No old storage data found to migrate');
      return false;
    }
    
    // Create new user-specific key
    const emailHash = btoa(userEmail).replace(/=/g, '');
    const newKey = `fin-vision-uploads-${emailHash}`;
    
    // Check if new key already has data
    const existingData = localStorage.getItem(newKey);
    if (existingData) {
      console.log('✅ User already has migrated data, skipping migration');
      return false;
    }
    
    // Migrate data to new key
    localStorage.setItem(newKey, oldData);
    console.log(`✅ Migrated old storage data to ${newKey}`);
    
    // Optionally remove old data (commented out to be safe)
    // localStorage.removeItem(oldKey);
    // console.log('🗑️ Removed old storage key');
    
    return true;
  } catch (err) {
    console.error('❌ Failed to migrate storage data:', err);
    return false;
  }
}

/**
 * Clear all old non-user-specific storage keys
 */
export function clearOldStorageData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const oldKey = 'fin-vision-completed-uploads';
    localStorage.removeItem(oldKey);
    console.log('🗑️ Cleared old storage data');
  } catch (err) {
    console.error('❌ Failed to clear old storage data:', err);
  }
}

/**
 * List all fin-vision localStorage keys
 */
export function listFinVisionKeys(): string[] {
  if (typeof window === 'undefined') return [];
  
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('fin-vision-')) {
      keys.push(key);
    }
  }
  return keys;
}
