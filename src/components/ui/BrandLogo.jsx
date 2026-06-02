import { motion, useMotionValue, useTransform } from 'framer-motion'

const neuralNodes = [
  { cx: 22.5, cy: 26, r: 3.5, delay: 0 },
  { cx: 17.5, cy: 55, r: 3, delay: 0.6 },
  { cx: 27.5, cy: 80, r: 3.5, delay: 1.2 },
  { cx: 61, cy: 16, r: 3, delay: 1.8 },
  { cx: 84, cy: 31, r: 4, delay: 2.4 },
  { cx: 85, cy: 64, r: 3, delay: 3 },
  { cx: 70, cy: 85, r: 3.5, delay: 3.6 },
  { cx: 10, cy: 40, r: 2, delay: 0.3 },
  { cx: 90, cy: 50, r: 2.5, delay: 1.5 },
  { cx: 40, cy: 10, r: 2, delay: 2.1 },
  { cx: 60, cy: 92, r: 2, delay: 3.3 },
]

const connections = [
  [0, 3], [0, 4], [1, 2], [1, 5], [2, 6],
  [3, 4], [3, 7], [4, 5], [4, 8], [5, 6],
  [7, 8], [0, 9], [6, 10],
]

function NeuralIcon({ size = 32 }) {
  const s = size / 100

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#AFA9EC" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#AFA9EC" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="orbFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#AFA9EC" />
          <stop offset="100%" stopColor="#5DCAA5" />
        </linearGradient>
        <linearGradient id="orbCore" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EEEDFE" />
          <stop offset="100%" stopColor="#9FE1CB" />
        </linearGradient>
        <filter id="neonGlow">
          <feGaussianBlur stdDeviation={2 * s} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.circle cx="50" cy="50" r={45 * s} fill="url(#orbGlow)" opacity={0.15} />

      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="50" cy="50" r={32 * s} stroke="#7F77DD" strokeOpacity={0.12} strokeWidth={0.8 * s} strokeDasharray="4 6" />
      </motion.g>

      <motion.g
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="50" cy="50" r={24 * s} stroke="#5DCAA5" strokeOpacity={0.08} strokeWidth={0.6 * s} strokeDasharray="2 4" />
      </motion.g>

      {connections.map(([i, j]) => (
        <motion.line
          key={`${i}-${j}`}
          x1={neuralNodes[i].cx * s}
          y1={neuralNodes[i].cy * s}
          x2={neuralNodes[j].cx * s}
          y2={neuralNodes[j].cy * s}
          stroke="#7F77DD"
          strokeOpacity={0.1}
          strokeWidth={0.5 * s}
          animate={{ strokeOpacity: [0.06, 0.15, 0.06] }}
          transition={{ duration: 3 + (i + j) % 3, repeat: Infinity, ease: 'easeInOut', delay: (i + j) * 0.2 }}
        />
      ))}

      <g stroke="#5DCAA5" strokeOpacity={0.2} strokeWidth={0.7 * s}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <motion.line
            key={`ray-${i}`}
            x1={50 * s} y1={50 * s}
            x2={neuralNodes[i].cx * s} y2={neuralNodes[i].cy * s}
            animate={{ strokeOpacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: neuralNodes[i].delay }}
          />
        ))}
      </g>

      {neuralNodes.map((node) => (
        <motion.circle
          key={node.cx}
          cx={node.cx * s}
          cy={node.cy * s}
          r={node.r * s}
          fill="#AFA9EC"
          stroke="#7F77DD"
          strokeWidth={0.6 * s}
          animate={{
            r: [node.r * s, (node.r + 1) * s, node.r * s],
            opacity: [1, 0.5, 1],
            filter: [
              'drop-shadow(0 0 0px #AFA9EC)',
              'drop-shadow(0 0 3px #AFA9EC)',
              'drop-shadow(0 0 0px #AFA9EC)',
            ],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: node.delay,
          }}
        />
      ))}

      <motion.circle
        cx={50 * s} cy={50 * s} r={10 * s}
        fill="url(#orbFill)"
        fillOpacity={0.35}
        animate={{ r: [10 * s, 11.5 * s, 10 * s] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <circle cx={50 * s} cy={50 * s} r={5.5 * s} fill="url(#orbCore)" fillOpacity={0.95} />
      <circle cx={48.5 * s} cy={48.5 * s} r={2 * s} fill="white" fillOpacity={0.5} />

      {[0, 1, 2].map((i) => (
        <motion.circle
          key={`orbital-${i}`}
          cx={50 * s} cy={50 * s} r={2 * s}
          fill="#5DCAA5"
          fillOpacity={0.6}
          animate={{
            cx: [
              50 * s + Math.cos(i * 2.094) * 20 * s,
              50 * s + Math.cos(i * 2.094 + 6.283) * 20 * s,
            ],
            cy: [
              50 * s + Math.sin(i * 2.094) * 20 * s,
              50 * s + Math.sin(i * 2.094 + 6.283) * 20 * s,
            ],
          }}
          transition={{
            duration: 8 - i,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </motion.svg>
  )
}

function Wordmark({ size = 'default' }) {
  const isSmall = size === 'small'
  return (
    <motion.div
      className="flex flex-col leading-none"
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <span className={`font-display font-bold tracking-tight ${
        isSmall ? 'text-sm' : 'text-base'
      } bg-gradient-to-r from-[#EEEDFE] via-[#AFA9EC] to-[#7F77DD] bg-clip-text text-transparent`}>
        NEURAL
      </span>
      <span className={`font-display font-light tracking-[0.15em] ${
        isSmall ? 'text-[10px]' : 'text-xs'
      } bg-gradient-to-r from-[#5DCAA5] to-[#1D9E75] bg-clip-text text-transparent`}>
        AURORA
      </span>
    </motion.div>
  )
}

export function BrandLogo({ size = 'default', showWordmark = true, asLink = false, onClick }) {
  const iconSize = size === 'small' ? 20 : size === 'large' ? 48 : 28
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-0.5, 0.5], [6, -6])
  const rotateY = useTransform(x, [-0.5, 0.5], [-6, 6])

  function onMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    x.set(px)
    y.set(py)
  }

  function onMouseLeave() {
    x.set(0)
    y.set(0)
  }

  function handleClick(e) {
    if (onClick) {
      onClick(e)
    }
  }

  const content = (
    <motion.div
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={handleClick}
      style={{ rotateX, rotateY, perspective: 800 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="inline-flex items-center gap-1.5 cursor-pointer select-none"
    >
      <NeuralIcon size={iconSize} />
      {showWordmark && <Wordmark size={size} />}
    </motion.div>
  )

  if (asLink && !onClick) {
    return (
      <a href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/'; window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
        {content}
      </a>
    )
  }

  return content
}

export function BrandLogoFull({ className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center gap-2 ${className}`}
    >
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <NeuralIcon size={48} />
      </motion.div>
      <span className="text-2xl font-display font-bold tracking-tight bg-gradient-to-r from-[#EEEDFE] via-[#AFA9EC] to-[#7F77DD] bg-clip-text text-transparent">
        NEURAL
      </span>
      <span className="text-lg font-display font-light tracking-[0.2em] bg-gradient-to-r from-[#5DCAA5] to-[#1D9E75] bg-clip-text text-transparent -mt-1">
        AURORA
      </span>
      <motion.p
        className="text-[10px] text-black/40 dark:text-white/20 tracking-[0.2em] uppercase mt-1"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        Your Portfolio. Your Identity. Your Rules.
      </motion.p>
    </motion.div>
  )
}
