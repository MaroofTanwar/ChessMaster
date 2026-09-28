export function getAIUndoPlyCount(historyLength, humanColor) {
  const count = Math.max(0, Number(historyLength) || 0);
  if (humanColor === 'b') {
    if (count <= 1) return 0;
    return count % 2 === 0 ? 1 : 2;
  }
  if (count === 0) return 0;
  return count % 2 === 0 ? 2 : 1;
}
