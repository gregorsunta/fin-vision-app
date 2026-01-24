import { writable } from 'svelte/store';

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
}

function createReceiptQueueStore() {
  const { subscribe, set, update } = writable<ReceiptQueueState>({
    uploads: [],
    isProcessing: false,
    completedUploads: loadCompletedUploads(),
  });

  // Load completed uploads from localStorage
  function loadCompletedUploads(): CompletedUpload[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('fin-vision-completed-uploads');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((u: any) => ({
          ...u,
          uploadedAt: new Date(u.uploadedAt),
          completedAt: new Date(u.completedAt),
        }));
      }
    } catch (err) {
      console.error('Failed to load completed uploads:', err);
    }
    return [];
  }

  // Save completed uploads to localStorage
  function saveCompletedUploads(uploads: CompletedUpload[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('fin-vision-completed-uploads', JSON.stringify(uploads));
    } catch (err) {
      console.error('Failed to save completed uploads:', err);
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
  };
}

export const receiptQueue = createReceiptQueueStore();
