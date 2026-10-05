// PostgREST embeds (e.g. `businesses(name)`) come back as an object or a one-element array
// depending on the relationship, and are untyped without generated Supabase types.
export type Rel<T> = T | T[] | null;
export type BusinessCategoriesRel = Rel<{ categories: Rel<{ name: string }> }>;

export const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);
export const many = <T,>(v: T | T[] | null | undefined): T[] => (Array.isArray(v) ? v : v ? [v] : []);

export const categoryNames = (rel: BusinessCategoriesRel | undefined) =>
  many(rel).map((bc) => one(bc.categories)?.name).filter((n): n is string => !!n);
