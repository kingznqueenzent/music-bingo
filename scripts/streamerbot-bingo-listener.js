/**
 * Streamer.bot WebSocket listener for BINGO claims.
 *
 * Setup:
 * 1. In Streamer.bot: Add a WebSocket server (or use existing).
 * 2. Configure this script to connect to that WebSocket.
 * 3. When Streamer.bot receives a "Bingo" message from any platform (Twitch, Kick, etc.),
 *    have it send an event this script listens for, or run this script as a subprocess
 *    that receives chat via stdin/HTTP and calls your app's verify API.
 *
 * Alternative: Streamer.bot can call your API directly with "Run a program" or "Make a request".
 * In that case, create an Action that triggers on chat message containing "BINGO",
 * then "Make a request" to:
 *   POST https://your-app-url/api/verify-bingo
 *   Body: { "gameId": "{{gameId}}", "playerIdentifier": "{{user.Name}}" }
 *
 * This script is for a Node-based listener that connects to Streamer.bot's WebSocket
 * and forwards BINGO claims to your Next.js API.
 */

const WebSocket = require('ws')

const WS_URL = process.env.STREAMERBOT_WS_URL || 'ws://127.0.0.1:8080/'
const APP_VERIFY_URL = process.env.BINGO_VERIFY_URL || 'http://localhost:3000/api/verify-bingo'
const GAME_ID = process.env.BINGO_GAME_ID || ''

if (!GAME_ID) {
  console.warn('BINGO_GAME_ID not set. Set it to the current game UUID for verification to work.')
}

const ws = new WebSocket(WS_URL)

ws.on('open', () => {
  console.log('Connected to Streamer.bot')
})

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString())
    const event = msg.event?.type ?? msg.type
    const args = msg.data ?? msg

    if (event === 'TwitchMessage' || event === 'ChatMessage' || event === 'Message') {
      const text = (args.message ?? args.text ?? args.content ?? '').trim().toUpperCase()
      const user = args.userName ?? args.user?.name ?? args.username ?? args.displayName ?? ''

      if (text === 'BINGO' && user && GAME_ID) {
        verifyBingo(user)
      }
    }
  } catch (_) {
    // ignore parse errors
  }
})

async function verifyBingo(playerIdentifier) {
  try {
    const res = await fetch(APP_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: GAME_ID,
        playerIdentifier,
      }),
    })
    const data = await res.json()
    if (data.valid) {
      console.log(`BINGO valid for ${playerIdentifier}`)
      // Optional: send to Streamer.bot to trigger "Winner" action
    } else {
      console.log(`BINGO invalid for ${playerIdentifier}: ${data.error || 'No winning line'}`)
    }
  } catch (e) {
    console.error('Verify request failed:', e.message)
  }
}

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message)
})

ws.on('close', () => {
  console.log('Disconnected. Restart the script to reconnect.')
})
