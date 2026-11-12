import { Link } from 'react-router-dom'
import Hero from '../components/Hero'
import { Reveal, Pill } from '../components/ui'

const FEATURES = [
  ['/alphabet', 'Alphabet', 'A–Z and a–z read by a CNN trained on EMNIST.'],
  ['/word', 'Word', 'Whole handwritten words read by a CRNN sequence model.'],
  ['/essay', 'Essay', 'TrOCR reads the page, an LLM fixes grammar and spelling, ReportLab makes the PDF.'],
  ['/insights', 'Insights', 'Scans, confidence and mistakes over time.'],
  ['/history', 'History', 'Every essay and scan, saved to your account.'],
]

export default function Home() {
  return (
    <>
      <Hero />
      <div className="relative">
        {/* soft handoff from the sky of the hero into the content */}
        <div className="pointer-events-none absolute inset-x-0 -top-32 h-32 bg-gradient-to-b from-transparent to-lilac/70" />

        <section className="mx-auto max-w-6xl px-5 pb-10 pt-28">

          <ul>
            {FEATURES.map(([to, title, text], i) => (
              <li key={to}>
                <Reveal delay={i * 70}>
                  <Link
                    to={to}
                    className="group -mx-4 grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 rounded-3xl border-t border-ink/15 px-4 py-7 transition-colors duration-700 ease-soft hover:bg-white/45 md:grid-cols-[4rem_1fr_20rem_auto]"
                  >
                    <span className="text-xs opacity-50">0{i + 1}</span>
                    <span className="font-display text-[clamp(1.9rem,4.5vw,3.5rem)] uppercase leading-none transition-transform duration-700 ease-soft group-hover:translate-x-3">{title}</span>
                    <span className="hidden text-sm leading-relaxed opacity-70 md:block">{text}</span>
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-mist transition duration-700 ease-soft group-hover:-rotate-45 group-hover:bg-jelly group-hover:text-ink">→</span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        
        <section className="px-5 pb-6 pt-14">
          <Reveal className="flex justify-center">
            <Pill to="/alphabet">Try it now</Pill>
          </Reveal>
        </section>
      </div>
    </>
  )
}