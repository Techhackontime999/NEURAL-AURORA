import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSocialLinks } from '../lib/usePortfolioData'
import { submitContactMessage } from '../lib/supabase'

export default function Contact() {
  const socialLinks = useSocialLinks()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return
    setStatus('sending')
    setError('')
    try {
      await submitContactMessage(form)
      setStatus('sent')
      setForm({ name: '', email: '', message: '' })
      setTimeout(() => setStatus('idle'), 5000)
    } catch (err) {
      setError(err.message || 'Failed to send message')
      setStatus('idle')
    }
  }

  return (
    <section id="contact" className="relative z-10 py-32 md:py-40">
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={{
            visible: { transition: { staggerChildren: 0.12 } },
          }}
          className="grid md:grid-cols-2 gap-16 md:gap-24"
        >
          <div className="space-y-8">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } },
              }}
            >
              <span className="eyebrow">Connect</span>
              <h2 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-none">
                Let's Build{' '}
                <span className="text-gradient">Together</span>
              </h2>
              <p className="mt-4 text-base text-black/50 dark:text-white/40 max-w-[65ch] leading-relaxed">
                Have a project in mind or just want to say hello? The neural network is always open to new connections.
              </p>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } },
              }}
              className="glass-panel rounded-[2rem] p-8 md:p-10 space-y-4"
            >
              <h3 className="text-xs uppercase tracking-[0.15em] text-black/40 dark:text-white/30 font-medium">
                Find me on
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {socialLinks.map((link) => (
                  <motion.a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ x: 4 }}
                    className="group flex items-center gap-2 text-sm text-black/50 dark:text-white/40 hover:text-black/80 dark:hover:text-white/80 transition-colors duration-300"
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
            <form onSubmit={handleSubmit} className="glass-panel rounded-[2rem] p-8 md:p-10 space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-xs text-black/50 dark:text-white/40 uppercase tracking-[0.1em]">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-sm text-black/70 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/20 outline-none focus:border-black/20 dark:focus:border-white/10 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs text-black/50 dark:text-white/40 uppercase tracking-[0.1em]">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-sm text-black/70 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/20 outline-none focus:border-black/20 dark:focus:border-white/10 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="block text-xs text-black/50 dark:text-white/40 uppercase tracking-[0.1em]">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell me about your project..."
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-sm text-black/70 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/20 outline-none focus:border-black/20 dark:focus:border-white/10 transition-all duration-300 resize-none"
                />
              </div>

              {status === 'sent' ? (
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
                  disabled={status === 'sending'}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'sending' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending...
                    </span>
                  ) : 'Send Message'}
                </motion.button>
              )}

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400 text-center">
                  {error}
                </motion.p>
              )}
            </form>
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-24">
        <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="glow-line" />
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8">
            <p className="text-xs text-black/30 dark:text-white/20">
              NEURAL AURORA . Synaptic Portfolio
            </p>
            <p className="text-xs text-black/30 dark:text-white/20">
              Built with React, Three.js, and taste-skill design
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
