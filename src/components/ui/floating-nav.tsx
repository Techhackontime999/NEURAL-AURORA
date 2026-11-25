'use client'

import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  Bookmark,
  Home,
  Search,
  Settings,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

type NavItem = {
  id: string
  labelKey: string
  to: string
  icon: LucideIcon
  matchPath?: string
  end?: boolean
}

type FloatingNavProps = {
  profileHref?: string
  partnerHref?: string
  items?: NavItem[]
}

/**
 * Mobile-only quick navigation. It sits above page content but below the
 * existing top nav's full-screen menu (z-40), share sheets (z-200001+) and
 * toasts (z-200003+), so nothing from the current chrome is displaced.
 */
export default function FloatingNav({
  profileHref = '/login',
  partnerHref = '/affiliate-apply',
  items: itemsProp,
}: FloatingNavProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [indicator, setIndicator] = useState({ x: 0, width: 0 })

  const items = useMemo<NavItem[]>(() => {
    if (itemsProp) return itemsProp
    return [
      { id: 'home', labelKey: 'bottomNav.home', to: '/', icon: Home, end: true },
      {
        id: 'search',
        labelKey: 'bottomNav.search',
        to: '/offerings/products?focus=search',
        matchPath: '/offerings/products',
        icon: Search,
      },
      { id: 'alerts', labelKey: 'bottomNav.alerts', to: '/library', icon: Bell },
      { id: 'profile', labelKey: 'bottomNav.profile', to: profileHref, icon: UserRound },
      { id: 'saved', labelKey: 'bottomNav.saved', to: '/wishlist', icon: Bookmark },
      { id: 'partner', labelKey: 'bottomNav.partner', to: partnerHref, icon: UsersRound },
      { id: 'settings', labelKey: 'bottomNav.settings', to: '/settings', icon: Settings },
    ]
  }, [itemsProp, partnerHref, profileHref])

  const activeIndex = useMemo(() => {
    const index = items.findIndex((item) => {
      const path = item.matchPath ?? item.to.split('?')[0]
      if (item.end || path === '/') return pathname === path
      return pathname === path || pathname.startsWith(`${path}/`)
    })
    return index === -1 ? 0 : index
  }, [items, pathname])

  // Measure in layout so the pill never flashes at the wrong position. Only
  // translate the indicator afterwards; width is applied directly, never tweened.
  useLayoutEffect(() => {
    const updateIndicator = () => {
      const container = containerRef.current
      const target = linkRefs.current[activeIndex]
      if (!container || !target) return
      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      setIndicator({
        x: targetRect.left - containerRect.left,
        width: targetRect.width,
      })
    }

    updateIndicator()
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateIndicator)
    if (containerRef.current && observer) observer.observe(containerRef.current)
    window.addEventListener('resize', updateIndicator)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activeIndex, items])

  const handleClick = (
    event: MouseEvent<HTMLAnchorElement>,
    item: NavItem,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    const path = item.matchPath ?? item.to.split('?')[0]
    if (pathname === path) {
      window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' })
    }
  }

  return (
    <nav
      aria-label={t('bottomNav.label')}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:hidden"
    >
      <div className="px-3 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <div
          ref={containerRef}
          className="pointer-events-auto grid grid-cols-7 items-center rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--glass-bg)] px-1 py-1 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.55)] backdrop-blur-xl"
          style={{
            boxShadow:
              '0 18px 50px -24px rgba(15,23,42,0.55), inset 0 1px 0 rgba(255,255,255,0.10)',
          }}
        >
          <motion.span
            aria-hidden="true"
            className="absolute bottom-1 left-0 top-1 rounded-2xl bg-[var(--accent-glow)]/10"
            style={{ width: indicator.width, willChange: 'transform' }}
            animate={{ x: indicator.x }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 420, damping: 34 }
            }
          />
          {items.map((item, index) => {
            const path = item.matchPath ?? item.to.split('?')[0]
            const active = index === activeIndex
            const Icon = item.icon
            return (
              <Link
                key={item.id}
                ref={(node) => {
                  linkRefs.current[index] = node
                }}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                onClick={(event) => handleClick(event, item)}
                className="relative z-10 flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-[var(--text-tertiary)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)] active:scale-[0.97]"
              >
                <Icon
                  size={18}
                  strokeWidth={1.8}
                  style={{ color: active ? 'var(--accent-glow)' : undefined }}
                />
                <span
                  className="max-w-full truncate text-[9px] font-medium leading-none tracking-tight"
                  style={{ color: active ? 'var(--accent-glow)' : undefined }}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
