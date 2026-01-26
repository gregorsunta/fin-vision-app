# Fin Vision Frontend

A modern Svelte-based frontend application for receipt management with AI-powered OCR.

## Features

- 🔐 **Email & Password Authentication** - Secure user registration and login
- 📤 **Multi-Receipt Upload** - Upload unlimited receipts with drag-and-drop
- 🔄 **Background Processing** - Async queue system with real-time status tracking
- 🖼️ **Visual Receipt History** - View all uploads with detection rectangles and images
- 🤖 **AI Processing** - Automatic receipt detection, splitting, and data extraction
- 📊 **CSV Export** - Download all receipts and items for Excel/accounting software
- 🎨 **Modern Three-Page Layout** - Clean, focused interface for each workflow
- ⚡ **Fast & Responsive** - Powered by Vite and Svelte

## Tech Stack

- **Framework**: Svelte with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide Svelte
- **API Client**: Custom fetch-based client with auto token refresh

## Prerequisites

- Node.js (v20.17.0 or higher recommended)
- npm or yarn
- Backend API running on `http://localhost:3000`

## Installation

1. Install dependencies:
```bash
cd fin-vision-frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Configuration

### API Endpoint

The frontend proxies API requests to `http://localhost:3000`. To change this, update the `vite.config.ts` file:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://your-backend-url:port',
      changeOrigin: true,
    },
  },
}
```

## Application Structure

### Three-Page Layout

The application is organized into three focused pages:

#### 📤 Page 1: Upload (Home)
- **Large drop zone** for drag-and-drop uploads
- **Processing queue** with real-time status (no percentages)
- **Status indicators**: Queued → Uploading → Processing → Complete/Failed
- **Quick stats**: See queued, processing, completed, and failed counts
- Upload unlimited receipts simultaneously

#### 📄 Page 2: Receipts
- **Upload history** with all previous uploads
- **Detection preview** showing red rectangles around found receipts
- **Individual receipt view** with:
  - Thumbnail images (click to zoom)
  - Extracted data (merchant, total, tax, items)
  - Status badges (Success/Issues/Failed)
- **Image modal** for full-screen viewing
- Statistics: Detected, successful, with issues, failed

#### 📥 Page 3: Export
- **CSV export** with one-click download
- **Statistics overview** of all receipts
- **What's included** - Details on exported data structure
- **Usage tips** - How to use your export in Excel, accounting software
- **Format details** - Technical specifications

For complete details, see [THREE_PAGE_LAYOUT.md](./THREE_PAGE_LAYOUT.md)

## Usage

### Quick Start Workflow

1. **Register/Login** - Create account or sign in
2. **Upload Receipts** (Page 1) - Drop multiple receipt images
3. **View History** (Page 2) - Browse uploads, see detection rectangles, review data
4. **Export Data** (Page 3) - Download CSV for Excel or accounting software

### Detailed Usage

#### Registration & Login
1. Open the application in your browser
2. Click "Sign up" to create a new account
3. Enter your email and password (must meet security requirements)
4. After registration, you'll be automatically logged in

#### Uploading Receipts
1. Navigate to the **Upload** page (home)
2. Drag and drop receipt images or click "Select Files"
3. Upload multiple receipts at once - they process in the background
4. Monitor the queue showing:
   - Queued, Processing, Complete, Failed counts
   - Status for each upload (no inaccurate percentages)
   - Success/failure details
5. The system automatically:
   - Detects multiple receipts in one image
   - Splits them into individual receipts
   - Extracts merchant name, total, tax, date, line items

#### Viewing Receipt History
1. Navigate to the **Receipts** page
2. Select an upload from the sidebar
3. View the marked image showing detection rectangles
4. Scroll through individual receipts with:
   - Thumbnail images (click to zoom full-screen)
   - Extracted data and line items
   - Status indicators for each receipt
5. Click any image to view full-size in modal

#### Exporting Data
1. Navigate to the **Export** page
2. View statistics of your receipt data
3. Click "Download CSV" button
4. File downloads as `fin-vision-receipts-YYYY-MM-DD.csv`
5. Open in Excel, Google Sheets, or import to accounting software

#### Logout
Click the "Logout" button in the navigation bar to securely sign out.

## Project Structure

```
fin-vision-frontend/
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   └── client.ts          # API client with auth & receipt endpoints
│   │   ├── components/
│   │   │   ├── Button.svelte      # Reusable button component
│   │   │   ├── Input.svelte       # Input field component
│   │   │   ├── Label.svelte       # Label component
│   │   │   ├── Card.svelte        # Card container component
│   │   │   ├── Login.svelte       # Login form
│   │   │   ├── Register.svelte    # Registration form
│   │   │   └── Navigation.svelte  # Top navigation bar
│   │   ├── pages/
│   │   │   ├── UploadPage.svelte  # Page 1: Upload with queue
│   │   │   ├── ReceiptsPage.svelte # Page 2: Receipt history with images
│   │   │   └── ExportPage.svelte  # Page 3: CSV export
│   │   ├── stores/
│   │   │   ├── auth.ts            # Authentication state management
│   │   │   └── receiptQueue.ts    # Upload queue & history management
│   │   ├── services/
│   │   │   └── queueProcessor.ts  # Background upload processor
│   │   └── utils/
│   │       └── cn.ts              # Class name utility
│   ├── App.svelte                 # Root component with routing
│   ├── main.ts                    # Application entry point
│   └── app.css                    # Global styles and Tailwind
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── THREE_PAGE_LAYOUT.md           # Three-page structure documentation
└── package.json                   # Dependencies and scripts
```

## API Integration

The application integrates with the following API endpoints:

- `POST /api/users` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Token refresh
- `POST /api/image/split-and-analyze` - Upload and process receipt
- `GET /api/users/me/receipts/export-csv` - Export receipts to CSV
- `GET /api/files/:filename` - Retrieve receipt images

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run TypeScript checks

### Code Style

The project uses TypeScript for type safety and follows Svelte best practices.

## Security Features

- Secure JWT-based authentication
- HttpOnly cookies for refresh tokens
- Automatic token refresh on expiration
- Protected API routes
- Password validation (min 8 chars, uppercase, lowercase, number, special char)

## Future Enhancements

- 🔐 Google OAuth integration
- 📱 Mobile-responsive improvements
- 🔍 Search and filter receipts
- 📈 Analytics and spending insights
- 🏷️ Custom tagging system
- 🌙 Dark mode toggle

## Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure your backend API has the correct CORS configuration to allow requests from `http://localhost:5173`.

### API Connection Failed

1. Verify the backend is running on `http://localhost:3000`
2. Check the proxy configuration in `vite.config.ts`
3. Ensure no firewall is blocking the connection

### Build Errors

If you encounter build errors, try:
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## License

This project is part of the Fin Vision receipt management system.
