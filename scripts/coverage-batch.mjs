// @ts-check
/**
 * @template T, R
 * @param {readonly T[]} items
 * @param {(item: T) => Promise<R>} visit
 * @param {number} width
 * @returns {Promise<R[]>}
 */
export async function mapInBatches(items, visit, width = 4) {
  if (items.length === 0) return [];
  const batch = await Promise.all(items.slice(0, width).map(visit));
  const rest = await mapInBatches(items.slice(width), visit, width);
  return [...batch, ...rest];
}
