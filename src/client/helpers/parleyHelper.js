import {PARLEY} from "../../common/constants/parley";

export function addParleyToCategory(category) {
  if (category === '' || category === undefined) return 'parley';

  if (!category.includes('parley-')) return `parley-${category}`;

  return category;
}

export function removeParleyFromCategory(category) {
  return category.replace('parley-', '');
}

export function removeParleyFromTags(tags) {
  const result = tags.map(tag => (removeParleyFromCategory(tag)));
  const index = result.indexOf(PARLEY);
  if (index > -1)
    result.splice(index, 1);
  return result;
}
