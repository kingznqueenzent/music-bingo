'use client'

import Image from 'next/image'
import { TEAM } from '@/lib/kingz/data'
import { useKingzReveal } from './useKingzGsap'

export function KingzTeam() {
  const ref = useKingzReveal<HTMLElement>()

  return (
    <section id="team" ref={ref} className="kingz-section" aria-labelledby="team-heading">
      <div className="kingz-container text-center mb-14">
        <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
        <h2 id="team-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37]">
          Meet the DJs
        </h2>
      </div>

      <div className="kingz-container grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
        {TEAM.map((member, i) => (
          <article
            key={member.name}
            data-kingz-reveal
            className="kingz-card p-8 text-center"
            style={{ transform: i === 1 ? 'translateY(20px)' : undefined }}
          >
            <div className="relative w-36 h-36 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/60" aria-hidden />
              {/* Replace with Professional Photo of {member.name} — /assets/images/dj-*/}
              <Image
                src={member.image}
                alt={member.name}
                width={144}
                height={144}
                className="rounded-full object-cover w-full h-full p-1"
              />
            </div>
            <h3 className="kingz-heading text-2xl text-[#D4AF37] mb-1">{member.name}</h3>
            <p className="text-[#f5f5f5] text-sm mb-4">{member.title}</p>
            <p className="text-[#b0b0b0] text-sm leading-relaxed mb-5">{member.bio}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {member.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1 rounded-full border border-[#D4AF37]/30 text-[#f5d276]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
