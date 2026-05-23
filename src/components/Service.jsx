import { useRef, useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence, useInView } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
const { CheckCircle, ArrowRight, ChevronDown, Layers, Send } = LucideIcons
import { useSocialLinks, useServices, useServicePage } from '../lib/usePortfolioData'
import { submitContactMessage } from '../lib/supabase'
import ServiceNavbar from './ServiceNavbar'
import AuroraBackground from './AuroraBackground'
import { Footer } from './ui/footer-section'

function ResolvedIcon({ name, className = 'w-4 h-4' }) {
  const Icon = LucideIcons[name]
  if (!Icon) return null
  return <Icon className={className} />
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const childVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 100, damping: 25 } },
}

function TiltCard({ children, className }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const mouseX = useSpring(x, { stiffness: 300, damping: 30 })
  const mouseY = useSpring(y, { stiffness: 300, damping: 30 })
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [4, -4])
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-4, 4])

  const handleMouse = (e) => {
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleLeave = () => { x.set(0); y.set(0) }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, perspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function AnimatedCounter({ value, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 2000
    const steps = 40
    const increment = value / steps
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [inView, value])

  return (
    <span ref={ref} className="text-3xl md:text-4xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 tabular-nums">
      {count}{suffix}
    </span>
  )
}

function ServiceCard({ service, index }) {
  return (
    <TiltCard className="glass-panel rounded-2xl p-6 md:p-8 group relative overflow-hidden">
      <span className="absolute top-4 right-4 text-[40px] leading-none font-display font-bold text-black/5 dark:text-white/5 select-none pointer-events-none">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-5 ring-1 ring-black/5 dark:ring-white/10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
            <ResolvedIcon name={service.icon_name} className="w-4 h-4 text-cyan-500 group-hover:text-cyan-400 transition-colors duration-300" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-black/80 dark:text-white/80 mb-1">
          {service.title}
        </h2>
        <p className="text-xs uppercase tracking-widest text-cyan-500 mb-3">
          {service.tagline}
        </p>
        <p className="text-sm text-black/50 dark:text-white/50 leading-relaxed mb-5">
          {service.description}
        </p>
        <ul className="space-y-2 mb-6">
          {service.features.map((feat) => (
            <li key={feat} className="flex items-start gap-2.5 text-xs text-black/50 dark:text-white/50">
              <CheckCircle className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
              {feat}
            </li>
          ))}
        </ul>
        <button className="group/btn inline-flex items-center gap-3 text-xs uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors">
          Let's talk
          <span className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>
      </div>
    </TiltCard>
  )
}

function ProcessStep({ step, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ delay: index * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative pl-10 pb-10 last:pb-0"
    >
      <div className="absolute left-0 top-0 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-black/10 dark:border-white/10 flex items-center justify-center z-10">
        <ResolvedIcon name={step.icon_name} className="w-3.5 h-3.5 text-cyan-500" />
      </div>
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/30 via-purple-500/20 to-transparent translate-x-[3px]" />
      <div className="glass-panel rounded-xl p-4 ml-2">
        <span className="text-[10px] uppercase tracking-widest text-cyan-500 font-medium">
          Step {index + 1}
        </span>
        <h3 className="text-sm font-semibold text-black/80 dark:text-white/80 mt-1">
          {step.title}
        </h3>
        <p className="text-xs text-black/50 dark:text-white/50 mt-1 leading-relaxed">
          {step.description}
        </p>
      </div>
    </motion.div>
  )
}

function PackageCard({ pkg, index }) {
  return (
    <motion.div
      custom={index}
      variants={childVariants}
      className={`glass-panel rounded-2xl p-6 md:p-8 relative ${pkg.popular ? 'ring-1 ring-cyan-500/30' : ''}`}
    >
      {pkg.popular && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-[9px] uppercase tracking-widest text-white font-medium">
          Most Popular
        </span>
      )}
      <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4">
        <ResolvedIcon name={pkg.icon_name} className="w-5 h-5 text-cyan-500" />
      </div>
      <h3 className="text-lg font-semibold text-black/80 dark:text-white/80">{pkg.name}</h3>
      <div className="flex items-baseline gap-0.5 mt-2 mb-4">
        <span className="text-sm text-black/40 dark:text-white/40">{pkg.currency}</span>
        <span className="text-3xl font-display font-bold tracking-tight text-black/80 dark:text-white/90">{pkg.price}</span>
        <span className="text-xs text-black/40 dark:text-white/40">{pkg.period}</span>
      </div>
      <ul className="space-y-2 mb-6">
        {pkg.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-xs text-black/50 dark:text-white/50">
            <CheckCircle className="w-3 h-3 text-cyan-500 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <button className={`w-full group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-xs uppercase tracking-widest font-medium transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.97] ${
        pkg.popular
          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
          : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10'
      }`}>
        Get Started
        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </motion.div>
  )
}

function FAQItem({ faq, index, openIndex, setOpenIndex }) {
  const isOpen = openIndex === index
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpenIndex(isOpen ? null : index)}
        className="w-full flex items-center justify-between gap-4 p-4 md:p-5 text-left"
      >
        <span className="text-sm font-medium text-black/80 dark:text-white/80">{faq.q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0"
        >
          <ChevronDown className="w-3 h-3 text-black/40 dark:text-white/40" />
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-4 md:px-5 pb-4 md:pb-5 text-xs text-black/50 dark:text-white/50 leading-relaxed border-t border-black/10 dark:border-white/10 pt-4">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function LiveStatusCard({ items }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => setVisible(true), 200)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  if (!items || items.length === 0) return null

  return (
    <div className="glass-panel rounded-2xl p-6 md:p-8 overflow-hidden relative">
      <div className="flex items-center gap-2 mb-5">
        <span className="relative flex w-2 h-2">
          <span className={`absolute inset-0 rounded-full bg-green-500 ${visible ? 'animate-ping' : ''}`} />
          <span className="relative rounded-full w-2 h-2 bg-green-500" />
        </span>
        <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40 font-medium">
          Live Activity
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <motion.div
            key={item.time + item.event}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-start gap-3"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50 mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-black/50 dark:text-white/50 truncate">
                {item.event}
              </p>
              <span className="text-[9px] uppercase tracking-widest text-black/30 dark:text-white/20">
                {item.time}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none" />
    </div>
  )
}

export default function Service() {
  const socialLinks = useSocialLinks()
  const services = useServices()
  const page = useServicePage()
  const [openFAQ, setOpenFAQ] = useState(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactStatus, setContactStatus] = useState('idle')
  const [contactError, setContactError] = useState('')

  async function handleContactSubmit(e) {
    e.preventDefault()
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) return
    setContactStatus('sending')
    setContactError('')
    try {
      await submitContactMessage(contactForm)
      setContactStatus('sent')
      setContactForm({ name: '', email: '', message: '' })
      setTimeout(() => setContactStatus('idle'), 5000)
    } catch (err) {
      setContactError(err.message || 'Failed to send message')
      setContactStatus('idle')
    }
  }

  const heroTitle = page?.hero_title || 'What I Can Do For You'
  const heroDesc = page?.hero_description || ''
  const processTitle = page?.process_title || 'How I Work'
  const processDesc = page?.process_description || ''
  const pricingTitle = page?.pricing_title || 'Transparent Pricing'
  const pricingDesc = page?.pricing_description || ''
  const testimonialsTitle = page?.testimonials_title || 'What People Say'
  const techTitle = page?.tech_title || 'Technologies I Use'
  const techDesc = page?.tech_description || ''
  const faqTitle = page?.faq_title || 'Frequently Asked Questions'

  const stats = page?.stats || []
  const processSteps = page?.process_steps || []
  const packages = page?.packages || []
  const testimonials = page?.testimonials || []
  const techStack = page?.tech_stack || []
  const liveFeed = page?.live_feed || []
  const faqs = page?.faqs || []

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />
      <ServiceNavbar />

      <main className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 pt-32 pb-20">
        <div id="services">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center mb-24"
          >
            <motion.span variants={childVariants} className="eyebrow">Services</motion.span>
            <motion.h1 variants={childVariants} className="text-3xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter text-black/80 dark:text-white/90 mt-4">
              {heroTitle.split(/(\S*For\S*|\S*You\S*)/g).map((part, i) =>
                /For|You/.test(part) ? <span key={i} className="text-gradient">{part}</span> : part
              )}
            </motion.h1>
            <motion.p variants={childVariants} className="text-sm text-black/50 dark:text-white/50 mt-3 max-w-lg mx-auto">
              {heroDesc}
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 mb-24">
            {services.map((service, i) => (
              <ServiceCard key={service.service_id || i} service={service} index={i} />
            ))}
          </div>
        </div>

        {stats.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4 mb-24">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-panel rounded-2xl p-6 text-center"
              >
                <ResolvedIcon name={stat.icon_name} className="w-5 h-5 text-cyan-500 mx-auto mb-3" />
                <AnimatedCounter value={stat.value} suffix={stat.suffix || ''} />
                <p className="text-xs text-black/40 dark:text-white/40 mt-1 uppercase tracking-wider">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {processSteps.length > 0 && (
          <div id="process" className="grid md:grid-cols-5 gap-6 mb-24">
            <div className="md:col-span-2 md:sticky md:top-32 md:self-start">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView="visible"
                viewport={{ once: true }}
              >
                <span className="eyebrow">Process</span>
                <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4 mb-3">
                  {processTitle.split(/(Work)/g).map((part, i) =>
                    part === 'Work' ? <span key={i} className="text-gradient">{part}</span> : part
                  )}
                </h2>
                <p className="text-sm text-black/50 dark:text-white/50 leading-relaxed">
                  {processDesc}
                </p>
              </motion.div>
            </div>
            <div className="md:col-span-3">
              {processSteps.map((step, i) => (
                <ProcessStep key={step.title || i} step={step} index={i} />
              ))}
            </div>
          </div>
        )}

        {packages.length > 0 && (
          <div id="pricing" className="mb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="eyebrow">Pricing</span>
              <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
                {pricingTitle.split(/(Pricing)/g).map((part, i) =>
                  part === 'Pricing' ? <span key={i} className="text-gradient">{part}</span> : part
                )}
              </h2>
              <p className="text-sm text-black/50 dark:text-white/50 mt-3 max-w-md mx-auto">
                {pricingDesc}
              </p>
            </motion.div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="grid md:grid-cols-3 gap-6"
            >
              {packages.map((pkg, i) => (
                <PackageCard key={pkg.name || i} pkg={pkg} index={i} />
              ))}
            </motion.div>
          </div>
        )}

        {testimonials.length > 0 && (
          <div id="testimonials" className="mb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="eyebrow">Testimonials</span>
              <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
                {testimonialsTitle.split(/(Say)/g).map((part, i) =>
                  part === 'Say' ? <span key={i} className="text-gradient">{part}</span> : part
                )}
              </h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.author || i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-panel rounded-2xl p-6"
                >
                  <Layers className="w-5 h-5 text-cyan-500/30 mb-4" />
                  <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed mb-6 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="border-t border-black/10 dark:border-white/10 pt-4">
                    <p className="text-xs font-semibold text-black/80 dark:text-white/80">
                      {t.author}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30">
                      {t.role}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {(techStack.length > 0 || (liveFeed && liveFeed.length > 0)) && (
          <div className="grid md:grid-cols-3 gap-6 mb-24">
            <div className="md:col-span-2">
              <div className="glass-panel rounded-2xl p-6 md:p-8 overflow-hidden relative">
                <span className="eyebrow text-[10px]">Tech Stack</span>
                <h2 className="text-xl md:text-2xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-3 mb-1">
                  {techTitle.split(/(Use)/g).map((part, i) =>
                    part === 'Use' ? <span key={i} className="text-gradient">{part}</span> : part
                  )}
                </h2>
                <p className="text-xs text-black/50 dark:text-white/50 mb-6">
                  {techDesc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {techStack.map((tech) => (
                    <motion.span
                      key={tech.label}
                      whileHover={{ scale: 1.05, y: -1 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-wider text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                    >
                      <ResolvedIcon name={tech.icon_name} className="w-3 h-3" />
                      {tech.label}
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
            <div className="md:col-span-1">
              <LiveStatusCard items={liveFeed} />
            </div>
          </div>
        )}

        {faqs.length > 0 && (
          <div id="faq" className="mb-24 max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="eyebrow">FAQ</span>
              <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
                {faqTitle.split(/(Questions)/g).map((part, i) =>
                  part === 'Questions' ? <span key={i} className="text-gradient">{part}</span> : part
                )}
              </h2>
            </motion.div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <FAQItem key={i} faq={faq} index={i} openIndex={openFAQ} setOpenIndex={setOpenFAQ} />
              ))}
            </div>
          </div>
        )}

        <section id="contact" className="mb-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={{
              visible: { transition: { staggerChildren: 0.12 } },
            }}
            className="grid md:grid-cols-2 gap-12 md:gap-16"
          >
            <div className="space-y-8">
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } },
                }}
              >
                <span className="eyebrow">Connect</span>
                <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tighter leading-none">
                  Let's Build{' '}
                  <span className="text-gradient">Together</span>
                </h2>
                <p className="mt-4 text-sm text-black/50 dark:text-white/40 max-w-[65ch] leading-relaxed">
                  Have a project in mind or just want to say hello? The network is always open to new connections.
                </p>
              </motion.div>

              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } },
                }}
                className="glass-panel rounded-[2rem] p-6 md:p-8 space-y-4"
              >
                <h3 className="text-[10px] uppercase tracking-[0.15em] text-black/40 dark:text-white/30 font-medium">
                  Find me on
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {socialLinks.map((link) => (
                    <motion.a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ x: 4 }}
                      className="group flex items-center gap-2 text-xs text-black/50 dark:text-white/40 hover:text-black/80 dark:hover:text-white/80 transition-colors duration-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-black/10 dark:bg-white/10 group-hover:bg-[#00f0ff]" />
                      {link.label}
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, filter: 'blur(4px)' },
                visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 60, damping: 20 } },
              }}
            >
              <form
                onSubmit={handleContactSubmit}
                className="glass-panel rounded-[2rem] p-6 md:p-8 space-y-5"
              >
                <div className="space-y-2">
                  <label htmlFor="s-name" className="block text-[10px] text-black/50 dark:text-white/40 uppercase tracking-[0.1em]">
                    Name
                  </label>
                  <input
                    type="text"
                    id="s-name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Your name"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-sm text-black/70 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/20 outline-none focus:border-black/20 dark:focus:border-white/10 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="s-email" className="block text-[10px] text-black/50 dark:text-white/40 uppercase tracking-[0.1em]">
                    Email
                  </label>
                  <input
                    type="email"
                    id="s-email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-sm text-black/70 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/20 outline-none focus:border-black/20 dark:focus:border-white/10 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="s-message" className="block text-[10px] text-black/50 dark:text-white/40 uppercase tracking-[0.1em]">
                    Message
                  </label>
                  <textarea
                    id="s-message"
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Tell me about your project..."
                    required
                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-sm text-black/70 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/20 outline-none focus:border-black/20 dark:focus:border-white/10 transition-all duration-300 resize-none"
                  />
                </div>

                {contactStatus === 'sent' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full py-3.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-500 text-center"
                  >
                    Message sent! I'll get back to you soon.
                  </motion.div>
                ) : (
                  <motion.button
                    type="submit"
                    disabled={contactStatus === 'sending'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs uppercase tracking-widest font-medium transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {contactStatus === 'sending' ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Sending...
                      </span>
                    ) : (
                      <>
                        Send Message
                        <Send className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </motion.button>
                )}

                {contactError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400 text-center">
                    {contactError}
                  </motion.p>
                )}
              </form>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
