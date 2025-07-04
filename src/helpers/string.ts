export function removeBrackets(str: string) {
  return str.replace(/^\[(.*)\]$/, '$1');
}

export function checkPartialStringsMatch(str1: string, str2: string): boolean {
  if (!str1 || !str2) return false;
  return str1 === str2 || str1.includes(str2) || str2.includes(str1);
}

export function extractNumbers(str: string): string {
  return str.match(/\d+/g)?.join('') || '';
}