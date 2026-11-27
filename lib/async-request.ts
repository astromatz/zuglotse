export class RequestTimeoutError extends Error {}

/** Keep the timeout active until the entire response body has been read. */
export async function runRequest<T>(
  request: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
  timeoutMs = 45000
): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort(signal?.reason)
  if (signal?.aborted) abort()
  else signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(() => controller.abort(new RequestTimeoutError('Die Anfrage dauert zu lange. Bitte versuche es erneut.')), timeoutMs)
  try {
    controller.signal.throwIfAborted()
    return await request(controller.signal)
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
