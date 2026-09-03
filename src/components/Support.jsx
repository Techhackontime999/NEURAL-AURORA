import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence, useInView } from 'framer-motion'
import { Heart, Coffee, Zap, Rocket, Crown, Sparkles, Star, Shield, CheckCircle, ArrowRight, ChevronDown, Send, Wallet, Smartphone, Gift } from 'lucide-react'
import { openRazorpayCheckout } from '../lib/razorpay'
import { useSocialLinks } from '../lib/usePortfolioData'
import { getAdminSettings, submitContactMessage, savePayment } from '../lib/supabase'
import AuroraBackground from './AuroraBackground'
import { Footer } from './ui/footer-section'
import SupportNavbar from './SupportNavbar'

const defaultSettings = {
  razorpay_key: '',
  upi_id: '',
  donation_presets: [
    { amount: 99, label: '₹99', icon: 'Coffee', desc: 'Buy a coffee' },
    { amount: 199, label: '₹199', icon: 'Heart', desc: 'Support a feature' },
    { amount: 499, label: '₹499', icon: 'Zap', desc: 'Speed up dev' },
    { amount: 999, label: '₹999', icon: 'Rocket', desc: 'Launch booster' },
    { amount: 1999, label: '₹1,999', icon: 'Crown', desc: 'Premium backer' },
    { amount: 4999, label: '₹4,999', icon: 'Sparkles', desc: 'Legend tier' },
  ],
  upi_quickpay: [99, 499, 999],
  perks: [
    { title: 'Name in Credits', desc: 'Every contributor gets listed in the project README & website footer.', min: 99 },
    { title: 'Early Access', desc: 'Get early access to new features before public release.', min: 499 },
    { title: 'Feature Requests', desc: 'Vote or request specific features for future development.', min: 999 },
    { title: 'Priority Support', desc: 'Direct priority support & dedicated channel for backers.', min: 1999 },
    { title: 'Co-Creator Status', desc: 'Direct influence on roadmap & private community access.', min: 4999 },
  ],
  hero_title: 'NEURAL AURORA',
  hero_subtitle: 'Open Source & Free Forever',
  hero_description: 'This project is 100% free and open-source. Your contribution keeps it alive, funds new features, and helps us compete with paid alternatives — while keeping NEURAL AURORA free for everyone.',
  faqs: [
    { q: 'Where does my money go?', a: '100% of contributions go toward development costs — hosting, API subscriptions, domain renewal, and compensating contributors who add features to NEURAL AURORA. Every rupee is transparently accounted for.' },
    { q: 'Is NEURAL AURORA really free?', a: 'Yes! The core project will always remain free and open-source. Contributions help sustain development and accelerate new features, but the free version is our flagship and main competitor.' },
    { q: 'Can I request a specific feature?', a: 'Absolutely! Contributors at ₹999 and above can vote on the roadmap. Higher tiers get direct input on what gets built next.' },
    { q: 'What if I want a custom enterprise plan?', a: 'For custom enterprise needs, check out the Services page. This support page is purely for sustaining the open-source project.' },
    { q: 'Is my payment secure?', a: 'All payments are processed securely through Razorpay, a PCI-DSS compliant payment gateway. We never store your card or UPI details.' },
  ],
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

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0) }}
      style={{ rotateX, rotateY, perspective: 1000 }}
      className={className}
    >
      {children}
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
      transition={{ delay: index * 0.08 }}
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

const iconMap = { Heart, Coffee, Zap, Rocket, Crown, Sparkles, Star, Shield }

function ResolvedIcon({ name, className }) {
  const Icon = iconMap[name]
  if (!Icon) return null
  return <Icon className={className} />
}

export default function Support() {
  const { data: socialLinks } = useSocialLinks()
  const [settings, setSettings] = useState(defaultSettings)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState(499)
  const [customAmount, setCustomAmount] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('idle')
  const [paymentError, setPaymentError] = useState('')
  const [openFAQ, setOpenFAQ] = useState(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactStatus, setContactStatus] = useState('idle')
  const [contactError, setContactError] = useState('')

  useEffect(() => {
    getAdminSettings().then(admin => {
      if (admin?.payment_settings) {
        const merged = {
          ...defaultSettings,
          ...admin.payment_settings,
          donation_presets: admin.payment_settings.donation_presets?.length ? admin.payment_settings.donation_presets : defaultSettings.donation_presets,
          upi_quickpay: admin.payment_settings.upi_quickpay?.length >= 2 ? admin.payment_settings.upi_quickpay : defaultSettings.upi_quickpay,
          perks: admin.payment_settings.perks?.length ? admin.payment_settings.perks : defaultSettings.perks,
          faqs: admin.payment_settings.faqs?.length ? admin.payment_settings.faqs : defaultSettings.faqs,
        }
        setSettings(merged)
        if (merged.donation_presets?.length) setSelectedAmount(merged.donation_presets[0].amount)
      }
    }).catch(() => {}).finally(() => setSettingsLoaded(true))
  }, [])

  const finalAmount = useCustom ? (parseInt(customAmount) || 0) : selectedAmount

  const razorpayKey = settings.razorpay_key?.trim() && !settings.razorpay_key.includes('xxxxx') ? settings.razorpay_key.trim() : ''

  async function handleDonate() {
    if (finalAmount < 10) return
    setPaymentError('')
    setPaymentStatus('processing')
    try {
      const selectedPreset = !useCustom
        ? settings.donation_presets.find(p => p.amount === selectedAmount)
        : null
      const pricingLabel = selectedPreset ? selectedPreset.desc : 'Custom Donation'

      await openRazorpayCheckout({
        amount: finalAmount,
        currency: 'INR',
        description: `Support NEURAL AURORA — ₹${finalAmount}`,
        ...(razorpayKey ? { key: razorpayKey } : {}),
        async onSuccess(response) {
          try {
            await savePayment({
              service_id: 'support',
              service_title: 'Support NEURAL AURORA',
              pricing_label: pricingLabel,
              amount: finalAmount,
              currency: 'INR',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
            })
          } catch (e) {
            console.warn('Payment saved but failed to record:', e)
          }
          setPaymentStatus('success')
          setTimeout(() => setPaymentStatus('idle'), 5000)
        },
        onError(err) {
          setPaymentError(err?.message || 'Payment failed')
          setPaymentStatus('error')
          setTimeout(() => setPaymentStatus('idle'), 3000)
        },
      })
    } catch (e) {
      setPaymentError(e?.message || 'Unexpected error')
      setPaymentStatus('error')
      setTimeout(() => setPaymentStatus('idle'), 3000)
    }
  }

  async function handleUpiDonate(amount) {
    setPaymentError('')
    setPaymentStatus('processing')
    try {
      const matchingPreset = settings.donation_presets.find(p => p.amount === amount)
      const pricingLabel = matchingPreset ? matchingPreset.desc : 'UPI Quick Pay'

      await openRazorpayCheckout({
        amount,
        currency: 'INR',
        description: `UPI Support — NEURAL AURORA`,
        method: 'upi',
        ...(razorpayKey ? { key: razorpayKey } : {}),
        async onSuccess(response) {
          try {
            await savePayment({
              service_id: 'support',
              service_title: 'Support NEURAL AURORA',
              pricing_label: pricingLabel,
              amount,
              currency: 'INR',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
            })
          } catch (e) {
            console.warn('Payment saved but failed to record:', e)
          }
          setPaymentStatus('success')
          setTimeout(() => setPaymentStatus('idle'), 5000)
        },
        onError(err) {
          setPaymentError(err?.message || 'Payment failed')
          setPaymentStatus('error')
          setTimeout(() => setPaymentStatus('idle'), 3000)
        },
      })
    } catch (e) {
      setPaymentError(e?.message || 'Unexpected error')
      setPaymentStatus('error')
      setTimeout(() => setPaymentStatus('idle'), 3000)
    }
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

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />
      <SupportNavbar />

      <main className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 pt-32 pb-20">
        {/* Hero */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-20"
        >
          <motion.div variants={childVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 mb-6">
            <Heart className="w-3 h-3 text-rose-400" />
            <span className="text-[10px] uppercase tracking-widest text-rose-400 font-medium">{settings.hero_subtitle}</span>
          </motion.div>
          <motion.h1 variants={childVariants} className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tighter mt-4 leading-none text-balance">
            <span className="text-black/60 dark:text-white/60">Support</span>{' '}
            <span className="text-gradient">{settings.hero_title}</span>
          </motion.h1>
          <motion.p variants={childVariants} className="text-sm md:text-base text-black/50 dark:text-white/50 mt-5 max-w-2xl mx-auto leading-relaxed">
            {settings.hero_description}
          </motion.p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20"
        >
          {[
            { value: '100%', label: 'Free & Open Source', icon: Shield },
            { value: '0', label: 'Paid Features', icon: Crown },
            { value: 'Your', label: 'Contribution Counts', icon: Heart },
            { value: '∞', label: 'Possibilities', icon: Sparkles },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel rounded-2xl p-5 text-center"
            >
              <stat.icon className="w-5 h-5 text-rose-400 mx-auto mb-2" />
              <p className="text-2xl font-display font-bold tracking-tight text-black/80 dark:text-white/90">
                {stat.value}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 mt-1">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Donation Cards */}
        <div id="donate" className="grid md:grid-cols-5 gap-6 mb-20">
          <div className="md:col-span-2 md:sticky md:top-32 md:self-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="eyebrow">Contribute</span>
              <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4 mb-3">
                Choose Your{' '}
                <span className="text-gradient">Contribution</span>
              </h2>
              <p className="text-sm text-black/50 dark:text-white/50 leading-relaxed mb-6">
                Every contribution — big or small — helps keep NEURAL AURORA free and
                drives the next wave of features. Pick an amount or enter your own.
              </p>
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {settings.donation_presets.map((preset) => {
                    const active = !useCustom && selectedAmount === preset.amount
                    return (
                      <button
                        key={preset.amount}
                        onClick={() => { setUseCustom(false); setSelectedAmount(preset.amount) }}
                        className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          active
                            ? 'bg-gradient-to-br from-rose-500/20 to-purple-500/20 ring-1 ring-rose-500/40'
                            : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                        }`}
                      >
                        <ResolvedIcon name={preset.icon} className={`w-4 h-4 ${active ? 'text-rose-400' : 'text-black/30 dark:text-white/30'}`} />
                        <span className={`font-semibold ${active ? 'text-rose-400' : 'text-black/60 dark:text-white/60'}`}>
                          {preset.label}
                        </span>
                        <span className="text-[8px] uppercase tracking-wider text-black/30 dark:text-white/30">
                          {preset.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                  <span className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">or</span>
                  <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex-1 flex items-center rounded-xl bg-black/5 dark:bg-white/5 border transition-all duration-300 ${
                    useCustom ? 'border-rose-500/40 ring-1 ring-rose-500/20' : 'border-black/10 dark:border-white/5'
                  }`}>
                    <span className="pl-4 text-sm text-black/40 dark:text-white/40 font-medium">₹</span>
                    <input
                      type="number"
                      min="10"
                      placeholder="Custom amount"
                      value={customAmount}
                      onChange={(e) => { setUseCustom(true); setCustomAmount(e.target.value) }}
                      onFocus={() => setUseCustom(true)}
                      className="w-full px-3 py-3 bg-transparent text-sm text-black/70 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/20 outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleDonate}
                  disabled={finalAmount < 10 || paymentStatus === 'processing'}
                  className="group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-500 text-white text-xs uppercase tracking-widest font-medium transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {paymentStatus === 'processing' ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Processing...
                    </span>
                  ) : paymentStatus === 'success' ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Thank You!
                    </span>
                  ) : paymentStatus === 'error' ? (
                    <span className="flex items-center gap-2 text-[10px]">
                      {paymentError || 'Payment failed'}
                    </span>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Pay ₹{finalAmount}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-[9px] text-center text-black/30 dark:text-white/20">
                  🔒 Secured by Razorpay · UPI, Cards, NetBanking & Wallets accepted
                </p>

                <div className="pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-[9px] uppercase tracking-wider text-black/30 dark:text-white/30 mb-2 text-center">
                    Quick UPI Pay
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {settings.upi_quickpay.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleUpiDonate(amt)}
                        disabled={paymentStatus === 'processing'}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 hover:scale-[1.02] active:scale-[0.97] text-xs font-medium transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Smartphone className="w-3 h-3" />
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Perks */}
          <div className="md:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <span className="eyebrow">Perks</span>
              <h3 className="text-xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-2">
                What You Get in Return
              </h3>
            </motion.div>
            <div className="space-y-4">
              {settings.perks.map((perk, i) => (
                <motion.div
                  key={perk.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-panel rounded-2xl p-5 flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-black/80 dark:text-white/80">{perk.title}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-[8px] uppercase tracking-wider text-rose-400 font-medium">
                        ₹{perk.min}+
                      </span>
                    </div>
                    <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">{perk.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Why Support */}
        <div id="why" className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="eyebrow">Why Support?</span>
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
              Keeping Free Alive —{' '}
              <span className="text-gradient">Together</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Heart,
                title: 'Free for Everyone',
                desc: 'Your contribution ensures NEURAL AURORA stays 100% free with no paywalls, no premium tiers — just pure open-source value for the entire community.',
              },
              {
                icon: Zap,
                title: 'Faster Features',
                desc: 'Every rupee goes directly into development — new components, better performance, more integrations. You decide the pace of progress.',
              },
              {
                icon: Rocket,
                title: 'Compete with Paid',
                desc: 'The free version is our competitor. Your support helps us build features that rival enterprise solutions, proving open-source can win.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="glass-panel rounded-2xl p-6 md:p-8 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-5">
                  <item.icon className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-lg font-semibold text-black/80 dark:text-white/80 mb-2">{item.title}</h3>
                <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div id="faq" className="mb-20 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="eyebrow">FAQ</span>
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
              Your{' '}
              <span className="text-gradient">Questions</span>
            </h2>
          </motion.div>
          <div className="space-y-3">
            {settings.faqs.map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} openIndex={openFAQ} setOpenIndex={setOpenFAQ} />
            ))}
          </div>
        </div>

        {/* Contact */}
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
                  Get in{' '}
                  <span className="text-gradient">Touch</span>
                </h2>
                <p className="mt-4 text-sm text-black/50 dark:text-white/40 max-w-[65ch] leading-relaxed">
                  Questions about contributing? Want to discuss a sponsorship or partnership?
                  Reach out anytime.
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
                    placeholder="Tell me about your project or sponsorship ideas..."
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
        {/* Floating sticky support button */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 1, type: 'spring', stiffness: 200, damping: 25 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <motion.button
            onClick={() => document.getElementById('donate')?.scrollIntoView({ behavior: 'smooth' })}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-gradient-to-r from-rose-500 to-purple-500 text-white text-xs uppercase tracking-widest font-medium shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-shadow duration-300"
          >
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Support</span>
          </motion.button>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
