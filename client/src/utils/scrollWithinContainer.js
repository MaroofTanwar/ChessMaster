export function scrollElementWithinContainer(container, target, { behavior = 'auto', align = 'nearest' } = {}) {
  if (!container || !target) return false;

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const currentTop = container.scrollTop;
  const targetTop = currentTop + targetRect.top - containerRect.top;
  const targetBottom = currentTop + targetRect.bottom - containerRect.top;
  let nextTop = currentTop;

  if (align === 'end') nextTop = Math.max(0, targetBottom - container.clientHeight);
  else if (targetRect.top < containerRect.top) nextTop = Math.max(0, targetTop);
  else if (targetRect.bottom > containerRect.bottom) nextTop = Math.max(0, targetBottom - container.clientHeight);
  else return false;

  if (Math.abs(nextTop - currentTop) < 0.5) return false;
  if (typeof container.scrollTo === 'function') container.scrollTo({ top: nextTop, behavior });
  else container.scrollTop = nextTop;
  return true;
}

export function scrollContainerToEnd(container, behavior = 'auto') {
  if (!container) return false;
  const nextTop = Math.max(0, container.scrollHeight - container.clientHeight);
  if (Math.abs(nextTop - container.scrollTop) < 0.5) return false;
  if (typeof container.scrollTo === 'function') container.scrollTo({ top: nextTop, behavior });
  else container.scrollTop = nextTop;
  return true;
}
