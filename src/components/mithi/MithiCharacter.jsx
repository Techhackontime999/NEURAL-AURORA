import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Mithi's character is an original vector parrot (no photo asset exists in the
 * repo). Animation is limited to a gentle breath, blink, head tilt and a short
 * celebration hop — never CSS distortions of a photograph.
 */
export default function MithiCharacter({
  size = 64,
  mood = 'idle',
  className = '',
  decorative = false,
}) {
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const shouldReduceMotion = useReducedMotion()

  const sleepy = mood === 'sleepy'
  const curious = mood === 'curious'
  const celebrating = mood === 'celebrate'

  const bodyAnimation = shouldReduceMotion
    ? undefined
    : {
        y: celebrating ? [0, -6, 0, -3, 0] : [0, -1.6, 0],
        rotate: celebrating ? [0, -3, 3, 0] : [0, 0.8, 0],
      }

  const bodyTransition = celebrating
    ? { duration: 0.9, ease: 'easeInOut' }
    : { duration: 5.2, repeat: Infinity, ease: 'easeInOut' }

  const headAnimation = shouldReduceMotion
    ? undefined
    : {
        rotate: celebrating ? [0, -8, 7, 0] : curious ? -5 : sleepy ? 4 : [0, -1.2, 0],
      }

  const headTransition = celebrating
    ? { duration: 0.8, ease: 'easeInOut' }
    : curious || sleepy
      ? { type: 'spring', stiffness: 180, damping: 14 }
      : { duration: 4.8, repeat: Infinity, ease: 'easeInOut' }

  return (
    <motion.svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : 'Mithi, a green parrot portfolio companion'}
      focusable="false"
    >
      <defs>
        <linearGradient id={`mithi-body-${uid}`} x1="20" y1="24" x2="76" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ee7a0" />
          <stop offset="48%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id={`mithi-head-${uid}`} x1="28" y1="18" x2="70" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="52%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id={`mithi-wing-${uid}`} x1="24" y1="52" x2="48" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id={`mithi-beak-${uid}`} x1="66" y1="42" x2="80" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="45%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id={`mithi-tail-${uid}`} x1="33" y1="72" x2="58" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="55%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <radialGradient id={`mithi-cheek-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#d9f99d" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#86efac" stopOpacity="0" />
        </radialGradient>
      </defs>

      <motion.g
        animate={bodyAnimation}
        transition={bodyTransition}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        {/* Tail feathers */}
        <path
          d="M32 68C28 80 30 89 36 95C37 86 40 77 45 70Z"
          fill={`url(#mithi-tail-${uid})`}
          stroke="#064e3b"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M58 70C63 81 62 90 57 96C55 87 51 78 48 71Z"
          fill={`url(#mithi-tail-${uid})`}
          stroke="#064e3b"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M44 72C46 83 47 91 46 96C42 88 40 79 40 71Z"
          fill="#4ade80"
          stroke="#065f46"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Body */}
        <path
          d="M25 48C22 63 27 79 44 85C60 90 74 78 75 60C76 44 67 33 51 33C37 33 28 38 25 48Z"
          fill={`url(#mithi-body-${uid})`}
          stroke="#065f46"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Belly */}
        <ellipse cx="52" cy="66" rx="14" ry="18" fill="#bbf7d0" opacity="0.42" />

        {/* Wing */}
        <motion.g
          animate={
            shouldReduceMotion || !celebrating
              ? undefined
              : { rotate: [0, -13, 8, 0] }
          }
          transition={celebrating ? { duration: 0.75, ease: 'easeInOut' } : undefined}
          style={{ transformBox: 'fill-box', transformOrigin: '80% 18%' }}
        >
          <path
            d="M29 51C20 56 21 70 29 77C36 83 44 78 47 70C39 71 33 63 29 51Z"
            fill={`url(#mithi-wing-${uid})`}
            stroke="#065f46"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M30 58C27 62 29 69 34 73"
            fill="none"
            stroke="#bbf7d0"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.45"
          />
        </motion.g>

        {/* Feet peek out */}
        <path d="M42 84L40 89M42 84L44 89" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <path d="M57 84L56 89M57 84L59 89" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />

        {/* Head, face and crest */}
        <motion.g
          animate={headAnimation}
          transition={headTransition}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <path
            d="M39 23C34 13 39 7 45 18C46 20 46 22 45 24Z"
            fill="#34d399"
            stroke="#065f46"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M48 20C47 9 53 5 56 17C56 19 55 22 54 24Z"
            fill="#4ade80"
            stroke="#065f46"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M57 23C60 13 66 12 65 24C65 26 64 28 62 29Z"
            fill="#22c55e"
            stroke="#065f46"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />

          <circle
            cx="49"
            cy="39"
            r="22"
            fill={`url(#mithi-head-${uid})`}
            stroke="#065f46"
            strokeWidth="1.4"
          />

          <ellipse cx="49" cy="45" rx="12" ry="10" fill={`url(#mithi-cheek-${uid})`} />
          <ellipse cx="39" cy="29" rx="8" ry="5" fill="#ecfdf5" opacity="0.17" transform="rotate(-24 39 29)" />

          {/* Eye */}
          <ellipse cx="57" cy="36" rx="7.4" ry="7.6" fill="#fff7d6" stroke="#065f46" strokeWidth="1" />
          <motion.g
            animate={
              shouldReduceMotion
                ? undefined
                : { scaleY: sleepy ? 0.28 : [1, 1, 0.12, 1] }
            }
            transition={
              sleepy
                ? { duration: 0.25 }
                : {
                    duration: 0.32,
                    times: [0, 0.82, 0.92, 1],
                    repeat: Infinity,
                    repeatDelay: 4.8,
                    ease: 'easeInOut',
                  }
            }
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <ellipse cx="58.4" cy="36.5" rx="3.5" ry="4.1" fill="#0f172a" />
            <circle cx="59.7" cy="34.8" r="1.25" fill="#ffffff" />
          </motion.g>
          {sleepy && (
            <path d="M53 36.7C55 38 60 38 62 36.7" fill="none" stroke="#065f46" strokeWidth="1.1" strokeLinecap="round" />
          )}

          {/* Beak */}
          <path
            d="M66 42C72 39 79 42 80 47C81 51 75 53 69 51C66 50 64 46 66 42Z"
            fill={`url(#mithi-beak-${uid})`}
            stroke="#7f1d1d"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M68 51C71 54 76 55 79 52C77 58 70 59 66 55C66 53 67 52 68 51Z"
            fill="#b91c1c"
            stroke="#7f1d1d"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path d="M69 45C71 45 73 46 74 47" fill="none" stroke="#fff7ed" strokeWidth="1.1" strokeLinecap="round" opacity="0.65" />
          <circle cx="69" cy="43.4" r="0.8" fill="#7f1d1d" opacity="0.75" />

          {/* Cheek freckles */}
          <circle cx="45" cy="44" r="1.1" fill="#166534" opacity="0.45" />
          <circle cx="42" cy="47" r="0.8" fill="#166534" opacity="0.35" />
        </motion.g>
      </motion.g>
    </motion.svg>
  )
}
