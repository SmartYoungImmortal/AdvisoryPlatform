export function mergeQueryString(existing: URLSearchParams, overrides: Record<string, string>) {
  const params = new URLSearchParams(existing.toString());
  Object.entries(overrides).map(([key, value]) => {
    params.set(key, value);
  })

  return params.toString();
}
