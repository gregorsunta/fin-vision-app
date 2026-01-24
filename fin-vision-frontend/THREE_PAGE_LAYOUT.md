# Three-Page Application Layout

The Fin Vision frontend has been redesigned into three distinct pages for optimal user experience.

---

## 📄 Page 1: Upload & Queue

**Route**: `/` (Home)

### Purpose
Primary interface for uploading receipts and monitoring processing status.

### Features

#### Upload Area
- **Large drop zone** for drag-and-drop functionality
- **Multi-file selection** - Upload unlimited receipts at once
- **File type validation** - Only accepts images (JPEG, PNG)
- **Visual feedback** - Highlights when dragging files over

#### Processing Queue
- **Real-time status tracking** without percentages (as requested)
- **Status indicators**:
  - 🕐 **Queued** - Waiting to start
  - 🔄 **Uploading...** - File being sent to server
  - 🔄 **Processing...** - AI analyzing receipt
  - ✅ **Complete** - Successfully processed
  - ❌ **Failed** - Processing error

#### Statistics Dashboard
- **Queued**: Number of receipts waiting
- **Processing**: Currently being uploaded/analyzed
- **Complete**: Successfully processed receipts
- **Failed**: Receipts with errors

#### Queue Management
- Remove individual items with X button
- Clear completed button to remove finished uploads
- View file names, sizes, and status
- See success/failure counts for each upload

### Design Notes
- No progress percentages (as requested - not accurate for AI processing)
- Clean, minimal interface focused on upload experience
- Real-time feedback without overwhelming details
- Queue automatically processes uploads in background

---

## 📄 Page 2: Receipt History

**Route**: `/receipts`

### Purpose
View all previously uploaded receipts with images and detailed information.

### Features

#### Left Sidebar: Upload List
- **Chronological list** of all uploads (newest first)
- **Quick stats** for each upload:
  - File name
  - Upload date/time
  - Number of receipts detected
  - Success/failure breakdown
- **Click to expand** - Select upload to view details

#### Right Panel: Upload Details

##### Header Statistics
- **Detected**: Total receipts found in image
- **Success**: Receipts processed without issues
- **With Issues**: Receipts with possible problems (partial data)
- **Failed**: Receipts that couldn't be processed

##### Detection Preview
- **Marked image** showing red rectangles around detected receipts
- **Zoom capability** - Click to view full-size
- Visual proof of what the AI detected

##### Individual Receipts
Each receipt shows:
- **Thumbnail image** - Cropped receipt image (click to zoom)
- **Status badge**:
  - 🟢 **Success** - Fully processed
  - 🟡 **Possible Issues** - Processed with warnings
  - 🔵 **Processing** - Still analyzing
  - 🔴 **Failed** - Could not process
- **Receipt data**:
  - Merchant name
  - Total amount
  - Tax amount
  - Transaction date
  - Line items with quantities and prices
- **Error messages** for failed/problematic receipts

#### Image Modal
- Full-screen image viewer
- Click any receipt or marked image to zoom
- Close with X button or click outside
- ESC key support

### Design Notes
- Two-column layout: list + details
- Persistent history stored in localStorage
- Images loaded on demand for performance
- Clear visual hierarchy with color-coded status

---

## 📄 Page 3: Export

**Route**: `/export`

### Purpose
Download all receipt data as CSV for use in Excel, accounting software, etc.

### Features

#### Statistics Overview
- **Total Receipts**: All successfully processed receipts
- **Total Uploads**: Number of upload sessions
- **Successful**: Receipts without errors

#### Export Section
- **Large download button** for CSV export
- **Success/error feedback** after export attempt
- **Last export timestamp** tracking
- **Disabled state** when no receipts available
- **File naming**: `fin-vision-receipts-YYYY-MM-DD.csv`

#### What's Included
Information cards showing exactly what data is exported:

**Receipt Information**:
- Receipt ID
- Upload ID
- Merchant/Store Name
- Total Amount
- Tax Amount
- Transaction Date
- Processing Status
- Keywords/Tags

**Line Items**:
- Item Description
- Quantity
- Unit Price
- Total Price
- Item Keywords
- Associated Receipt ID

#### Usage Tips
Step-by-step guide on how to use the exported data:
1. Open in Excel or Google Sheets
2. Create pivot tables for analysis
3. Import into accounting software
4. Regular export for backups

#### Format Details
Technical specifications:
- Format: CSV (Comma-Separated Values)
- Encoding: UTF-8
- Compatibility: Excel, Google Sheets, Numbers, LibreOffice

### Design Notes
- Educational focus - helps users understand export value
- Clear call-to-action with large button
- Success feedback with auto-dismiss
- Comprehensive information about data structure

---

## 🎨 Navigation

### Top Navigation Bar
Present on all three pages when authenticated:

- **Logo/Brand**: "Fin Vision"
- **Page Links**:
  - 📤 Upload
  - 📄 Receipts
  - 📥 Export
- **User Actions**:
  - Logout button

### Active State
- Currently active page highlighted in primary color
- Other pages shown in muted colors
- Hover states for better UX

---

## 🔄 Data Flow

### Upload Flow
```
Page 1 (Upload) → Queue Processor → Backend API
                ↓
          Completed Uploads
                ↓
     localStorage (History)
                ↓
    Page 2 (Receipt History)
                ↓
      Page 3 (Export Data)
```

### State Management

#### receiptQueue Store
- **uploads**: Current queue items (transient)
- **completedUploads**: Upload history (persistent)
- Automatically saves to localStorage
- Available across all pages

#### Auth Store
- User authentication state
- Access token for API calls
- Shared across all pages

---

## 🎯 User Workflows

### Primary Workflow
1. **Login** → Land on Upload page
2. **Drop multiple receipts** → Watch queue process
3. **Navigate to Receipts** → View history with images
4. **Click upload** → See detection rectangles
5. **Click receipt** → View extracted data
6. **Navigate to Export** → Download CSV

### Quick Export Workflow
1. **Upload receipts** (Page 1)
2. **Navigate to Export** (Page 3)
3. **Click Download** → Get CSV immediately

### Review Workflow
1. **Navigate to Receipts** (Page 2)
2. **Browse upload history**
3. **Check detection quality** via marked images
4. **Review individual receipts**
5. **Verify extracted data**

---

## 🎨 Design Principles

### Page 1: Upload
- **Action-focused**: Large drop zone, clear CTAs
- **Status-oriented**: Immediate feedback on uploads
- **Minimal details**: No percentages, just states
- **Non-blocking**: Continue uploading while processing

### Page 2: Receipts
- **Visual-first**: Images prominently displayed
- **Data-rich**: All extracted information visible
- **Interactive**: Click to zoom, hover effects
- **Organized**: Sidebar navigation + detail view

### Page 3: Export
- **Educational**: Explains what you're exporting
- **Confident**: Clear button, success feedback
- **Informative**: Shows stats and format details
- **Helpful**: Usage tips and best practices

---

## 📱 Responsive Design

All three pages are responsive:
- **Desktop**: Full layout with sidebars
- **Tablet**: Adjusted grid layouts
- **Mobile**: Single column, stacked layout

---

## 🚀 Performance

### Optimizations
- **Lazy image loading**: Images loaded on demand
- **localStorage caching**: History persists across sessions
- **Background processing**: Queue doesn't block UI
- **Object URLs**: Efficient image handling
- **Cleanup**: Revoke URLs when no longer needed

### Bundle Size
- Total: ~124 KB (41 KB gzipped)
- CSS: ~24 KB (5.3 KB gzipped)
- Fast initial load, smooth navigation

---

## 🔐 Security

All pages require authentication:
- Redirect to login if not authenticated
- JWT tokens for API access
- Automatic token refresh
- Secure image loading with auth headers

---

## 🎉 Key Improvements Over Previous Design

1. **✅ No percentages** - Status-based tracking instead
2. **✅ Dedicated receipt history** - Separate page for browsing
3. **✅ Image preview** - See detection rectangles
4. **✅ Individual receipt view** - Detailed breakdown per receipt
5. **✅ Better organization** - Three focused pages instead of one cluttered dashboard
6. **✅ Export focus** - Dedicated page explains export value
7. **✅ Cleaner queue** - Simplified status without fake progress
8. **✅ Visual confirmation** - See exactly what was detected

---

## 📋 Summary

| Page | Focus | Key Feature |
|------|-------|-------------|
| **Upload** | Action | Large drop zone, real-time queue |
| **Receipts** | Review | Image gallery with detection rectangles |
| **Export** | Output | CSV download with usage guidance |

This three-page layout provides a clear, focused user experience for each stage of the receipt management workflow.
