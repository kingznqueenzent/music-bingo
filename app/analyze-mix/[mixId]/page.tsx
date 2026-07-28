import { MixReportClient } from './MixReportClient'

export default async function MixReportPage({
  params,
}: {
  params: Promise<{ mixId: string }>
}) {
  const { mixId } = await params
  return <MixReportClient mixId={mixId} />
}
