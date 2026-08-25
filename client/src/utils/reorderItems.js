import { getGiftCardProducts } from "../services/productService";

/**
 * Re-adds every item from a past order to the cart — but never more than
 * what's actually in stock at this moment. Stock can change between when
 * an order was placed and when someone hits "Reorder" later, so we always
 * re-check live availability rather than blindly trusting the old order's
 * quantity.
 *
 * Returns { addedAny, limitedItems } so the caller can show a heads-up
 * notice when a quantity had to be reduced (or an item skipped entirely
 * because it's now out of stock).
 */
export async function reorderItems(order, addToCart) {
  const { products } = await getGiftCardProducts();
  const stockByKey = new Map(products.map((p) => [`${p.brand}-${p.denomination}`, p.availableStock]));

  const limitedItems = [];
  let addedAny = false;

  (order.items || [])
    .filter((item) => item && item.denomination != null)
    .forEach((item) => {
      const key = `${item.brand}-${item.denomination}`;
      const available = stockByKey.get(key) ?? 0;
      const requested = item.quantity || 1;
      const toAdd = Math.min(requested, available);

      if (toAdd > 0) {
        addToCart(item.brand, item.denomination, toAdd, available);
        addedAny = true;
      }
      if (toAdd < requested) {
        limitedItems.push({
          brandName: item.brandName || item.brand,
          denomination: item.denomination,
          requested,
          available,
        });
      }
    });

  return { addedAny, limitedItems };
}
