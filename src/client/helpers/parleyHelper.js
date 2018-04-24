export function getParleyCategory(category) {
  if (category === '' || category === undefined) return 'parley';

  if (!category.includes('parley-')) return `parley-${category}`;

  return category;
}

export function removeParleyFromTag(tag) {
  return tag.replace('parley-', '');
}
