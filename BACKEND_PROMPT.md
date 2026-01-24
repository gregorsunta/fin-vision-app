# Backend Task: Add Endpoint to List All User Uploads

## Problem Statement

The frontend currently stores upload history in localStorage because there's no backend endpoint to retrieve a list of all uploads for the authenticated user. This causes issues:

1. **No cross-device sync** - Users can't see their uploads on different devices
2. **Stale data** - Frontend cache can show deleted uploads
3. **Not scalable** - localStorage has size limits
4. **Poor UX** - Users can't see their complete upload history

## Required Implementation

### New Endpoint: `GET /api/users/me/uploads`

**Location**: `src/api/routes/users.ts` (or new `src/api/routes/uploads.ts`)

**Authentication**: Required (JWT Access Token)

**Query Parameters** (optional pagination):
- `limit` (number, default: 50) - Number of uploads to return
- `offset` (number, default: 0) - Pagination offset
- `sortBy` (string, default: 'createdAt') - Sort field (createdAt, updatedAt, status)
- `sortOrder` (string, default: 'desc') - Sort order (asc, desc)
- `status` (string, optional) - Filter by status (processing, completed, partly_completed, failed)

**Response**: `200 OK`

```json
{
  "uploads": [
    {
      "uploadId": 123,
      "fileName": "receipt_image.jpg",
      "status": "completed",
      "hasReceipts": true,
      "createdAt": "2024-01-24T10:30:00.000Z",
      "updatedAt": "2024-01-24T10:30:15.000Z",
      "statistics": {
        "totalDetected": 2,
        "successful": 2,
        "failed": 0,
        "processing": 0
      },
      "images": {
        "original": "/files/abc123.jpg",
        "marked": "/files/marked-abc123.jpg"
      }
    },
    {
      "uploadId": 122,
      "fileName": "grocery_receipt.jpg",
      "status": "partly_completed",
      "hasReceipts": true,
      "createdAt": "2024-01-24T09:15:00.000Z",
      "updatedAt": "2024-01-24T09:15:30.000Z",
      "statistics": {
        "totalDetected": 3,
        "successful": 2,
        "failed": 1,
        "processing": 0
      },
      "images": {
        "original": "/files/xyz789.jpg",
        "marked": "/files/marked-xyz789.jpg"
      }
    }
  ],
  "pagination": {
    "total": 145,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**Response Fields Explained**:
- `uploads[]`: Array of upload objects
  - `uploadId`: Unique identifier for the upload
  - `fileName`: Original uploaded file name
  - `status`: Overall processing status
  - `hasReceipts`: Whether receipts were found
  - `createdAt`: When the upload was created
  - `updatedAt`: Last update timestamp
  - `statistics`: Quick stats about receipt processing
  - `images`: Image URLs (original and marked with detection boxes)
- `pagination`: Pagination metadata
  - `total`: Total number of uploads for the user
  - `limit`: Current page size
  - `offset`: Current offset
  - `hasMore`: Whether there are more uploads to fetch

**Error Responses**:
- `401 Unauthorized`: Not authenticated or invalid token
- `400 Bad Request`: Invalid query parameters
- `500 Internal Server Error`: Database or processing error

---

## Implementation Details

### Database Query

Use the existing `receiptUploads` table with joins to `receipts` table for statistics.

```typescript
// Example query structure (adjust based on your ORM/query builder)
const uploads = await db
  .select({
    id: receiptUploads.id,
    fileName: receiptUploads.fileName,
    status: receiptUploads.status,
    hasReceipts: receiptUploads.hasReceipts,
    originalImageUrl: receiptUploads.originalImageUrl,
    markedImageUrl: receiptUploads.markedImageUrl,
    createdAt: receiptUploads.createdAt,
    updatedAt: receiptUploads.updatedAt,
  })
  .from(receiptUploads)
  .where(eq(receiptUploads.userId, request.user.id))
  .orderBy(desc(receiptUploads.createdAt))
  .limit(limit)
  .offset(offset);

// For each upload, query receipt statistics
for (const upload of uploads) {
  const receiptStats = await db
    .select({
      status: receipts.status,
      count: sql<number>`count(*)`,
    })
    .from(receipts)
    .where(eq(receipts.uploadId, upload.id))
    .groupBy(receipts.status);
  
  // Calculate statistics
  upload.statistics = {
    totalDetected: receiptStats.reduce((sum, r) => sum + r.count, 0),
    successful: receiptStats.find(r => r.status === 'processed')?.count || 0,
    failed: receiptStats.find(r => r.status === 'failed' || r.status === 'unreadable')?.count || 0,
    processing: receiptStats.find(r => r.status === 'pending')?.count || 0,
  };
}
```

### Performance Considerations

1. **Indexing**: Ensure indexes on:
   - `receiptUploads.userId` (for user filtering)
   - `receiptUploads.createdAt` (for sorting)
   - `receipts.uploadId` (for statistics join)

2. **Pagination**: Default to 50 items per page, maximum 100

3. **Caching** (optional): Consider caching statistics for completed uploads

4. **Optimization**: Use a single aggregated query instead of N+1 queries if possible:
   ```sql
   SELECT 
     ru.*,
     COUNT(r.id) as total_receipts,
     SUM(CASE WHEN r.status = 'processed' THEN 1 ELSE 0 END) as successful,
     SUM(CASE WHEN r.status IN ('failed', 'unreadable') THEN 1 ELSE 0 END) as failed,
     SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as processing
   FROM receipt_uploads ru
   LEFT JOIN receipts r ON r.upload_id = ru.id
   WHERE ru.user_id = ?
   GROUP BY ru.id
   ORDER BY ru.created_at DESC
   LIMIT ? OFFSET ?
   ```

---

## Testing

### Manual Testing

```bash
# Get all uploads for authenticated user
curl -X GET http://localhost:3000/api/users/me/uploads \
  -H "Authorization: Bearer {accessToken}"

# With pagination
curl -X GET "http://localhost:3000/api/users/me/uploads?limit=10&offset=0" \
  -H "Authorization: Bearer {accessToken}"

# Filter by status
curl -X GET "http://localhost:3000/api/users/me/uploads?status=completed" \
  -H "Authorization: Bearer {accessToken}"
```

### Test Cases

1. **Empty state**: User with no uploads should return empty array
2. **Pagination**: Verify limit and offset work correctly
3. **Authorization**: Unauthorized requests should return 401
4. **User isolation**: User A cannot see User B's uploads
5. **Statistics accuracy**: Verify receipt counts match actual data
6. **Sorting**: Test different sort orders and fields
7. **Filtering**: Test status filtering

---

## Additional Enhancements (Optional)

### 1. Search/Filter
Add query parameters for:
- `search` - Search in file names
- `dateFrom` / `dateTo` - Date range filtering
- `hasFailures` - Only show uploads with failed receipts

### 2. Lightweight Version
Add `?minimal=true` query param to return only essential fields:
```json
{
  "uploads": [
    {
      "uploadId": 123,
      "fileName": "receipt.jpg",
      "status": "completed",
      "createdAt": "2024-01-24T10:30:00.000Z"
    }
  ]
}
```

### 3. Delete Upload Endpoint
Add `DELETE /api/users/me/uploads/:uploadId` to allow users to delete uploads.

---

## Migration Path

Once this endpoint is implemented:

1. Frontend will call this API on page load instead of reading localStorage
2. LocalStorage can be removed or used only as a cache
3. Users will see uploads across all devices
4. Upload history will always be in sync with backend

---

## Priority

**High Priority** - This is a fundamental feature for proper data architecture. Without it:
- Frontend has to maintain its own database (localStorage)
- No cross-device support
- Data can become stale/inconsistent
- Poor user experience

---

## Acceptance Criteria

✅ Endpoint returns list of uploads for authenticated user  
✅ Includes accurate statistics per upload  
✅ Pagination works correctly  
✅ Only user's own uploads are returned (authorization)  
✅ Performance is acceptable (< 500ms for 50 uploads)  
✅ Response matches documented schema  
✅ Error handling for invalid requests  
✅ Tests verify functionality  

---

## Questions?

- Should we include the full receipt data in the response, or just references (IDs)?
  - **Recommendation**: Just references. Frontend can call `/api/receipts/:uploadId` for details.
  
- Should we support filtering by date range?
  - **Recommendation**: Yes, it's useful for finding specific uploads.

- Should this endpoint support bulk operations (e.g., delete multiple uploads)?
  - **Recommendation**: Start simple, add if needed.

- Should we cache the statistics?
  - **Recommendation**: Yes, for completed uploads. Invalidate on reprocessing.
