'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

function GithubIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> }

function LinkedinIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> }

function YoutubeIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> }

function InstagramIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> }

function FacebookIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> }
import { usePersonalInfo, useSocialLinks } from '../../lib/usePortfolioData'

const iconMap = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
  youtube: YoutubeIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
}

function getStaticSections() {
  return [
    {
      label: 'Skills',
      links: [
        { title: 'React / Next.js', href: '#skills' },
        { title: 'Three.js / WebGL', href: '#skills' },
        { title: 'UI/UX Design', href: '#skills' },
        { title: 'Full-Stack Dev', href: '#skills' },
      ],
    },
    {
      label: 'Projects',
      links: [
        { title: 'NEURAL AURORA', href: '#projects' },
        { title: 'Synaptic Dashboard', href: '#projects' },
        { title: 'Aurora Engine', href: '#projects' },
        { title: 'View All', href: '#projects' },
      ],
    },
  ]
}

function AnimatedContainer({ className, delay = 0.1, children }) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) return children

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function Footer() {
  const personalInfo = usePersonalInfo()
  const socialLinks = useSocialLinks()
  const currentYear = new Date().getFullYear()

  const footerSections = [
    ...getStaticSections(),
    {
      label: 'Connect',
      links: socialLinks
        .filter((l) => ['github', 'linkedin', 'youtube', 'instagram'].includes(l.icon))
        .map((l) => ({
          title: l.label,
          href: l.url,
          icon: iconMap[l.icon] || ExternalLink,
        })),
    },
  ]

  return (
    <footer className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 pb-8">
      <div className="relative w-full flex flex-col items-center justify-center rounded-[2rem] border border-black/10 dark:border-white/[0.06] bg-[radial-gradient(35%_128px_at_50%_0%,rgba(255,255,255,0.04),transparent)] px-6 py-12 lg:py-16 overflow-hidden">
        <div className="absolute top-0 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur" />

        <AnimatedContainer className="w-full">
          <div className="flex flex-col items-center gap-2 mb-12">
            <span className="text-2xl font-display font-bold tracking-tight text-black/80 dark:text-white/90">
              <span className="text-gradient">NA</span>
            </span>
            <p className="text-xs text-black/40 dark:text-white/20 tracking-wider uppercase">
              NEURAL AURORA
            </p>
          </div>
        </AnimatedContainer>

        <div className="grid w-full gap-8 md:grid-cols-3">
          {footerSections.map((section, index) => (
            <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
              <h3 className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/40 font-medium mb-5">
                {section.label}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.title}>
                    <a
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-2 text-sm text-black/40 dark:text-white/30 hover:text-black/70 dark:hover:text-white/70 active:scale-[0.97] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group"
                    >
                      {link.icon && <link.icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />}
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            </AnimatedContainer>
          ))}
        </div>

        <AnimatedContainer delay={0.4} className="w-full mt-12 pt-8 border-t border-black/10 dark:border-white/[0.04]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-black/25 dark:text-white/15">
              {currentYear} {personalInfo.handle}. Synaptic Portfolio
            </p>
            <div className="flex gap-4">
              {socialLinks.slice(0, 4).map((link) => {
                const Icon = iconMap[link.icon] || ExternalLink
                return (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black/30 dark:text-white/20 hover:text-black/60 dark:hover:text-white/60 active:scale-90 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                )
              })}
            </div>
          </div>
        </AnimatedContainer>
      </div>
    </footer>
  )
}
