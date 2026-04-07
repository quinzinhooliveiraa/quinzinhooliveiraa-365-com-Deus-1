let _hidden = false;
const _listeners = new Set<(v: boolean) => void>();

export function setNavHidden(v: boolean) {
  if (_hidden === v) return;
  _hidden = v;
  _listeners.forEach(l => l(v));
}

export function subscribeNavHidden(cb: (v: boolean) => void) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

export function getNavHidden() {
  return _hidden;
}
