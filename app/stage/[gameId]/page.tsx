import { StageView } from './StageView'

export default async function StagePage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  return (
    <main className="min-h-screen w-full overflow-hidden bg-[#121212] text-white">
      <StageView gameId={gameId} />
    </main>
  )
}
