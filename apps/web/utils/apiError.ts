export function sanitizeError(err: unknown, status = 500) {
  // Log the full error elsewhere; only expose a generic message to the client
  const safeMessage = 'Internal server error';
  return { status, body: { error: safeMessage } };
}
