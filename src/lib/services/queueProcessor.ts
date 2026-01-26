import { receiptQueue, type ReceiptUpload } from '../stores/receiptQueue';
import { apiClient, ApiError } from '../api/client';
import { get } from 'svelte/store';

class QueueProcessor {
  private isRunning = false;
  private concurrentUploads = 3; // Process 3 uploads simultaneously
  private activeUploads = new Set<string>();

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processQueue();
  }

  stop() {
    this.isRunning = false;
  }

  private async processQueue() {
    while (this.isRunning) {
      const state = get(receiptQueue);
      
      // Find pending uploads
      const pendingUploads = state.uploads.filter(
        upload => upload.status === 'pending' && !this.activeUploads.has(upload.id)
      );

      // Process uploads up to the concurrent limit
      const availableSlots = this.concurrentUploads - this.activeUploads.size;
      const uploadsToProcess = pendingUploads.slice(0, availableSlots);

      if (uploadsToProcess.length === 0) {
        // No pending uploads, wait a bit before checking again
        await this.sleep(500);
        continue;
      }

      // Process uploads concurrently
      uploadsToProcess.forEach(upload => {
        this.processUpload(upload);
      });

      await this.sleep(100);
    }
  }

  private async processUpload(upload: ReceiptUpload) {
    this.activeUploads.add(upload.id);
    
    try {
      // Update status to uploading
      receiptQueue.setStatus(upload.id, 'uploading', 10);

      // Simulate upload progress (since fetch doesn't provide upload progress easily)
      const progressInterval = setInterval(() => {
        const currentState = get(receiptQueue);
        const currentUpload = currentState.uploads.find(u => u.id === upload.id);
        if (currentUpload && currentUpload.status === 'uploading' && currentUpload.progress < 90) {
          receiptQueue.setStatus(upload.id, 'uploading', currentUpload.progress + 10);
        }
      }, 200);

      // Upload the receipt
      const result = await apiClient.uploadReceipt(upload.file);
      
      clearInterval(progressInterval);

      // Update status to success
      receiptQueue.setResult(upload.id, result);
      
    } catch (error) {
      let errorMessage = 'Failed to upload receipt';
      
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      receiptQueue.setError(upload.id, errorMessage);
    } finally {
      this.activeUploads.delete(upload.id);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setConcurrency(count: number) {
    this.concurrentUploads = Math.max(1, Math.min(10, count));
  }
}

export const queueProcessor = new QueueProcessor();

// Auto-start the processor
if (typeof window !== 'undefined') {
  queueProcessor.start();
}
