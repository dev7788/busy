export function addParleyToCategory(category) {
  if (category === '' || category === undefined) return 'parley';

  if (!category.includes('parley-')) return `parley-${category}`;

  return category;
}

export function removeParleyFromCategory(category) {
  return category.replace('parley-', '');
}
