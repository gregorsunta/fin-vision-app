import { receiptQueue, type ReceiptUpload } from '../stores/receiptQueue';
import { apiClient, ApiError } from '../api/client';
import { get } from 'svelte/store';

class QueueProcessor {
  private isRunning = false;
  private concurrentUploads = 3;
  private activeUploads = new Set<string>();
  private pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processQueue();
  }

  stop() {
    this.isRunning = false;
    for (const interval of this.pollingIntervals.values()) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();
  }

  private async processQueue() {
    while (this.isRunning) {
      const state = get(receiptQueue);

      const pendingUploads = state.uploads.filter(
        upload => upload.status === 'pending' && !this.activeUploads.has(upload.id)
      );

      const availableSlots = this.concurrentUploads - this.activeUploads.size;
      const uploadsToProcess = pendingUploads.slice(0, availableSlots);

      if (uploadsToProcess.length === 0) {
        await this.sleep(500);
        continue;
      }

      uploadsToProcess.forEach(upload => {
        this.processUpload(upload);
      });

      await this.sleep(100);
    }
  }

  private async processUpload(upload: ReceiptUpload) {
    this.activeUploads.add(upload.id);

    try {
      receiptQueue.setStatus(upload.id, 'uploading', 10);

      const progressInterval = setInterval(() => {
        const currentState = get(receiptQueue);
        const currentUpload = currentState.uploads.find(u => u.id === upload.id);
        if (currentUpload && currentUpload.status === 'uploading' && currentUpload.progress < 90) {
          receiptQueue.setStatus(upload.id, 'uploading', currentUpload.progress + 10);
        }
      }, 200);

      const result = await apiClient.uploadReceipt(upload.file);

      clearInterval(progressInterval);

      // Backend returns 202 - processing is queued, not complete
      // Mark as processing and start polling for completion
      receiptQueue.setStatus(upload.id, 'processing', 0);
      receiptQueue.updateUpload(upload.id, { uploadId: result.uploadId });

      this.startPolling(upload.id, result.uploadId);

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

  private startPolling(clientUploadId: string, backendUploadId: number) {
    let pollCount = 0;
    const maxPolls = 120; // ~4 minutes at 2s intervals

    const poll = async () => {
      pollCount++;

      if (pollCount > maxPolls) {
        clearInterval(interval);
        this.pollingIntervals.delete(clientUploadId);
        receiptQueue.setError(clientUploadId, 'Processing timed out. Check the Receipts page for status.');
        return;
      }

      try {
        const details = await apiClient.getUpload(backendUploadId);

        // Update processing progress info on the upload
        receiptQueue.updateUpload(clientUploadId, {
          result: {
            uploadId: backendUploadId,
            status: details.status,
            statistics: details.statistics,
            message: details.message,
          },
        });

        if (details.status !== 'processing') {
          clearInterval(interval);
          this.pollingIntervals.delete(clientUploadId);

          // Build the final result matching the expected format
          const finalResult = {
            uploadId: backendUploadId,
            status: details.status,
            statistics: details.statistics,
            successful_receipts: details.receipts.successful,
            failed_receipts: details.receipts.failed,
            message: details.message,
          };

          if (details.status === 'failed') {
            receiptQueue.setError(clientUploadId, details.message || 'Processing failed on the server.');
          } else {
            receiptQueue.setResult(clientUploadId, finalResult);
          }
        }
      } catch (err) {
        console.error('Polling error for upload', backendUploadId, err);
      }
    };

    // Poll immediately, then every 2 seconds
    poll();
    const interval = setInterval(poll, 2000);
    this.pollingIntervals.set(clientUploadId, interval);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setConcurrency(count: number) {
    this.concurrentUploads = Math.max(1, Math.min(10, count));
  }
}

export const queueProcessor = new QueueProcessor();

if (typeof window !== 'undefined') {
  queueProcessor.start();
}
