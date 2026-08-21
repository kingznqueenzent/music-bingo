import { KingzNav } from '@/components/kingz/KingzNav'
import { KingzHero } from '@/components/kingz/KingzHero'
import { KingzAbout } from '@/components/kingz/KingzAbout'
import { KingzServices } from '@/components/kingz/KingzServices'
import { KingzFeaturedEvent } from '@/components/kingz/KingzFeaturedEvent'
import { KingzServiceArea } from '@/components/kingz/KingzServiceArea'
import { KingzWeddingPackages } from '@/components/kingz/KingzWeddingPackages'
import { KingzGallery } from '@/components/kingz/KingzGallery'
import { KingzVideoGallery } from '@/components/kingz/KingzVideoGallery'
import { KingzTeam } from '@/components/kingz/KingzTeam'
import { KingzLivestreams } from '@/components/kingz/KingzLivestreams'
import { KingzMerchHub } from '@/components/kingz/KingzMerchHub'
import { KingzSupportDJs } from '@/components/kingz/KingzSupportDJs'
import { KingzBooking } from '@/components/kingz/KingzBooking'
import { KingzContact } from '@/components/kingz/KingzContact'
import { KingzFooter } from '@/components/kingz/KingzFooter'
import { KingzPageClient } from '@/components/kingz/KingzPageClient'

export default function KingzHomePage() {
  return (
    <>
      <a href="#main-content" className="kingz-skip-link">
        Skip to main content
      </a>
      <KingzNav />
      <KingzPageClient>
        <main id="main-content" className="kingz-page-enter pb-24 md:pb-0">
          <KingzHero />
          <KingzAbout />
          <KingzServices />
          <KingzFeaturedEvent />
          <KingzServiceArea />
          <KingzWeddingPackages />
          <KingzTeam />
          <KingzGallery />
          <KingzVideoGallery />
          <KingzLivestreams />
          <KingzMerchHub />
          <KingzSupportDJs />
          <KingzBooking />
          <KingzContact />
        </main>
        <KingzFooter />
      </KingzPageClient>
    </>
  )
}
