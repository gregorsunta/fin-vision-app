import { writable } from 'svelte/store';
import { authStore } from './auth';
import { get } from 'svelte/store';

export interface ReceiptUpload {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  result?: any;
  error?: string;
  uploadedAt?: Date;
  completedAt?: Date;
  uploadId?: number; // Backend upload ID
}

export interface CompletedUpload {
  uploadId: number;
  fileName: string;
  uploadedAt: Date;
  completedAt: Date;
  statistics: {
    totalDetected: number;
    successful: number;
    failed: number;
    processing: number;
  };
  result: any;
}

interface ReceiptQueueState {
  uploads: ReceiptUpload[];
  isProcessing: boolean;
  completedUploads: CompletedUpload[];
  loadingHistory: boolean;
  historyError: string | null;
}

// Get user-specific localStorage key
function getStorageKey(): string {
  const auth = get(authStore);
  const userEmail = auth.user?.email;
  
  if (!userEmail) {
    console.warn('⚠️ No user email found, using default storage key');
    return 'fin-vision-completed-uploads';
  }
  
  // Create user-specific key using email hash for privacy
  const emailHash = btoa(userEmail).replace(/=/g, '');
  return `fin-vision-uploads-${emailHash}`;
}

function createReceiptQueueStore() {
  const { subscribe, set, update } = writable<ReceiptQueueState>({
    uploads: [],
    isProcessing: false,
    completedUploads: loadCompletedUploads(),
    loadingHistory: false,
    historyError: null,
  });

  // Load completed uploads from localStorage
  function loadCompletedUploads(): CompletedUpload[] {
    if (typeof window === 'undefined') return [];
    try {
      const storageKey = getStorageKey();
      console.log('📂 Loading completed uploads from:', storageKey);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('✅ Loaded', parsed.length, 'completed uploads for current user');
        return parsed.map((u: any) => ({
          ...u,
          uploadedAt: new Date(u.uploadedAt),
          completedAt: new Date(u.completedAt),
        }));
      }
    } catch (err) {
      console.error('❌ Failed to load completed uploads:', err);
    }
    return [];
  }

  // Save completed uploads to localStorage
  function saveCompletedUploads(uploads: CompletedUpload[]) {
    if (typeof window === 'undefined') return;
    try {
      const storageKey = getStorageKey();
      console.log('💾 Saving', uploads.length, 'completed uploads to:', storageKey);
      localStorage.setItem(storageKey, JSON.stringify(uploads));
    } catch (err) {
      console.error('❌ Failed to save completed uploads:', err);
    }
  }

  return {
    subscribe,
    
    addUpload: (file: File) => {
      const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newUpload: ReceiptUpload = {
        id: uploadId,
        file,
        status: 'pending',
        progress: 0,
        uploadedAt: new Date(),
      };
      
      update(state => ({
        ...state,
        uploads: [newUpload, ...state.uploads],
      }));
      
      return uploadId;
    },
    
    addMultipleUploads: (files: File[]) => {
      const uploadIds: string[] = [];
      const newUploads = files.map(file => {
        const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        uploadIds.push(uploadId);
        return {
          id: uploadId,
          file,
          status: 'pending' as const,
          progress: 0,
          uploadedAt: new Date(),
        };
      });
      
      update(state => ({
        ...state,
        uploads: [...newUploads, ...state.uploads],
      }));
      
      return uploadIds;
    },
    
    updateUpload: (id: string, updates: Partial<ReceiptUpload>) => {
      update(state => ({
        ...state,
        uploads: state.uploads.map(upload =>
          upload.id === id ? { ...upload, ...updates } : upload
        ),
      }));
    },
    
    setStatus: (id: string, status: ReceiptUpload['status'], progress?: number) => {
      update(state => ({
        ...state,
        uploads: state.uploads.map(upload =>
          upload.id === id
            ? {
                ...upload,
                status,
                progress: progress ?? upload.progress,
                completedAt: status === 'success' || status === 'error' ? new Date() : upload.completedAt,
              }
            : upload
        ),
      }));
    },
    
    setError: (id: string, error: string) => {
      update(state => ({
        ...state,
        uploads: state.uploads.map(upload =>
          upload.id === id
            ? {
                ...upload,
                status: 'error',
                error,
                completedAt: new Date(),
              }
            : upload
        ),
      }));
    },
    
    setResult: (id: string, result: any) => {
      update(state => {
        const upload = state.uploads.find(u => u.id === id);
        const updatedUploads = state.uploads.map(upload =>
          upload.id === id
            ? {
                ...upload,
                status: 'success' as const,
                result,
                progress: 100,
                completedAt: new Date(),
                uploadId: result.uploadId,
              }
            : upload
        );

        // Add to completed uploads history
        let newCompletedUploads = [...state.completedUploads];
        if (upload && result.uploadId) {
          const completed: CompletedUpload = {
            uploadId: result.uploadId,
            fileName: upload.file.name,
            uploadedAt: upload.uploadedAt || new Date(),
            completedAt: new Date(),
            statistics: {
              totalDetected: result.successful_receipts?.length || 0,
              successful: result.successful_receipts?.length || 0,
              failed: result.failed_receipts?.length || 0,
              processing: 0,
            },
            result,
          };
          newCompletedUploads = [completed, ...newCompletedUploads];
          saveCompletedUploads(newCompletedUploads);
        }

        return {
          ...state,
          uploads: updatedUploads,
          completedUploads: newCompletedUploads,
        };
      });
    },
    
    removeUpload: (id: string) => {
      update(state => ({
        ...state,
        uploads: state.uploads.filter(upload => upload.id !== id),
      }));
    },
    
    clearCompleted: () => {
      update(state => ({
        ...state,
        uploads: state.uploads.filter(
          upload => upload.status !== 'success' && upload.status !== 'error'
        ),
      }));
    },
    
    clearAll: () => {
      update(state => ({
        uploads: [],
        isProcessing: false,
        completedUploads: state.completedUploads,
      }));
    },
    
    clearHistory: () => {
      update(state => {
        saveCompletedUploads([]);
        return {
          ...state,
          completedUploads: [],
        };
      });
    },
    
    setProcessing: (isProcessing: boolean) => {
      update(state => ({
        ...state,
        isProcessing,
      }));
    },
    
    // Reload completed uploads for current user (call after login)
    reloadForUser: () => {
      console.log('🔄 Reloading completed uploads for current user');
      const uploads = loadCompletedUploads();
      update(state => ({
        ...state,
        completedUploads: uploads,
      }));
    },
    
    // Fetch completed uploads from backend API
    fetchCompletedUploads: async () => {
      update(state => ({ ...state, loadingHistory: true, historyError: null }));
      
      try {
        console.log('🌐 Fetching upload history from API...');
        
        // Dynamic import to avoid circular dependency
        const { apiClient } = await import('$lib/api/client');
        
        const response = await apiClient.getUserUploads({
          limit: 100, // Get recent uploads
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        
        console.log('✅ Fetched', response.uploads.length, 'uploads from API');
        
        // Transform API response to CompletedUpload format
        const completedUploads: CompletedUpload[] = response.uploads.map(upload => ({
          uploadId: upload.uploadId,
          fileName: upload.fileName,
          uploadedAt: new Date(upload.createdAt),
          completedAt: new Date(upload.updatedAt),
          statistics: upload.statistics,
          result: {
            originalImageUrl: upload.images.original,
            markedImageUrl: upload.images.marked,
          },
        }));
        
        // Save to localStorage as cache
        saveCompletedUploads(completedUploads);
        
        update(state => ({
          ...state,
          completedUploads,
          loadingHistory: false,
          historyError: null,
        }));
        
        return completedUploads;
      } catch (err: any) {
        console.error('❌ Failed to fetch upload history:', err);
        
        // Fall back to localStorage cache
        console.log('📂 Falling back to localStorage cache');
        const cachedUploads = loadCompletedUploads();
        
        update(state => ({
          ...state,
          loadingHistory: false,
          historyError: err.message || 'Failed to load upload history',
          completedUploads: cachedUploads,
        }));
        
        return cachedUploads;
      }
    },
    
    // Update statistics for a specific upload (sync sidebar with API data)
    updateUploadStatistics: (uploadId: number, statistics: CompletedUpload['statistics']) => {
      update(state => {
        const newCompleted = state.completedUploads.map(u =>
          u.uploadId === uploadId ? { ...u, statistics } : u
        );
        saveCompletedUploads(newCompleted);
        return { ...state, completedUploads: newCompleted };
      });
    },

    // Clear all data (call on logout)
    clearAllData: () => {
      console.log('🧹 Clearing all receipt queue data');
      set({
        uploads: [],
        isProcessing: false,
        completedUploads: [],
        loadingHistory: false,
        historyError: null,
      });
    },
  };
}

export const receiptQueue = createReceiptQueueStore();
