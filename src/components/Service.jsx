import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence, useInView } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
const { CheckCircle, ArrowRight, ChevronDown, Layers, Send, Wallet } = LucideIcons
import { useSocialLinks, useServices, useServicePage } from '../lib/usePortfolioData'
import { submitContactMessage, savePayment } from '../lib/supabase'
import { openRazorpayCheckout } from '../lib/razorpay'
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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 25 } },
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
  const hasPrice = service.price && service.price !== '0'
  const navigate = useNavigate()
  return (
    <motion.div
      variants={childVariants}
      className="group relative"
    >
      <TiltCard className="glass-panel rounded-2xl p-6 md:p-8 group relative overflow-hidden transition-shadow duration-500 hover:shadow-lg hover:shadow-cyan-500/5">
        <motion.span
          initial={{ opacity: 0, scale: 2 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="absolute top-4 right-4 text-[40px] leading-none font-display font-bold text-black/5 dark:text-white/5 select-none pointer-events-none"
        >
          {String(index + 1).padStart(2, '0')}
        </motion.span>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="relative flex flex-col h-full"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: [0, -4, 4, 0] }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-5 ring-1 ring-black/5 dark:ring-white/10 group-hover:ring-cyan-500/30 transition-all duration-500"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
              <ResolvedIcon name={service.icon_name} className="w-4 h-4 text-cyan-500 transition-all duration-300 group-hover:text-cyan-400 group-hover:scale-110" />
            </div>
          </motion.div>

          <h2 className="text-lg font-semibold text-black/80 dark:text-white/80 mb-1">
            {service.title}
          </h2>
          <p className="text-xs uppercase tracking-widest text-cyan-500 mb-3">
            {service.tagline}
          </p>
          <div
            className="text-sm text-black/50 dark:text-white/50 leading-relaxed mb-5 flex-1"
            dangerouslySetInnerHTML={{ __html: service.description }}
          />

          <ul className="space-y-2 mb-6">
            {service.features.map((feat) => (
              <motion.li
                key={feat}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-2.5 text-xs text-black/50 dark:text-white/50"
              >
                <motion.span
                  whileHover={{ scale: 1.3, rotate: [0, -10, 10, 0] }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
                </motion.span>
                {feat}
              </motion.li>
            ))}
          </ul>

          {service.pricing && service.pricing.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
              className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/5 to-purple-500/5 border border-cyan-500/10"
            >
              <span className="text-[9px] uppercase tracking-widest text-cyan-500/70 font-medium whitespace-nowrap">
                {service.pricing.length} options
              </span>
              <span className="w-px h-3 bg-cyan-500/20" />
              <span className="text-[9px] uppercase tracking-widest text-black/40 dark:text-white/40">
                {service.delivery}
              </span>
            </motion.div>
          )}

          {hasPrice ? (
            <motion.button
              onClick={() => navigate(`/services/${service.service_id}`)}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-full group/btn inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs uppercase tracking-widest font-medium transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25"
            >
              <Wallet className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:scale-110" />
              View Details
              <motion.span
                initial={{ x: 0 }}
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <ArrowRight className="w-3 h-3" />
              </motion.span>
            </motion.button>
          ) : (
            <motion.button
              onClick={() => navigate(`/services/${service.service_id}`)}
              whileHover={{ scale: 1.03, x: 4 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="group/btn inline-flex items-center gap-3 text-xs uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              <motion.span
                initial={{ x: 0 }}
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                View Details
              </motion.span>
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover/btn:bg-cyan-500/20 transition-colors duration-300"
              >
                <ArrowRight className="w-3 h-3" />
              </motion.span>
            </motion.button>
          )}
        </motion.div>
      </TiltCard>
    </motion.div>
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

function PackageCard({ pkg, index, onPayment, paying }) {
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
      <button
        onClick={() => onPayment?.(pkg)}
        disabled={paying}
        className={`w-full group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-xs uppercase tracking-widest font-medium transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:hover:scale-100 ${
          pkg.popular
            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
            : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10'
        }`}>
        {paying ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Processing...
          </span>
        ) : (
          <>
            Get Started
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </>
        )}
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

function FutureReleaseCard({ release, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      <div className="glass-panel rounded-2xl p-6 md:p-8 h-full relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, rgba(0,240,255,0.03), rgba(184,41,221,0.03))`,
          }}
        />
        <div className="relative flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                <ResolvedIcon name={release.icon_name} className="w-4 h-4 text-cyan-500" />
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] uppercase tracking-widest font-medium border bg-amber-500/10 border-amber-500/20 text-amber-400 shrink-0 ml-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Coming Soon
            </span>
          </div>
          <h3 className="text-lg font-semibold text-black/80 dark:text-white/80 mb-1">
            {release.title}
          </h3>
          <p className="text-xs uppercase tracking-widest text-cyan-500 mb-3">
            {release.tagline}
          </p>
          <p className="text-sm text-black/50 dark:text-white/50 leading-relaxed flex-1">
            {release.description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default function Service() {
  const { data: socialLinks } = useSocialLinks()
  const { data: services } = useServices()
  const { data: page } = useServicePage()
  const [openFAQ, setOpenFAQ] = useState(null)
  const [payingPackage, setPayingPackage] = useState(null)
  const [payingService, setPayingService] = useState(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactStatus, setContactStatus] = useState('idle')
  const [contactError, setContactError] = useState('')

  function parsePrice(price) {
    const cleaned = price.replace(/[^0-9.kK]/g, '')
    const isK = /k/i.test(cleaned)
    const num = parseFloat(cleaned)
    if (isNaN(num)) return 0
    return isK ? Math.round(num * 1000) : Math.round(num)
  }

  async function handlePackagePayment(pkg) {
    setPayingPackage(pkg.name)
    const priceNum = parsePrice(pkg.price)
    if (!priceNum) { setPayingPackage(null); return }
    await openRazorpayCheckout({
      amount: priceNum,
      currency: 'INR',
      description: `${pkg.name} Package — ${pkg.currency}${pkg.price}`,
      prefill: { name: '', email: '' },
      async onSuccess(response) {
        try {
          await savePayment({
            service_id: 'package',
            service_title: `${pkg.name} Package`,
            pricing_label: pkg.name,
            amount: priceNum,
            currency: 'INR',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
          })
        } catch (e) {
          console.warn('Payment saved but failed to record:', e)
        }
        setPayingPackage(null)
      },
      onError() { setPayingPackage(null) },
    })
    setPayingPackage(null)
  }

  async function handleServicePayment(service) {
    setPayingService(service.service_id)
    const priceNum = parsePrice(service.price)
    if (!priceNum) { setPayingService(null); return }
    await openRazorpayCheckout({
      amount: priceNum,
      currency: 'INR',
      description: `${service.title} — ${service.currency || '₹'}${service.price}`,
      prefill: { name: '', email: '' },
      async onSuccess(response) {
        try {
          await savePayment({
            service_id: service.service_id || 'service',
            service_title: service.title,
            pricing_label: 'Direct Payment',
            amount: priceNum,
            currency: 'INR',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
          })
        } catch (e) {
          console.warn('Payment saved but failed to record:', e)
        }
        setPayingService(null)
      },
      onError() { setPayingService(null) },
    })
    setPayingService(null)
  }

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
  const futureReleases = page?.future_releases || []

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

          <motion.div
            variants={containerVariants}
            initial="visible"
            animate="visible"
            className="grid md:grid-cols-2 gap-6 mb-24"
          >
            {services.map((service, i) => (
              <ServiceCard key={service.service_id || i} service={service} index={i} />
            ))}
          </motion.div>
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
                whileInView={{ opacity: 1, y: 0 }}
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

        {futureReleases.length > 0 && (
          <div id="roadmap" className="mb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="eyebrow">Roadmap</span>
              <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
                What&apos;s Coming{' '}
                <span className="text-gradient">Next</span>
              </h2>
              <p className="text-sm text-black/50 dark:text-white/50 mt-3 max-w-lg mx-auto">
                The future of Neural Aurora — from advanced tools to enterprise-grade infrastructure.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {futureReleases.map((release, i) => (
                <FutureReleaseCard key={release.id || i} release={release} index={i} />
              ))}
            </div>
          </div>
        )}

        {packages.length > 0 && (
          <div id="pricing" className="mb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
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
                <PackageCard key={pkg.name || i} pkg={pkg} index={i} onPayment={handlePackagePayment} paying={payingPackage === pkg.name} />
              ))}
            </motion.div>
          </div>
        )}

        {testimonials.length > 0 && (
          <div id="testimonials" className="mb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
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
                  whileInView={{ opacity: 1, y: 0 }}
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
              whileInView={{ opacity: 1, y: 0 }}
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
                      target="_self"
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
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 60, damping: 20 } },
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
