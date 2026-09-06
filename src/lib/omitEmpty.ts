/** Never send a key with an undefined or empty-string value — omit it entirely rather than let the backend see e.g. `slug: ""`. */
export function omitEmptyOptionals<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === "") continue;
    (result as Record<string, unknown>)[key] = value;
  }
  return result;
}
