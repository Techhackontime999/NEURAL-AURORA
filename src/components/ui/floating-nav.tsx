'use client'

import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Heart,
  Home,
  Search,
  ShoppingBag,
  Store,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

type NavItem = {
  id: string
  labelKey: string
  to: string
  icon: LucideIcon
  matchPath?: string
  end?: boolean
  badge?: number
  badgeTone?: 'rose' | 'cyan'
  activeWhen?: (pathname: string, search: string) => boolean
}

type FloatingNavProps = {
  profileHref?: string
  cartCount?: number
  wishlistCount?: number
  items?: NavItem[]
}

const isStorePath = (pathname: string) =>
  pathname === '/offerings/products' || pathname.startsWith('/offerings/products/')

const isSearchIntent = (search: string) => {
  const params = new URLSearchParams(search)
  return params.get('focus') === 'search' || Boolean(params.get('q'))
}

/**
 * Mobile-only commerce bar. Home, shop, search, saved, cart and account are
 * the destinations people use most on storefronts; partner and settings links
 * stay in the upper scrollable rail and the account page so nothing is lost.
 */
export default function FloatingNav({
  profileHref = '/login',
  cartCount = 0,
  wishlistCount = 0,
  items: itemsProp,
}: FloatingNavProps) {
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [indicator, setIndicator] = useState({ x: 0, width: 0 })

  const items = useMemo<NavItem[]>(() => {
    if (itemsProp) return itemsProp
    return [
      { id: 'home', labelKey: 'bottomNav.home', to: '/', icon: Home, end: true },
      {
        id: 'shop',
        labelKey: 'bottomNav.shop',
        to: '/offerings/products',
        icon: Store,
        activeWhen: (path, query) => isStorePath(path) && !isSearchIntent(query),
      },
      {
        id: 'search',
        labelKey: 'bottomNav.search',
        to: '/offerings/products?focus=search',
        icon: Search,
        activeWhen: (path, query) => isStorePath(path) && isSearchIntent(query),
      },
      {
        id: 'saved',
        labelKey: 'bottomNav.saved',
        to: '/wishlist',
        icon: Heart,
        badge: wishlistCount,
        badgeTone: 'rose',
      },
      {
        id: 'cart',
        labelKey: 'bottomNav.cart',
        to: '/cart',
        icon: ShoppingBag,
        badge: cartCount,
        badgeTone: 'cyan',
      },
      {
        id: 'account',
        labelKey: 'bottomNav.account',
        to: profileHref,
        icon: UserRound,
      },
    ]
  }, [cartCount, itemsProp, profileHref, wishlistCount])

  const activeIndex = useMemo(() => {
    const index = items.findIndex((item) => {
      if (item.activeWhen) return item.activeWhen(pathname, search)
      const path = item.matchPath ?? item.to.split('?')[0]
      if (item.end || path === '/') return pathname === path
      return pathname === path || pathname.startsWith(`${path}/`)
    })
    return index === -1 ? 0 : index
  }, [items, pathname, search])

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

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, item: NavItem) => {
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
          className="pointer-events-auto relative grid grid-cols-6 items-center rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--glass-bg]] px-1 py-1 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.55)] backdrop-blur-xl"
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
            const active = index === activeIndex
            const Icon = item.icon
            const badge = item.badge ?? 0
            return (
              <Link
                key={item.id}
                ref={(node) => {
                  linkRefs.current[index] = node
                }}
                to={item.to}
                aria-label={`${t(item.labelKey)}${badge ? ` (${badge})` : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={(event) => handleClick(event, item)}
                className="relative z-10 flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-[var(--text-tertiary)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)] active:scale-[0.97]"
              >
                <span className="relative flex items-center justify-center">
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    style={{ color: active ? 'var(--accent-glow)' : undefined }}
                  />
                  {badge > 0 && (
                    <span
                      className={`absolute -right-2.5 -top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-bold leading-none text-white ${
                        item.badgeTone === 'cyan' ? 'bg-cyan-500' : 'bg-rose-500'
                      }`}
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
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
