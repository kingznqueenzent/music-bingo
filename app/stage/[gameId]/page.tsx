import { StageView } from './StageView'

export default async function StagePage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  return (
    <main className="min-h-screen bg-black text-white">
      <StageView gameId={gameId} />
    </main>
  )
}
