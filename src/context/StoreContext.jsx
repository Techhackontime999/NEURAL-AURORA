import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// ---------------------------------------------------------------------------
// Cart + wishlist state.
//
// Both are local to this browser and versioned in localStorage so a deploy can
// change the shape without breaking on old data. The server still owns prices,
// stock (published status) and entitlements — this context only remembers what
// the visitor asked for. A storage event keeps multiple tabs in sync.
// ---------------------------------------------------------------------------

const CART_KEY = 'neural-aurora:cart:v1'
const WISHLIST_KEY = 'neural-aurora:wishlist:v1'
// Coupons are remembered as a CODE only. It is always re-verified on the
// server: a saved code can expire or be exhausted between visits.
const COUPON_KEY = 'neural-aurora:coupon:v1'

// Mirrors api/_lib/order-pricing.js (MAX_ITEMS / MAX_QUANTITY).
export const CART_MAX_ITEMS = 20
export const CART_MAX_QUANTITY = 10
const WISHLIST_MAX_ITEMS = 200

const StoreContext = createContext(null)

function normaliseSlug(value) {
  return String(value || '').trim().toLowerCase()
}

function readList(key) {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private browsing or a full quota: the in-memory cart still works */
  }
}

function cleanCart(items) {
  const seen = new Set()
  const cleaned = []
  for (const item of Array.isArray(items) ? items : []) {
    const slug = normaliseSlug(item?.slug)
    if (!slug || seen.has(slug)) continue
    const quantity = Math.trunc(Number(item?.quantity))
    if (!Number.isFinite(quantity) || quantity < 1) continue
    seen.add(slug)
    cleaned.push({
      slug,
      quantity: Math.min(quantity, CART_MAX_QUANTITY),
      license_code: String(item?.license_code || '').slice(0, 80),
    })
    if (cleaned.length >= CART_MAX_ITEMS) break
  }
  return cleaned
}

function cleanCoupon(value) {
  const code = String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 24)
  return /^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(code) ? code : ''
}

function readCoupon() {
  if (typeof window === 'undefined') return ''
  try {
    return cleanCoupon(window.localStorage.getItem(COUPON_KEY))
  } catch {
    return ''
  }
}

function writeCoupon(value) {
  if (typeof window === 'undefined') return
  try {
    if (value) window.localStorage.setItem(COUPON_KEY, value)
    else window.localStorage.removeItem(COUPON_KEY)
  } catch {
    /* private browsing or a full quota: the in-memory value still works */
  }
}

function cleanWishlist(items) {
  const seen = new Set()
  const cleaned = []
  for (const value of Array.isArray(items) ? items : []) {
    const slug = normaliseSlug(value)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    cleaned.push(slug)
    if (cleaned.length >= WISHLIST_MAX_ITEMS) break
  }
  return cleaned
}

export function StoreProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => cleanCart(readList(CART_KEY)))
  const [wishlist, setWishlist] = useState(() => cleanWishlist(readList(WISHLIST_KEY)))
  const [couponCode, setCouponCode] = useState(() => readCoupon())

  useEffect(() => {
    writeList(CART_KEY, cartItems)
  }, [cartItems])

  useEffect(() => {
    writeList(WISHLIST_KEY, wishlist)
  }, [wishlist])

  useEffect(() => {
    writeCoupon(couponCode)
  }, [couponCode])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onStorage = (event) => {
      if (event.key === CART_KEY) setCartItems(cleanCart(readList(CART_KEY)))
      if (event.key === WISHLIST_KEY) setWishlist(cleanWishlist(readList(WISHLIST_KEY)))
      if (event.key === COUPON_KEY) setCouponCode(readCoupon())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addToCart = useCallback((product, { quantity = 1, licenseCode = '' } = {}) => {
    const slug = normaliseSlug(product?.slug)
    if (!slug) return false

    const requested = Math.trunc(Number(quantity))
    const amount = Number.isFinite(requested) && requested > 0
      ? Math.min(requested, CART_MAX_QUANTITY)
      : 1
    const code = String(licenseCode || '').slice(0, 80)

    setCartItems((current) => {
      const existing = current.find((item) => item.slug === slug)
      if (!existing) {
        if (current.length >= CART_MAX_ITEMS) return current
        return [...current, { slug, quantity: amount, license_code: code }]
      }
      return current.map((item) =>
        item.slug === slug
          ? {
              ...item,
              quantity: Math.min(CART_MAX_QUANTITY, item.quantity + amount),
              license_code: code || item.license_code,
            }
          : item
      )
    })
    return true
  }, [])

  const updateCartQuantity = useCallback((slug, quantity) => {
    const key = normaliseSlug(slug)
    const requested = Math.trunc(Number(quantity))
    if (!key || !Number.isFinite(requested)) return
    if (requested < 1) {
      setCartItems((current) => current.filter((item) => item.slug !== key))
      return
    }
    setCartItems((current) =>
      current.map((item) =>
        item.slug === key
          ? { ...item, quantity: Math.min(requested, CART_MAX_QUANTITY) }
          : item
      )
    )
  }, [])

  const setCartLicenseCode = useCallback((slug, licenseCode) => {
    const key = normaliseSlug(slug)
    const code = String(licenseCode || '').trim().slice(0, 80)
    if (!key) return
    setCartItems((current) =>
      current.map((item) =>
        item.slug === key ? { ...item, license_code: code } : item
      )
    )
  }, [])

  const removeFromCart = useCallback((slug) => {
    const key = normaliseSlug(slug)
    setCartItems((current) => current.filter((item) => item.slug !== key))
  }, [])

  const applyCouponCode = useCallback((value) => setCouponCode(cleanCoupon(value)), [])
  const clearCouponCode = useCallback(() => setCouponCode(''), [])

  const clearCart = useCallback(() => {
    setCartItems([])
    // A coupon belongs to a completed checkout, not the next basket.
    setCouponCode('')
  }, [])

  const addToWishlist = useCallback((slug) => {
    const key = normaliseSlug(slug)
    if (!key) return
    setWishlist((current) => (current.includes(key) ? current : [...current, key]))
  }, [])

  const removeFromWishlist = useCallback((slug) => {
    const key = normaliseSlug(slug)
    setWishlist((current) => current.filter((value) => value !== key))
  }, [])

  const toggleWishlist = useCallback(
    (slug) => {
      const key = normaliseSlug(slug)
      if (!key) return false
      const nowSaved = !wishlist.includes(key)
      setWishlist((current) => {
        if (current.includes(key)) return current.filter((value) => value !== key)
        return current.length >= WISHLIST_MAX_ITEMS ? current : [...current, key]
      })
      return nowSaved
    },
    [wishlist]
  )

  const isWishlisted = useCallback(
    (slug) => wishlist.includes(normaliseSlug(slug)),
    [wishlist]
  )

  const moveToCart = useCallback((slug) => {
    const key = normaliseSlug(slug)
    if (!key) return
    addToCart({ slug: key })
    setWishlist((current) => current.filter((value) => value !== key))
  }, [addToCart])

  const saveForLater = useCallback((slug) => {
    const key = normaliseSlug(slug)
    if (!key) return
    setWishlist((current) => (current.includes(key) ? current : [...current, key]))
    setCartItems((current) => current.filter((item) => item.slug !== key))
  }, [])

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  )

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      addToCart,
      updateCartQuantity,
      setCartLicenseCode,
      removeFromCart,
      clearCart,
      couponCode,
      applyCouponCode,
      clearCouponCode,
      wishlist,
      wishlistCount: wishlist.length,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isWishlisted,
      moveToCart,
      saveForLater,
    }),
    [
      cartItems,
      cartCount,
      addToCart,
      updateCartQuantity,
      setCartLicenseCode,
      removeFromCart,
      clearCart,
      couponCode,
      applyCouponCode,
      clearCouponCode,
      wishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isWishlisted,
      moveToCart,
      saveForLater,
    ]
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
