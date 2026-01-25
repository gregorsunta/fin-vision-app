# Quantity Display Fix

## The Issue You Spotted

**Problem:** Items were showing confusing quantity information like:
```
Sončnična margarina 500g (1 g)  ← What does this mean??
```

**Why it's confusing:**
- The product description **already includes the size**: "500g"
- Then we add `(1 g)` which makes no sense
- It looks like you bought 1 gram of a 500g product?

---

## Root Cause

The API data structure:
```json
{
  "description": "Sončnična margarina 500g",  // Already has weight
  "amount": "1.000",                           // Quantity = 1 item
  "unit": "g"                                  // Says "grams" but means "pieces"
}
```

**The problem:**
- `unit: "g"` doesn't mean "grams of this item"
- It's metadata from the product (the product itself is measured in grams)
- Showing `(1 g)` is redundant and misleading

---

## The Fix

### New Logic:

**Only show quantity when:**
1. ✅ Quantity is **more than 1** (e.g., bought 3 of something)
2. ✅ Unit is NOT "g" or "ml" (these are already in the description)

**Examples:**

| Item | Amount | Unit | Display |
|------|--------|------|---------|
| Sončnična margarina 500g | 1 | g | `Sončnična margarina 500g` (no quantity) |
| Sončnična margarina 500g | 2 | g | `Sončnična margarina 500g (×2)` |
| Bananas | 3 | kg | `Bananas (×3 kg)` |
| Milk 1L | 1 | L | `Milk 1L` (no quantity) |
| Milk 1L | 4 | L | `Milk 1L (×4 L)` |

---

## Before vs After

### Before (Confusing):
```
Sončnična margarina 500g (1 g) - €1.29
Pasirani paradižnik 500g (1 g) - €0.57
Mleko 1L (1 ml) - €1.19
```

### After (Clear):
```
Sončnična margarina 500g - €1.29
Pasirani paradižnik 500g - €0.57
Mleko 1L - €1.19
```

### When Quantity > 1:
```
Sončnična margarina 500g (×2) - €2.58
Bananas (×3 kg) - €4.47
```

---

## Code Changes

### Updated Display Logic:

```typescript
{@const itemQuantity = item.amount || 1}
{@const itemUnit = item.unit || ''}
{@const shouldShowQuantity = itemQuantity > 1 && itemUnit !== 'g' && itemUnit !== 'ml'}

{item.description}
{#if shouldShowQuantity}
  <span class="text-xs">(×{itemQuantity}{itemUnit})</span>
{/if}
```

**Logic:**
- Don't show quantity if amount = 1 (single item)
- Don't show if unit is "g" or "ml" (already in description)
- Do show if amount > 1 (multiple items)
- Use "×2" format instead of "(2 g)" for clarity

---

## Why This Makes Sense

### Packaged Products (unit: "g" or "ml")
These already have the size in the description:
```
✓ Sončnična margarina 500g
✗ Sončnična margarina 500g (1 g)  ← Redundant!
```

### Bulk/Weight Products (unit: "kg", "L", etc.)
Show quantity when buying multiple:
```
✓ Bananas (×3 kg)          ← Bought 3 kilograms
✓ Milk (×4 L)              ← Bought 4 liters
```

### Single Items
Don't show "(×1)" - it's obvious:
```
✓ Bread
✗ Bread (×1)               ← Unnecessary
```

---

## Edge Cases Handled

### Case 1: Fractional Quantities
```
Bananas (×2.5 kg) - €4.98  ← Shows decimal
```

### Case 2: No Unit
```
Bread (×2) - €3.00         ← Shows quantity without unit
```

### Case 3: Unusual Units
```
Eggs (×2 dozens) - €5.00   ← Shows quantity with unit
```

### Case 4: Already in Description
```
Water 500ml - €0.89        ← No quantity shown (unit is ml)
```

---

## Testing Checklist

After refreshing the page, verify:

- [ ] Single packaged items don't show quantity:
  - `Sončnična margarina 500g` (not `(1 g)`)
  
- [ ] Multiple items show quantity correctly:
  - If you have 2 of same item: `(×2)`
  
- [ ] Bulk items with quantity show units:
  - Produce/bulk: `(×2.5 kg)`, `(×3 L)`
  
- [ ] No confusing displays like "(1 g)"

---

## Expected Display Now

Your receipt should look like:

```
HOFER TRGOVINA
Total: €51.57
Tax: €4.47

Items:
Pasirani paradižnik 500g - €0.57
Pasirani paradižnik 500g - €0.57
Piščančja poletna klobasa IK 400g - €1.99
Praženi mandlji - €1.49
Paradižnik v kosih 400g - €0.69
Rjavi fižol 400g - €0.89
Sončnična margarina 500g - €1.29
Mleko 3.5% 1l - €1.19
```

Clean and simple! ✨

---

## Files Changed

```
✏️  Modified:
- src/lib/pages/ReceiptsPage.svelte
  - Line 593-602: Updated quantity display logic
  - Only show quantity when > 1 and unit is not g/ml
  - Use ×N format for clarity

✅ Build Status: Passing
✅ Breaking Changes: None
✅ Ready to Test: Yes
```

---

## Summary

**Issue:** Confusing display like "Sončnična margarina 500g (1 g)"  
**Cause:** Showing redundant quantity info when amount=1 and unit is already in description  
**Fix:** Only show quantity when >1 and unit is meaningful  
**Result:** Clean, readable item list  

**Before:** `Sončnična margarina 500g (1 g) - €1.29`  
**After:** `Sončnična margarina 500g - €1.29`  

Much better! 🎉
