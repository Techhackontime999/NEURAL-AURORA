import { useRef } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'

export default function MagneticButton({ children, className = '', as: Tag = 'a', ...props }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useTransform(y, [-0.5, 0.5], [8, -8])
  const rotateY = useTransform(x, [-0.5, 0.5], [-8, 8])
  const translateX = useTransform(x, [-1, 1], [-8, 8])
  const translateY = useTransform(y, [-1, 1], [-8, 8])

  function handleMouse(e) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / rect.width
    const dy = (e.clientY - cy) / rect.height
    x.set(dx)
    y.set(dy)
  }

  function handleLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div whileTap={{ scale: 0.97 }} style={{ display: 'contents' }}>
      <Tag
        ref={ref}
        onMouseMove={handleMouse}
        onMouseLeave={handleLeave}
        style={{ rotateX, rotateY, translateX, translateY }}
        className={className}
        {...props}
      >
        {children}
      </Tag>
    </motion.div>
  )
}
