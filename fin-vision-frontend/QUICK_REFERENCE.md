# Quick Reference Guide

## 🚀 Getting Started

```bash
cd fin-vision-frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

Ensure backend is running: `http://localhost:3000`

---

## 📄 Three Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Upload** | `/` | Drop receipts, monitor queue |
| **Receipts** | `/receipts` | View history with images |
| **Export** | `/export` | Download CSV data |

---

## 🎯 Key Features Per Page

### Page 1: Upload
- Drop multiple images at once
- Status tracking (no percentages)
- Queue stats: Queued, Processing, Complete, Failed
- Remove items, clear completed

### Page 2: Receipts
- Upload history sidebar
- Detection preview (red rectangles)
- Individual receipt images
- Click to zoom full-screen
- Status badges per receipt

### Page 3: Export
- Download CSV button
- Statistics overview
- What's included guide
- Usage tips

---

## 📊 Status Indicators

| Icon | Status | Meaning |
|------|--------|---------|
| 🕐 | Queued | Waiting to start |
| 🔄 | Uploading | Sending to server |
| 🔄 | Processing | AI analyzing |
| ✅ | Complete | Successfully processed |
| ❌ | Failed | Processing error |

---

## 🖼️ Image Features

- **Detection Preview**: See red rectangles around found receipts
- **Thumbnails**: Quick preview in receipt list
- **Click to Zoom**: Full-screen modal
- **ESC to Close**: Keyboard shortcut for modal

---

## 💾 Data Storage

- **Authentication**: JWT in memory, refresh token in HttpOnly cookie
- **Upload History**: localStorage (persistent across sessions)
- **Images**: Fetched with auth headers on demand

---

## 🔑 Navigation Shortcuts

- **Logo**: Click to go home (Upload page)
- **Upload**: `/` - Main upload interface
- **Receipts**: `/receipts` - Browse history
- **Export**: `/export` - Download CSV
- **Logout**: Clears all session data

---

## 📥 CSV Export

**File Name**: `fin-vision-receipts-YYYY-MM-DD.csv`

**Includes**:
- Receipt metadata (ID, merchant, total, tax, date)
- Line items (description, quantity, price)
- Status information
- Keywords/tags

---

## 🔧 Common Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production
npm run preview

# Type check
npm run check
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect to API | Check backend is on `http://localhost:3000` |
| CORS errors | Configure backend CORS for `localhost:5173` |
| Login fails | Check browser console for details |
| Images not loading | Verify JWT token is valid |
| No history showing | Check localStorage isn't full |

---

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

---

## 🎨 Design Philosophy

1. **No fake progress** - Status-based tracking only
2. **Visual confirmation** - Show detection rectangles
3. **Focused pages** - One purpose per page
4. **Clean interface** - Minimal clutter
5. **Educational** - Explain what happens

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | Complete documentation |
| `THREE_PAGE_LAYOUT.md` | Page structure details |
| `REDESIGN_SUMMARY.md` | Redesign overview |
| `QUICK_REFERENCE.md` | This file |
| `PAGE_STRUCTURE.txt` | Visual ASCII diagram |

---

## ✅ Success Checklist

Before going live:
- [ ] Backend API running
- [ ] CORS configured
- [ ] Environment variables set
- [ ] Build succeeds (`npm run build`)
- [ ] Test upload flow
- [ ] Test receipt history
- [ ] Test CSV export
- [ ] Test on mobile

---

## 🚀 Production Deployment

1. Build: `npm run build`
2. Deploy `dist/` folder to:
   - Netlify
   - Vercel
   - Static hosting
3. Update backend CORS with production URL
4. Configure environment variables if needed

---

## 💡 Tips

- Upload multiple receipts at once for efficiency
- Check receipt history to verify detection quality
- Export regularly for backups
- Clear completed uploads to free up space
- Use keyboard shortcuts (ESC to close modals)

---

**Questions?** Check the full README.md or THREE_PAGE_LAYOUT.md
