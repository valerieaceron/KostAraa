export function titleCaseName(value, fallback = '') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text.split(/\s+/).map((word) => {
    if (/\d/.test(word)) return word.toUpperCase();
    return word.toLocaleLowerCase().replace(/(^|[-/('])([a-z])/g, (_, boundary, letter) => `${boundary}${letter.toUpperCase()}`);
  }).join(' ');
}
