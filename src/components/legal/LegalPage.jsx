import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Navbar from '../Navbar'
import AuroraBackground from '../AuroraBackground'
import { Footer } from '../ui/footer-section'
import { renderLegalMarkdown } from '../../lib/markdown'
import { sanitizeHtml } from '../../lib/utils'
import privacyMd from '../../../PRIVACY_POLICY.md?raw'
import termsMd from '../../../TERMS_OF_USE.md?raw'

// The legal documents live at the repository root and stay the single source
// of truth: the pages render them as shipped, never a divergent copy.
const DOCS = {
  privacy: { markdown: privacyMd, titleKey: 'legal.privacyTitle' },
  terms: { markdown: termsMd, titleKey: 'legal.termsTitle' },
}

export default function LegalPage({ doc = 'privacy' }) {
  const { t } = useTranslation()
  const { markdown, titleKey } = DOCS[doc] || DOCS.privacy
  const html = useMemo(() => sanitizeHtml(renderLegalMarkdown(markdown)), [markdown])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />
      <Navbar />

      <main className="relative z-10 mx-auto max-w-[760px] px-6 pb-20 pt-32 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">{t('legal.eyebrow')}</span>

          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl">
            {t(titleKey)}
          </h1>

          <div className="glass-panel mt-8 rounded-xl p-6 md:p-8">
            <div
              className="text-sm leading-relaxed text-[var(--text-secondary)] [&_a]:text-[var(--eyebrow-text)] [&_a]:underline [&_a:hover]:opacity-80 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-[var(--text-primary)] [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[var(--text-primary)] [&_hr]:my-6 [&_hr]:border-[var(--border-color)] [&_li]:mb-1.5 [&_p]:mb-4 [&_strong]:font-semibold [&_strong]:text-[var(--text-primary)] [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 dark:[&_a]:text-[#00f0ff]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
