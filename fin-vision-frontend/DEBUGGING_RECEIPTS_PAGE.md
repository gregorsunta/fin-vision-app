# Debugging Receipts Page Issues

## What We've Added

### 1. Retry Functionality ✅
We successfully added retry functionality for failed receipt processing:

- **API Client** (`client.ts`): Added `reprocessReceipt(uploadId)` method
- **Receipts Page**: "Retry Failed" button appears when there are failed receipts
- **Upload Page**: Retry button (🔄) for each failed upload or successful upload with failed receipts
- **Receipt Queue**: Same retry functionality in the queue component

### 2. Enhanced Debugging Tools 🐛

#### Console Logging
Added comprehensive console logging with emojis for easy tracking:
- 📤 Fetching upload details
- 📥 Received upload details
- 🖼️ Loading images
- ✅ Success messages
- ⚠️ Warnings
- ❌ Errors

#### Visual Debug Panel
Added a "Show/Hide Debug Info" button on the Receipts Page that displays:
- Upload ID
- Status
- Whether images object exists
- Marked image URL
- Split receipts count
- Total receipts count
- Full API response (expandable)

#### Test Page
Created `tmp_rovodev_test_api.html` - a standalone test page to:
- Test login
- View queue data from localStorage
- Test the `/api/receipts/:uploadId` endpoint directly
- See raw API responses

## How to Diagnose the Issues

### Step 1: Check Console Logs
1. Open the Receipts Page
2. Open browser DevTools (F12) and go to Console tab
3. Click on an upload from the list
4. Look for the logging sequence:
   - 📤 Fetching upload details for uploadId: X
   - 📥 Received upload details: {...}
   - 🖼️ Loading marked image: /files/...
   - 🖼️ Loading X split receipt images

### Step 2: Use the Debug Panel
1. Go to Receipts Page
2. Click "Show Debug Info" button in the top right
3. Select an upload
4. Check the debug panel for:
   - Is "Has Images Object" showing "YES"?
   - Is "Marked Image URL" showing a path or "MISSING"?
   - What is the "Split Receipts Count"?
   - Expand "Full API Response" to see raw data

### Step 3: Use the Test Page
1. Navigate to: `http://localhost:5175/tmp_rovodev_test_api.html`
2. Login with your credentials
3. Click "Get Queue Data" to see what's in localStorage
4. Find an uploadId from the queue data
5. Enter it in the "Upload ID" field
6. Click "Get Upload Details"
7. Review the API response

### Step 4: Check Backend Logs
1. Go to your backend terminal (fin-vision-service)
2. Look for any errors when fetching `/api/receipts/:uploadId`
3. Check if images are being returned properly

## Common Issues and Solutions

### Issue 1: Marked Image Not Showing
**Symptoms:** "Marked Image URL: MISSING" in debug panel

**Possible Causes:**
- Backend is not generating marked images
- Backend detection failed (no receipts detected)
- Database doesn't have marked_image_url saved

**Check:**
```javascript
// In console logs, look for:
⚠️ No marked image found in response
```

**Solution:** Check backend receipt detection and image generation logic.

### Issue 2: Receipts Showing as Failed
**Symptoms:** All receipts show red "Failed" badge, no store name or total

**Possible Causes:**
- AI processing failed
- Receipt images are corrupt or unreadable
- OpenAI API key issues
- Processing timeout

**Check:**
```javascript
// Look in debug panel -> Full API Response -> receipts.failed
// Check for error messages
```

**Solution:** 
- Check backend worker logs for AI processing errors
- Verify OpenAI API key is set
- Check receipt image quality

### Issue 3: Images Won't Load/Zoom
**Symptoms:** Image loading spinners forever, or images don't appear

**Possible Causes:**
- Image filenames are incorrect
- `/api/files/:filename` endpoint issues
- Authentication issues with image requests

**Check:**
```javascript
// Console logs should show:
❌ Failed to load image: filename.jpg [error details]
```

**Solution:**
- Verify `/api/files/` endpoint is working
- Check that filenames match what's in the uploads folder
- Verify authentication token is being sent

### Issue 4: No Uploads in History
**Symptoms:** "No uploads yet" message

**Possible Causes:**
- localStorage is empty (cleared or different browser)
- Uploads haven't completed yet
- Store not persisting data

**Check:**
```javascript
// In console:
localStorage.getItem('receiptQueue')
// Should show JSON with completedUploads array
```

**Solution:**
- Upload some receipts first
- Wait for processing to complete
- Check browser localStorage isn't being cleared

## API Endpoint Reference

### Get Upload Details
```http
GET /api/receipts/:uploadId
Authorization: Bearer {accessToken}
```

**Expected Response Structure:**
```json
{
  "uploadId": 123,
  "status": "completed",
  "images": {
    "original": "/files/abc123.jpg",
    "marked": "/files/marked-abc123.jpg",
    "splitReceipts": [
      "/files/receipt-0-abc123.jpg"
    ]
  },
  "statistics": {
    "totalDetected": 1,
    "successful": 1,
    "failed": 0,
    "processing": 0
  },
  "receipts": {
    "successful": [...],
    "failed": [...],
    "all": [...]
  }
}
```

### Reprocess Failed Receipts
```http
POST /api/receipts/:uploadId/reprocess
Authorization: Bearer {accessToken}
```

**Expected Response:**
```json
{
  "uploadId": 123,
  "message": "Reprocessing started",
  "statusUrl": "/api/receipts/123"
}
```

## Next Steps for Diagnosis

1. **Open the test page** and verify the API is returning correct data
2. **Check console logs** to see where the data flow breaks
3. **Use debug panel** to see what data the frontend is receiving
4. **Compare** the API response with what the documentation says it should return
5. **Look at backend logs** to see if there are processing errors

## Questions to Answer

Based on the debugging tools, we need to determine:

1. ✅ Is the API returning data? (Use test page)
2. ✅ Is the data structure correct? (Use debug panel)
3. ✅ Are images.marked and images.splitReceipts present? (Use debug panel)
4. ✅ Are receipts being processed or are they all failing? (Check receipts.failed array)
5. ✅ Are image URLs correct? (Check console for 404 errors)

Once we know the answers, we can determine if this is:
- **Frontend Issue**: Data display/parsing problem
- **Backend Issue**: API not returning correct data
- **Processing Issue**: AI/detection not working properly
- **Database Issue**: Data not being saved correctly

## Cleanup

After debugging, remove these temporary files:
```bash
rm fin-vision-frontend/tmp_rovodev_test_api.html
rm fin-vision-frontend/DEBUGGING_RECEIPTS_PAGE.md
```

You can also remove the console.log statements from ReceiptsPage.svelte if desired.
