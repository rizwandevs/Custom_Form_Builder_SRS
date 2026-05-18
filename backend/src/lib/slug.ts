export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = slugify(base) || 'form';
  let candidate = slug;
  let counter = 1;

  while (await exists(candidate)) {
    candidate = `${slug}-${counter}`;
    counter++;
  }

  return candidate;
}
