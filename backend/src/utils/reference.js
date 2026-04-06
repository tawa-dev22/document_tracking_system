export function generateReferenceNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MOF-${y}-${rand}`;
}
