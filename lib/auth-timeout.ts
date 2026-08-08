export class AuthTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds. Check your network or Supabase configuration.`)
    this.name = 'AuthTimeoutError'
  }
}

/** Reject if `promise` does not settle within `timeoutMs`. */
export function withAuthTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new AuthTimeoutError(label, timeoutMs)), timeoutMs)
    }),
  ])
}
