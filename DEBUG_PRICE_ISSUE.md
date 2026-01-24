# Debug: $0.00 Price Issue

## Quick Diagnosis Steps

### 1. Open the App with Console
```bash
cd fin-vision-frontend
npm run dev
# Opens at http://localhost:5175
```

### 2. Open Browser Console
- Press F12 or Right-click → Inspect
- Go to **Console** tab
- Keep it open

### 3. Navigate to Receipts Page
1. Login to your account
2. Click "Receipts" in navigation
3. Click on ANY upload from the left sidebar

### 4. Check Console Logs

You'll see detailed logs. Look for these specific ones:

#### Log 1: Receipt Structure
```
📋 Receipts structure: {
  hasAll: true,
  allCount: 2,
  hasSuccessful: true,
  successfulCount: 2
}
```

#### Log 2: First Receipt Raw Data
```
🧾 FIRST RECEIPT RAW DATA: {
  id: 456,
  storeName: "Walmart",
  totalAmount: "45.67",    // ← CHECK THIS
  currency: "USD",         // ← AND THIS
  ...
}
```

#### Log 3: Price Fields Check
```
💰 Price fields check: {
  totalAmount: "45.67",         // ← Should be a string with number
  totalAmountType: "string",    // ← Should be "string"
  total: undefined,             // ← Should be undefined (we use totalAmount)
  totalType: "undefined",
  currency: "USD",              // ← Should exist
  currencyType: "string",       // ← Should be "string"
  allKeys: ["id", "storeName", "totalAmount", "currency", ...]  // ← All fields
}
```

#### Log 4: Line Item Data (if exists)
```
📦 FIRST LINE ITEM RAW DATA: {
  id: 789,
  description: "Milk",
  unitPrice: "3.99",      // ← CHECK THIS
  quantity: "1.000",      // ← AND THIS
  ...
}
```

#### Log 5: Line Item Price Fields
```
💵 Line item price fields: {
  price: undefined,           // ← Should be undefined
  priceType: "undefined",
  unitPrice: "3.99",          // ← Should have value
  unitPriceType: "string",    // ← Should be "string"
  quantity: "1.000",
  quantityType: "string",
  allKeys: ["id", "description", "unitPrice", "quantity", ...]
}
```

---

## What to Look For

### ❌ Problem 1: totalAmount is null/undefined
```
💰 Price fields check: {
  totalAmount: null,           // ← BAD!
  totalAmountType: "object"    // ← BAD!
}
```
**Cause:** Backend not providing totalAmount  
**Fix needed:** Backend issue

### ❌ Problem 2: totalAmount is wrong field name
```
💰 Price fields check: {
  totalAmount: undefined,      // ← BAD!
  total: "45.67",             // ← Different field name!
  allKeys: ["id", "total", "currency", ...]
}
```
**Cause:** API using `total` instead of `totalAmount`  
**Fix needed:** Frontend needs to use correct field name

### ❌ Problem 3: No currency field
```
💰 Price fields check: {
  totalAmount: "45.67",
  currency: undefined,         // ← BAD!
  currencyType: "undefined"
}
```
**Cause:** Backend not providing currency  
**Fix needed:** Backend issue OR frontend should default to USD

### ❌ Problem 4: Line items use wrong field
```
💵 Line item price fields: {
  price: "3.99",              // ← Wrong field name!
  unitPrice: undefined,       // ← We're looking for this
}
```
**Cause:** API using `price` instead of `unitPrice`  
**Fix needed:** Frontend needs to check `price` field too

### ❌ Problem 5: Numeric instead of string
```
💰 Price fields check: {
  totalAmount: 45.67,          // ← Number, not string
  totalAmountType: "number"    // ← Should be "string"
}
```
**Cause:** Backend sending numbers instead of strings  
**Fix needed:** Frontend can handle this (parseFloat works on both)

---

## Copy These Console Results

After you see the logs, **copy and paste** them here so I can see exactly what your API is returning.

Specifically copy:
1. The `🧾 FIRST RECEIPT RAW DATA:` log
2. The `💰 Price fields check:` log
3. The `📦 FIRST LINE ITEM RAW DATA:` log (if exists)
4. The `💵 Line item price fields:` log (if exists)

---

## Alternative: Use Test Page

If the console is too crowded, I created a test page for you:

1. Open `/tmp/test_api_response.html` in your browser
2. Login with your credentials
3. Enter an uploadId (e.g., 1, 2, 3...)
4. Click "Fetch Upload"
5. See the analysis section

This will show you exactly what fields exist and their types.

---

## Common Issues & Quick Fixes

### Issue: `totalAmount: null`
**Quick Fix:**
```typescript
// Check if backend uses different field name
{#if receipt.totalAmount}
  {formatCurrency(receipt.totalAmount, receipt.currency)}
{:else if receipt.total}
  {formatCurrency(receipt.total, receipt.currency)}
{:else}
  $0.00
{/if}
```

### Issue: `unitPrice: undefined` but `price` exists
**Quick Fix:**
```typescript
{@const itemPrice = item.unitPrice || item.price || 0}
```

### Issue: No `currency` field
**Quick Fix:**
```typescript
{formatCurrency(receipt.totalAmount, receipt.currency || 'USD')}
```

---

## Once You Share the Console Logs

I'll be able to:
1. ✅ See exactly what fields the API returns
2. ✅ Identify the mismatch
3. ✅ Provide the exact fix needed
4. ✅ Update the code to work with your actual API structure

---

## What I Need From You

**Just copy these 4 logs from your browser console:**

1. ```
   🧾 FIRST RECEIPT RAW DATA: { ... }
   ```

2. ```
   💰 Price fields check: { ... }
   ```

3. ```
   📦 FIRST LINE ITEM RAW DATA: { ... }
   ```

4. ```
   💵 Line item price fields: { ... }
   ```

Paste them in your next message and I'll fix it immediately!
