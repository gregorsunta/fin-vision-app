# Quick Start Guide

## Getting Started in 3 Steps

### 1. Install Dependencies
```bash
cd fin-vision-frontend
npm install
```

### 2. Start the Backend API
Make sure your backend API is running on `http://localhost:3000`. The frontend expects these endpoints to be available:
- POST `/api/users` - Registration
- POST `/api/auth/login` - Login
- POST `/api/image/split-and-analyze` - Upload receipts
- GET `/api/users/me/receipts/export-csv` - Export CSV

### 3. Start the Frontend
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`

## First Time Usage

1. **Register**: Click "Sign up" and create an account with:
   - Valid email address
   - Password (minimum 8 characters, must include uppercase, lowercase, number, and special character)

2. **Upload Receipt**: 
   - Drag and drop a receipt image, or
   - Click "Select File" to browse

3. **View Results**: See extracted data including:
   - Merchant name
   - Total amount and tax
   - Individual line items
   - Transaction date

4. **Export Data**: Click "Download CSV" to export all receipts to Excel

## Configuration

### Change Backend URL
Edit `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://your-backend:port',
      changeOrigin: true,
    },
  },
}
```

## Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

To preview the production build:
```bash
npm run preview
```

## Troubleshooting

**Problem**: Can't connect to API  
**Solution**: Ensure backend is running on `http://localhost:3000`

**Problem**: CORS errors  
**Solution**: Configure CORS on your backend to allow `http://localhost:5173`

**Problem**: Login fails  
**Solution**: Check browser console for detailed error messages

## Features Overview

- ✅ Email/password authentication
- ✅ Drag-and-drop receipt upload
- ✅ AI-powered receipt processing
- ✅ Multi-receipt detection and splitting
- ✅ Real-time data extraction
- ✅ CSV export for Excel
- ✅ Responsive design
- ✅ Automatic token refresh
- ✅ Secure HttpOnly cookies

## Next Steps

- Upload your first receipt
- Export your data to CSV
- Explore the extracted line items
- Track your expenses over time

For detailed documentation, see [README.md](./README.md)
