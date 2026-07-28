import { redirect } from 'next/navigation'

/** Legacy path — DJ site lives at the root URL */
export default function KingzLegacyRedirect() {
  redirect('/')
}
