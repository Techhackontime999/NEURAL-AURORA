import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Wallet, Clock, Send, Sparkles } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useServices } from '../lib/usePortfolioData'
import { openRazorpayCheckout } from '../lib/razorpay'
import { submitContactMessage, savePayment } from '../lib/supabase'
import ServiceNavbar from './ServiceNavbar'
import AuroraBackground from './AuroraBackground'
import { Footer } from './ui/footer-section'

function parsePrice(price) {
  const cleaned = price.replace(/[^0-9.kK]/g, '')
  const isK = /k/i.test(cleaned)
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0
  return isK ? Math.round(num * 1000) : Math.round(num)
}

function ResolvedIcon({ name, className = 'w-8 h-8' }) {
  const Icon = LucideIcons[name]
  if (!Icon) return null
  return <Icon className={`${className} text-cyan-500`} />
}

function ScrollSection({ children, className, delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function DoubleBezel({ children, className, outerClass, innerClass }) {
  return (
    <div className={`p-[1px] rounded-[1.75rem] bg-gradient-to-b from-black/5 to-transparent dark:from-white/5 ${outerClass || ''}`}>
      <div className={`rounded-[calc(1.75rem-1px)] bg-[var(--bg-primary)] ${innerClass || ''}`}>
        {children}
      </div>
    </div>
  )
}

function MagneticButton({ children, className, disabled, onClick, type = 'button' }) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`group relative overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs uppercase tracking-widest font-medium shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        initial={false}
      />
      <span className="relative z-10 flex items-center justify-center gap-2 px-8 py-4">
        {children}
      </span>
    </motion.button>
  )
}

const scrollReveal = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 25 } },
}

export default function ServiceDetail() {
  const { serviceId } = useParams()
  const { data: services } = useServices()
  const service = services.find((s) => s.service_id === serviceId)

  const [selectedPricing, setSelectedPricing] = useState(null)
  const [paying, setPaying] = useState(false)
  const [paidInfo, setPaidInfo] = useState(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactStatus, setContactStatus] = useState('idle')
  const [contactError, setContactError] = useState('')

  const pricingOptions = service?.pricing && service.pricing.length > 0 ? service.pricing : null
  const activeOption = selectedPricing || pricingOptions?.[0] || null

  async function handlePayment() {
    if (!service || !activeOption) return
    setPaying(true)
    setPaidInfo(null)
    const priceNum = parsePrice(activeOption.price)
    if (!priceNum) { setPaying(false); return }
    await openRazorpayCheckout({
      amount: priceNum,
      currency: 'INR',
      description: `${service.title} — ${activeOption.label} — ${activeOption.price}`,
      prefill: { name: '', email: '' },
      async onSuccess(response) {
        try {
          await savePayment({
            service_id: service.service_id,
            service_title: service.title,
            pricing_label: activeOption.label,
            amount: priceNum,
            currency: 'INR',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
          })
        } catch (e) {
          console.warn('Payment saved but failed to record:', e)
        }
        setPaidInfo({ label: activeOption.label, price: activeOption.price, paymentId: response.razorpay_payment_id })
        setPaying(false)
      },
      onError() { setPaying(false) },
    })
    setPaying(false)
  }

  async function handleContactSubmit(e) {
    e.preventDefault()
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) return
    setContactStatus('sending')
    setContactError('')
    try {
      await submitContactMessage({
        ...contactForm,
        service: service?.title,
        pricing_label: activeOption?.label || null,
        paid: !!paidInfo,
      })
      setContactStatus('sent')
      setContactForm({ name: '', email: '', message: '' })
      setTimeout(() => setContactStatus('idle'), 5000)
    } catch (err) {
      setContactError(err.message || 'Failed to send message')
      setContactStatus('idle')
    }
  }

  if (!service) {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden">
        <AuroraBackground />
        <ServiceNavbar />
        <main className="relative z-10 max-w-[700px] mx-auto px-6 md:px-12 pt-32 pb-20 text-center">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="eyebrow">404</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-2xl font-bold text-black/80 dark:text-white/80 mt-4">Service not found</motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Link to="/services" className="inline-flex items-center gap-2 text-xs text-cyan-500 hover:text-cyan-400 mt-4 transition-colors">
              <ArrowLeft className="w-3 h-3" />
              Back to services
            </Link>
          </motion.div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <AuroraBackground />
      <ServiceNavbar />

      <main className="relative z-10 max-w-[1000px] mx-auto px-6 md:px-12 pt-32 pb-20">
        {/* ---- Back link ---- */}
        <ScrollSection delay={0}>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 hover:text-cyan-500 transition-colors mb-12 group"
          >
            <motion.span whileHover={{ x: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <ArrowLeft className="w-3 h-3" />
            </motion.span>
            Back to services
          </Link>
        </ScrollSection>

        {/* ---- Hero: icon + title row ---- */}
        <ScrollSection delay={0.05}>
          <div className="flex items-start gap-5 mb-8">
            <motion.div
              whileHover={{ scale: 1.1, rotate: [0, -6, 6, 0] }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="relative w-20 h-20 shrink-0"
            >
              <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-cyan-500/25 to-purple-500/25 blur-xl" />
              <div className="relative w-full h-full rounded-[1.25rem] bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center ring-1 ring-cyan-500/20">
                <ResolvedIcon name={service.icon_name} className="w-9 h-9" />
              </div>
            </motion.div>
            <div className="pt-1">
              <span className="eyebrow">Service</span>
              <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tighter text-black/80 dark:text-white/90 mt-2 leading-none">
                {service.title}
              </h1>
              <p className="text-xs uppercase tracking-widest text-cyan-500 mt-3">
                {service.tagline}
              </p>
            </div>
          </div>
        </ScrollSection>

        {/* ---- Description ---- */}
        <ScrollSection delay={0.1}>
          <motion.div
            className="text-sm text-black/50 dark:text-white/50 leading-relaxed mb-16 max-w-[65ch] ml-[calc(5rem+1.25rem)]"
            dangerouslySetInnerHTML={{ __html: service.description }}
          />
        </ScrollSection>

        {/* ---- What's Included ---- */}
        <ScrollSection delay={0.15}>
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
              <h2 className="text-xs font-semibold text-black/80 dark:text-white/80 uppercase tracking-[0.15em]">
                What's Included
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {service.features.map((feat) => (
                <motion.div
                  key={feat}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  className="group flex items-start gap-3 text-xs text-black/50 dark:text-white/50 p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] ring-1 ring-black/[0.04] dark:ring-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:ring-cyan-500/20 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                >
                  <motion.span
                    whileHover={{ scale: 1.3, rotate: [0, -10, 10, 0] }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-cyan-500/20 transition-colors duration-300"
                  >
                    <CheckCircle className="w-3 h-3 text-cyan-500" />
                  </motion.span>
                  {feat}
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollSection>

        {/* ---- Pricing Options ---- */}
        {pricingOptions && (
          <ScrollSection delay={0.2}>
            <div className="mb-20">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
                <h2 className="text-xs font-semibold text-black/80 dark:text-white/80 uppercase tracking-[0.15em]">
                  Select Project Type
                </h2>
                <motion.span
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="w-3 h-3 text-cyan-500/50" />
                </motion.span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {pricingOptions.map((opt, i) => {
                  const isSelected = activeOption === opt
                  return (
                    <motion.button
                      key={opt.label}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ type: 'spring', stiffness: 100, damping: 20, delay: i * 0.06 }}
                      onClick={() => setSelectedPricing(opt)}
                      whileHover={{ y: -4, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative text-left w-full rounded-[1.5rem] p-6 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-500/15 to-purple-500/15 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/5'
                          : 'bg-black/[0.02] dark:bg-white/[0.02] ring-1 ring-black/[0.06] dark:ring-white/[0.06] hover:ring-cyan-500/20 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center shadow-lg"
                        >
                          <CheckCircle className="w-3 h-3 text-white" />
                        </motion.span>
                      )}
                      <span className="text-sm font-semibold text-black/80 dark:text-white/80 block mb-2">
                        {opt.label}
                      </span>
                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-sm text-cyan-500/70 font-medium">₹</span>
                        <span className="text-3xl font-display font-bold tracking-tight text-gradient">{opt.price}</span>
                      </div>
                      {opt.delivery && (
                        <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 flex items-center gap-1.5 mb-3">
                          <Clock className="w-3 h-3 text-cyan-500/60" />
                          {opt.delivery}
                        </span>
                      )}
                      {opt.features && (
                        <div className="space-y-1.5 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                          {opt.features.map((f) => (
                            <span key={f} className="flex items-center gap-2 text-[10px] text-black/50 dark:text-white/50">
                              <span className="w-1 h-1 rounded-full bg-cyan-500/50 shrink-0" />
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </ScrollSection>
        )}

        {/* ---- Legacy single-price fallback ---- */}
        {!pricingOptions && service.price && service.price !== '0' && (
          <ScrollSection delay={0.2}>
            <div className="grid sm:grid-cols-2 gap-4 mb-20">
              <DoubleBezel>
                <div className="p-5">
                  <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 font-medium flex items-center gap-1.5 mb-2">
                    <Wallet className="w-3 h-3 text-cyan-500" />
                    Price
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-cyan-500/70 font-medium">{service.currency || '₹'}</span>
                    <span className="text-3xl font-display font-bold tracking-tight text-gradient">{service.price}</span>
                    <span className="text-xs text-black/40 dark:text-white/40">{service.period || '/project'}</span>
                  </div>
                </div>
              </DoubleBezel>
              {service.delivery && (
                <DoubleBezel>
                  <div className="p-5">
                    <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 font-medium flex items-center gap-1.5 mb-2">
                      <Clock className="w-3 h-3 text-cyan-500" />
                      Delivery
                    </span>
                    <span className="text-xl font-display font-bold tracking-tight text-black/80 dark:text-white/90">
                      {service.delivery}
                    </span>
                  </div>
                </DoubleBezel>
              )}
            </div>
          </ScrollSection>
        )}

        {/* ---- Pay Button ---- */}
        {activeOption && !paidInfo && (
          <ScrollSection delay={0.25}>
            <div className="mb-20">
              <MagneticButton onClick={handlePayment} disabled={paying}>
                {paying ? (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </motion.span>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    Pay ₹{activeOption.price}
                    <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/20 transition-colors duration-300">
                      <ArrowLeft className="w-3 h-3 rotate-180" />
                    </span>
                  </>
                )}
              </MagneticButton>
              <p className="text-[10px] text-black/30 dark:text-white/20 mt-3 ml-1">
                {activeOption.label} &middot; {activeOption.delivery}
              </p>
            </div>
          </ScrollSection>
        )}

        {/* ---- Payment Confirmation ---- */}
        {paidInfo && (
          <ScrollSection delay={0.25}>
            <div className="mb-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                className="inline-flex items-start gap-4 px-6 py-5 rounded-[1.5rem] bg-emerald-500/[0.07] ring-1 ring-emerald-500/20"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.15 }}
                  className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </motion.span>
                <div>
                  <p className="text-sm font-semibold text-emerald-500">Payment Confirmed</p>
                  <p className="text-xs text-emerald-500/70 mt-1">
                    {service.title} &mdash; {paidInfo.label} <span className="text-emerald-500/50">(₹{paidInfo.price})</span>
                  </p>
                  {paidInfo.paymentId && (
                    <p className="text-[10px] text-emerald-500/40 mt-1.5 font-mono tracking-tight">
                      {paidInfo.paymentId}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </ScrollSection>
        )}

        {/* ---- Contact Form ---- */}
        <ScrollSection delay={0.3}>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
              <h2 className="text-xs font-semibold text-black/80 dark:text-white/80 uppercase tracking-[0.15em]">
                Get in Touch
              </h2>
            </div>
            <DoubleBezel>
              <form onSubmit={handleContactSubmit} className="p-6 md:p-8 space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-[9px] uppercase tracking-[0.15em] text-black/40 dark:text-white/30">Name</label>
                    <input type="text" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Your name" required
                      className="w-full px-4 py-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] text-sm text-black/70 dark:text-white/80 placeholder:text-black/20 dark:placeholder:text-white/20 outline-none focus:border-cyan-500/30 transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[9px] uppercase tracking-[0.15em] text-black/40 dark:text-white/30">Email</label>
                    <input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="your@email.com" required
                      className="w-full px-4 py-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] text-sm text-black/70 dark:text-white/80 placeholder:text-black/20 dark:placeholder:text-white/20 outline-none focus:border-cyan-500/30 transition-all duration-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] uppercase tracking-[0.15em] text-black/40 dark:text-white/30">Message</label>
                  <textarea rows={4} value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder={`Tell me about your ${service.title} project...`} required
                    className="w-full px-4 py-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] text-sm text-black/70 dark:text-white/80 placeholder:text-black/20 dark:placeholder:text-white/20 outline-none focus:border-cyan-500/30 transition-all duration-300 resize-none"
                  />
                </div>
                {contactStatus === 'sent' ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="w-full py-3.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-500 text-center"
                  >
                    Message sent! I'll get back to you soon.
                  </motion.div>
                ) : (
                  <MagneticButton type="submit" disabled={contactStatus === 'sending'} className="w-full sm:w-auto">
                    {contactStatus === 'sending' ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Sending...
                      </span>
                    ) : (
                      <>
                        Send Message
                        <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/20 transition-colors duration-300">
                          <Send className="w-3 h-3" />
                        </span>
                      </>
                    )}
                  </MagneticButton>
                )}
                {contactError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400 text-center">{contactError}</motion.p>
                )}
              </form>
            </DoubleBezel>
          </div>
        </ScrollSection>
      </main>

      <Footer />
    </div>
  )
}
