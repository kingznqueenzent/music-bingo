export class FetchJsonError extends Error {
  readonly status: number
  readonly bodyText: string
  readonly parsed: unknown

  constructor(message: string, status: number, bodyText: string, parsed?: unknown) {
    super(message)
    this.name = 'FetchJsonError'
    this.status = status
    this.bodyText = bodyText
    this.parsed = parsed
  }
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim()
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  )
}

function previewBody(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= 280) return compact
  return `${compact.slice(0, 277)}...`
}

function parsedErrorMessage(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null
  const error = (parsed as { error?: unknown }).error
  return typeof error === 'string' && error.trim() ? error.trim() : null
}

function parseBodyJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

/**
 * Read a fetch Response as JSON without crashing on empty / HTML bodies
 * (413, 500, Vercel limit pages, etc.).
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const snippet = text.trim()
  const contentType = response.headers.get('content-type') ?? ''
  const isJsonType = /application\/json|application\/problem\+json/i.test(contentType)
  const canParse = Boolean(snippet) && (isJsonType || looksLikeJson(snippet))
  const parsed = canParse ? parseBodyJson(snippet) : undefined

  if (!response.ok) {
    throw new FetchJsonError(
      `Server returned status ${response.status}: ${
        parsedErrorMessage(parsed) || snippet || 'Empty response'
      }`,
      response.status,
      snippet,
      parsed
    )
  }

  if (response.status === 204 || response.status === 205) {
    return (parsed ?? {}) as T
  }

  if (!snippet) {
    throw new FetchJsonError(
      `Server returned status ${response.status}: Empty response`,
      response.status,
      ''
    )
  }

  if (!isJsonType && !looksLikeJson(snippet)) {
    throw new FetchJsonError(
      `Server returned status ${response.status}: ${previewBody(snippet) || 'Empty response'}`,
      response.status,
      snippet
    )
  }

  if (parsed === undefined) {
    throw new FetchJsonError(
      `Server returned status ${response.status}: ${previewBody(snippet) || 'Empty response'}`,
      response.status,
      snippet
    )
  }

  return parsed as T
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  return parseJsonResponse<T>(response)
}
