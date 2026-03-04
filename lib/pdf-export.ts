/**
 * Generate a PDF of bingo cards for Print Mode (2 or 4 per page).
 * Uses jspdf; run in browser only.
 */
import type { CardForPdf } from '@/app/actions/game'

export async function generateBingoCardsPdf(
  gameCode: string,
  cards: CardForPdf[],
  cardsPerPage: 2 | 4,
  logoUrl: string | null
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 10
  const gap = 8

  const perRow = cardsPerPage === 4 ? 2 : 1
  const perCol = cardsPerPage === 4 ? 2 : 2
  const cardW = (pageW - 2 * margin - (perRow - 1) * gap) / perRow
  const cardH = (pageH - 2 * margin - (perCol - 1) * gap) / perCol

  let cardIndex = 0
  for (let row = 0; row < perCol; row++) {
    for (let col = 0; col < perRow; col++) {
      if (cardIndex >= cards.length) break
      const card = cards[cardIndex]
      const x = margin + col * (cardW + gap)
      const y = margin + row * (cardH + gap)
      drawCard(doc, card, x, y, cardW, cardH, gameCode, logoUrl, row === 0 && col === 0)
      cardIndex++
    }
  }

  while (cardIndex < cards.length) {
    doc.addPage()
    for (let row = 0; row < perCol; row++) {
      for (let col = 0; col < perRow; col++) {
        if (cardIndex >= cards.length) break
        const card = cards[cardIndex]
        const x = margin + col * (cardW + gap)
        const y = margin + row * (cardH + gap)
        drawCard(doc, card, x, y, cardW, cardH, gameCode, logoUrl, false)
        cardIndex++
      }
    }
  }

  doc.save(`bingo-cards-${gameCode}.pdf`)
}

function drawCard(
  doc: import('jspdf').jsPDF,
  card: CardForPdf,
  x: number,
  y: number,
  w: number,
  h: number,
  gameCode: string,
  logoUrl: string | null,
  drawLogo: boolean
) {
  const pad = 2
  const titleH = 8
  doc.setFontSize(8)
  doc.text(`Game: ${gameCode}`, x + pad, y + 5)
  doc.text(card.playerName, x + w - pad - doc.getTextWidth(card.playerName), y + 5)

  const gridTop = y + titleH
  const gridSize = card.gridSize
  const cellW = (w - 2 * pad) / gridSize
  const cellH = (h - titleH - 2 * pad) / gridSize
  const fontSize = gridSize === 5 ? 5 : 6

  doc.setFontSize(fontSize)
  for (let i = 0; i < card.cells.length; i++) {
    const row = Math.floor(i / gridSize)
    const col = i % gridSize
    const cx = x + pad + col * cellW
    const cy = gridTop + pad + row * cellH
    doc.rect(cx, cy, cellW, cellH)
    const label = card.cells[i]?.label ?? '—'
    const lines = wrapText(doc, label, cellW - 2)
    const lineH = cellH / Math.max(lines.length, 1)
    lines.forEach((line, k) => {
      doc.text(line, cx + 1, cy + lineH * (k + 1) - 1)
    })
  }

  if (drawLogo && logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', x + w - 18, y - 2, 12, 12)
    } catch {
      // ignore if image fails to load
    }
  }
}

function wrapText(doc: import('jspdf').jsPDF, text: string, maxW: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (doc.getTextWidth(test) <= maxW) {
      line = test
    } else {
      if (line) lines.push(line)
      line = word.length * (doc.getTextWidth('M') * 0.6) > maxW ? word.slice(0, Math.floor(maxW / (doc.getTextWidth('M') * 0.6))) : word
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : [text.slice(0, 8)]
}
