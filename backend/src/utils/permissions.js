function getSafeId(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj._id) return String(obj._id);
  return String(obj);
}

export function isSender(user, document) {
  const userId = getSafeId(user);
  const senderId = getSafeId(document.sender);
  return userId === senderId;
}

export function isCurrentHandler(user, document) {
  if (!document.currentHandler) return false;
  const userId = getSafeId(user);
  const handlerId = getSafeId(document.currentHandler);
  return userId === handlerId;
}

export function canManageDocument(user, document) {
  const userId = getSafeId(user);
  return (
    isCurrentHandler(user, document) ||
    document.recipients?.some((u) => getSafeId(u) === userId)
  );
}

export function canAnnotateDocument(user, document) {
  return canManageDocument(user, document);
}

export function isDocumentManager(user, document) {
  return canManageDocument(user, document);
}

export function canAccessDocument(user, document) {
  if (user.role === 'ADMIN') return true;
  const userId = getSafeId(user);
  
  return (
    isSender(user, document) ||
    isCurrentHandler(user, document) ||
    document.assignedUsers?.some((u) => getSafeId(u) === userId) ||
    document.recipients?.some((u) => getSafeId(u) === userId)
  );
}

export function canUpdateWorkflow(user, document) {
  return canManageDocument(user, document);
}
