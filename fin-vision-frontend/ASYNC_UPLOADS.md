# Async Receipt Upload System

## Overview

The application now supports **asynchronous receipt uploading**, allowing you to upload countless receipts without waiting for each one to complete. Receipts are queued and processed in the background with a configurable concurrency level.

## Features

### 🚀 Key Capabilities

- **Multiple File Upload**: Select or drag-drop multiple receipt images at once
- **Background Processing**: Uploads process asynchronously - continue using the app while receipts upload
- **Concurrent Processing**: Up to 3 receipts process simultaneously (configurable)
- **Real-time Progress**: Visual feedback for each upload's status
- **Queue Management**: View, monitor, and manage all uploads in one place
- **Automatic Retries**: Failed uploads can be easily re-queued (future enhancement)
- **No Blocking**: Add more receipts to the queue at any time

### 📊 Upload States

Each receipt goes through these states:

1. **Pending** (⏱️) - Queued, waiting to start
2. **Uploading** (🔄) - File is being uploaded to the server
3. **Processing** (🔄) - Server is analyzing the receipt with AI
4. **Success** (✅) - Receipt processed successfully
5. **Error** (❌) - Upload or processing failed

## Architecture

### Components

#### 1. Receipt Queue Store (`receiptQueue.ts`)
- Manages the upload queue state
- Provides actions to add, update, and remove uploads
- Tracks status, progress, and results for each upload

#### 2. Queue Processor (`queueProcessor.ts`)
- Runs continuously in the background
- Processes pending uploads with concurrency control
- Handles upload failures and success
- Auto-starts when the app loads

#### 3. ReceiptQueue Component
- Visual display of all uploads
- Shows real-time progress and status
- Allows filtering and clearing completed items
- Displays success results and error messages

#### 4. UploadReceipt Component
- Multi-file drag-and-drop interface
- Instantly adds files to queue without blocking
- Supports unlimited concurrent uploads

## Usage

### Uploading Multiple Receipts

```typescript
// Users can:
// 1. Drag and drop multiple images
// 2. Click "Select Files" and choose multiple files
// 3. Continue adding more files while others are processing
```

### Monitoring Progress

The queue display shows:
- Total uploads, active, successful, and failed counts
- Individual progress bars for each upload
- File names and sizes
- Extracted receipt data for successful uploads
- Error messages for failed uploads

### Managing the Queue

- **Show/Hide Completed**: Toggle visibility of finished uploads
- **Clear Completed**: Remove all successful and failed uploads from view
- **Remove Individual**: Click X on any upload to remove it
- **Expand/Collapse**: Toggle the queue detail view

## Configuration

### Adjusting Concurrency

Edit `src/lib/services/queueProcessor.ts`:

```typescript
private concurrentUploads = 3; // Change this value (1-10)
```

Or dynamically at runtime:

```typescript
import { queueProcessor } from '$lib/services/queueProcessor';
queueProcessor.setConcurrency(5);
```

### Performance Considerations

- **Low Bandwidth**: Set concurrency to 1-2
- **High Bandwidth**: Set concurrency to 5-10
- **Server Limits**: Consider backend capacity

## Technical Details

### State Management

The queue uses Svelte stores for reactive state management:

```typescript
interface ReceiptUpload {
  id: string;              // Unique identifier
  file: File;              // Original file object
  status: Status;          // Current status
  progress: number;        // 0-100 percentage
  result?: any;            // API response on success
  error?: string;          // Error message on failure
  uploadedAt?: Date;       // When added to queue
  completedAt?: Date;      // When finished
}
```

### Upload Flow

1. User selects/drops files
2. Files added to queue with "pending" status
3. Queue processor picks up pending uploads
4. Upload starts, status changes to "uploading"
5. Server processes, status may change to "processing"
6. On completion:
   - Success: Store result, show extracted data
   - Failure: Store error message
7. Next pending upload starts automatically

### API Integration

The system uses the existing API client:

```typescript
await apiClient.uploadReceipt(file)
```

The API returns:
- Upload ID
- Success/failure status
- Extracted receipt data
- Individual receipt results

## Benefits

### For Users

- ✅ Upload dozens of receipts in one session
- ✅ No waiting - add receipts anytime
- ✅ Clear visibility into processing status
- ✅ Immediate feedback on success/failure
- ✅ Continue working while uploads process

### For Development

- ✅ Scalable architecture
- ✅ Easy to extend (retry logic, priority queue, etc.)
- ✅ Separate concerns (UI, state, processing)
- ✅ Testable components
- ✅ Type-safe with TypeScript

## Future Enhancements

### Planned Features

- [ ] **Retry Failed Uploads**: One-click retry for failed items
- [ ] **Priority Queue**: Mark urgent receipts for faster processing
- [ ] **Pause/Resume**: Control the queue processor
- [ ] **Upload History**: Persist queue state across sessions
- [ ] **Batch Operations**: Select multiple items for bulk actions
- [ ] **Notifications**: Toast/notification on completion
- [ ] **Upload Limits**: Set max file size and count limits
- [ ] **Offline Support**: Queue uploads when offline, process when online

### Potential Improvements

- **Progress Accuracy**: Real upload progress from fetch API
- **Smart Retry**: Exponential backoff for failed uploads
- **Duplicate Detection**: Warn about duplicate files
- **Image Preview**: Thumbnail preview in queue
- **Analytics**: Track upload success rates and timing

## Example Usage

### Basic Upload

```svelte
<!-- Already integrated in Dashboard -->
<UploadReceipt />
<ReceiptQueue />
```

### Programmatic Queue Management

```typescript
import { receiptQueue } from '$lib/stores/receiptQueue';

// Add a file
const file = new File([...], 'receipt.jpg', { type: 'image/jpeg' });
const uploadId = receiptQueue.addUpload(file);

// Add multiple files
const files = [...]; // File[]
const uploadIds = receiptQueue.addMultipleUploads(files);

// Monitor queue
receiptQueue.subscribe(state => {
  console.log(`${state.uploads.length} uploads in queue`);
});

// Clear completed
receiptQueue.clearCompleted();
```

## Troubleshooting

### Uploads Not Processing

**Issue**: Files added but not processing
**Solution**: Check browser console for errors, ensure queueProcessor is imported in Dashboard

### Slow Processing

**Issue**: Uploads taking too long
**Solution**: Reduce image file sizes, check backend performance, increase concurrency

### Failed Uploads

**Issue**: Many uploads failing
**Solution**: Check network connection, verify backend is running, check API authentication

### Memory Issues

**Issue**: Browser slowing down with many uploads
**Solution**: Clear completed uploads regularly, reduce image file sizes

## Performance Tips

1. **Optimize Images**: Compress images before upload (< 5MB recommended)
2. **Batch Wisely**: Upload 10-20 at a time, then clear completed
3. **Monitor Backend**: Ensure backend can handle concurrent requests
4. **Clear Queue**: Remove completed uploads to free memory
5. **Network**: Use stable internet connection for best results

## Summary

The async upload system transforms the user experience from:
- "Upload one, wait, upload another..." ❌

To:
- "Drop 50 receipts, go make coffee, come back to see results" ✅

This makes the application suitable for power users who need to process large volumes of receipts efficiently.
