'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { SITEMAP_PAGES, formatSitemapMarkdown, formatSitemapSpec } from '@/lib/sitemap-pages'

export function SitemapClient() {
  const [exportStatus, setExportStatus] = useState('')
  const origin = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : 'https://lyricgrid.ca'),
    []
  )

  async function handleExportMarkdown() {
    const md = formatSitemapMarkdown(origin)
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'lyricgrid-sitemap-spec.md'
    anchor.click()
    URL.revokeObjectURL(url)
    setExportStatus('Downloaded lyricgrid-sitemap-spec.md')
    window.setTimeout(() => setExportStatus(''), 4000)
  }

  async function handleExportText() {
    const text = formatSitemapSpec(origin)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'lyricgrid-sitemap-spec.txt'
    anchor.click()
    URL.revokeObjectURL(url)
    setExportStatus('Downloaded lyricgrid-sitemap-spec.txt')
    window.setTimeout(() => setExportStatus(''), 4000)
  }

  async function handleCopyForGoogleDoc() {
    const md = formatSitemapMarkdown(origin)
    try {
      await navigator.clipboard.writeText(md)
      setExportStatus('Copied to clipboard — paste into Google Docs')
    } catch {
      setExportStatus('Copy failed — use Download instead')
    }
    window.setTimeout(() => setExportStatus(''), 5000)
  }

  const sections = ['Core', 'Host', 'Player', 'Admin', 'Marketing'] as const

  return (
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-10 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sitemap</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Admin directory of LyricGrid routes. Export a spec for Google Docs or offline reference.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyForGoogleDoc}
            className="rounded-full bg-[#00FFFF] hover:bg-cyan-300 text-[#121212] font-semibold px-4 py-2 text-sm"
          >
            Copy for Google Doc
          </button>
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="rounded-full border border-[#00FFFF]/40 text-[#00FFFF] hover:bg-[#00FFFF]/10 font-semibold px-4 py-2 text-sm"
          >
            Download .md
          </button>
          <button
            type="button"
            onClick={handleExportText}
            className="rounded-full border border-white/20 text-slate-300 hover:bg-white/5 font-semibold px-4 py-2 text-sm"
          >
            Download .txt
          </button>
        </div>
      </div>

      {exportStatus ? <p className="text-emerald-400 text-sm mb-6">{exportStatus}</p> : null}

      <div className="space-y-8">
        {sections.map((section) => {
          const pages = SITEMAP_PAGES.filter((p) => p.section === section)
          if (pages.length === 0) return null
          return (
            <section key={section}>
              <h2 className="text-xs uppercase tracking-[0.25em] text-[#00FFFF]/70 mb-3">{section}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {pages.map((page) => {
                  const Icon = page.icon
                  const url = `${origin}${page.href}`
                  return (
                    <article
                      key={page.href}
                      className="rounded-xl border border-white/10 bg-[#1E1E1E] p-4 hover:border-[#00FFFF]/25 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-[#00FFFF]/10 p-2 shrink-0">
                          <Icon className="h-5 w-5 text-[#00FFFF]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-white mb-1">{page.label}</h3>
                          <p className="text-slate-400 text-xs leading-relaxed mb-2">{page.description}</p>
                          <Link
                            href={page.href}
                            className="text-[#00FFFF] text-xs font-mono break-all hover:underline"
                          >
                            {url}
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
