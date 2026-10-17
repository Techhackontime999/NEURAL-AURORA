import { motion } from 'framer-motion'
import { Calendar, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCertificates } from '../../lib/usePortfolioData'
import MorePageShell, { EmptyState } from './MorePageShell'

function CertificateCard({ item, index }) {
  const { t } = useTranslation()

  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className="glass-panel rounded-xl overflow-hidden group flex flex-col"
    >
      {item.image_url && (
        <div className="aspect-[4/3] bg-black/5 dark:bg-white/5 overflow-hidden">
          <img
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-black/80 dark:text-white/80">
          {item.title}
        </h3>

        {item.issuer && (
          <p className="text-xs text-black/50 dark:text-white/50 mt-1">{item.issuer}</p>
        )}

        {item.issue_date && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30">
            <Calendar className="w-3 h-3" />
            {item.issue_date}
          </span>
        )}

        {item.description && (
          <p className="text-xs text-black/50 dark:text-white/50 mt-2 leading-relaxed line-clamp-3">
            {item.description}
          </p>
        )}

        {item.credential_url && (
          <a
            href={item.credential_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors"
          >
            {t('more.verifyCredential')}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.div>
  )
}

export default function Certificates() {
  const { t } = useTranslation()
  const { data: certificates } = useCertificates()

  return (
    <MorePageShell
      eyebrow={t('more.eyebrow')}
      title={t('more.certificates')}
      subtitle={t('more.certificatesSubtitle')}
    >
      {certificates.length === 0 ? (
        <EmptyState message={t('more.noCertificates')} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((item, i) => (
            <CertificateCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </MorePageShell>
  )
}
