import { KingzNav } from '@/components/kingz/KingzNav'
import { KingzHero } from '@/components/kingz/KingzHero'
import { KingzAbout } from '@/components/kingz/KingzAbout'
import { KingzServices } from '@/components/kingz/KingzServices'
import { KingzGallery } from '@/components/kingz/KingzGallery'
import { KingzVideoGallery } from '@/components/kingz/KingzVideoGallery'
import { KingzTeam } from '@/components/kingz/KingzTeam'
import { KingzTestimonials } from '@/components/kingz/KingzTestimonials'
import { KingzLivestreams } from '@/components/kingz/KingzLivestreams'
import { KingzMerchHub } from '@/components/kingz/KingzMerchHub'
import { KingzMerchDrops } from '@/components/kingz/KingzMerchDrops'
import { KingzDjMerch } from '@/components/kingz/KingzDjMerch'
import { KingzSupportDJs } from '@/components/kingz/KingzSupportDJs'
import { KingzSocialEmbeds } from '@/components/kingz/KingzSocialEmbeds'
import { KingzBooking } from '@/components/kingz/KingzBooking'
import { KingzContact } from '@/components/kingz/KingzContact'
import { KingzFooter } from '@/components/kingz/KingzFooter'
import { KingzMusicPlayer } from '@/components/kingz/KingzMusicPlayer'
import { KingzPageClient } from '@/components/kingz/KingzPageClient'

export default function KingzHomePage() {
  return (
    <>
      <a href="#main-content" className="kingz-skip-link">
        Skip to main content
      </a>
      <KingzNav />
      <KingzPageClient>
        <main id="main-content" className="kingz-page-enter">
          <KingzHero />
          <KingzAbout />
          <KingzServices />
          <KingzGallery />
          <KingzVideoGallery />
          <KingzTeam />
          <KingzTestimonials />
          <KingzLivestreams />
          <KingzMerchHub />
          <KingzMerchDrops />
          <KingzDjMerch />
          <KingzSupportDJs />
          <KingzSocialEmbeds />
          <KingzBooking />
          <KingzContact />
        </main>
        <KingzFooter />
        <KingzMusicPlayer />
      </KingzPageClient>
    </>
  )
}
