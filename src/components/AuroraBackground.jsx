import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

function NeuralParticles({ count = 600 }) {
  const meshRef = useRef()
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 40
      pos[i + 1] = (Math.random() - 0.5) * 40
      pos[i + 2] = (Math.random() - 0.5) * 30
    }
    return pos
  }, [count])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.02
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1
    }
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#00f0ff"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

function AuroraWaves() {
  const meshRef = useRef()
  const meshRef2 = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(t * 0.3) * 1.5
      meshRef.current.rotation.z = Math.sin(t * 0.15) * 0.1
    }
    if (meshRef2.current) {
      meshRef2.current.position.y = Math.sin(t * 0.25 + 1) * 1.8
      meshRef2.current.rotation.z = Math.sin(t * 0.12 + 0.5) * 0.12
    }
  })

  return (
    <group>
      <mesh ref={meshRef} position={[0, -2, -8]}>
        <planeGeometry args={[25, 6, 64, 64]} />
        <MeshDistortMaterial
          color="#00f0ff"
          transparent
          opacity={0.08}
          distort={0.3}
          speed={2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={meshRef2} position={[0, -1, -6]}>
        <planeGeometry args={[20, 5, 64, 64]} />
        <MeshDistortMaterial
          color="#b829dd"
          transparent
          opacity={0.06}
          distort={0.4}
          speed={1.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function NeuralNodes() {
  const nodes = useMemo(() => {
    const arr = []
    for (let i = 0; i < 30; i++) {
      arr.push({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 10 - 5,
        ],
        scale: Math.random() * 0.5 + 0.3,
        color: Math.random() > 0.5 ? '#00f0ff' : '#b829dd',
      })
    }
    return arr
  }, [])

  const connections = useMemo(() => {
    const conns = []
    for (let i = 0; i < 40; i++) {
      const from = Math.floor(Math.random() * nodes.length)
      let to = Math.floor(Math.random() * nodes.length)
      while (to === from) to = Math.floor(Math.random() * nodes.length)
      const fromPos = new THREE.Vector3(...nodes[from].position)
      const toPos = new THREE.Vector3(...nodes[to].position)
      const dist = fromPos.distanceTo(toPos)
      if (dist < 8) {
        conns.push({ from: fromPos, to: toPos })
      }
    }
    return conns
  }, [nodes])

  return (
    <group>
      {nodes.map((node, i) => (
        <Float key={i} speed={0.5 + Math.random() * 0.5} rotationIntensity={0.05} floatIntensity={0.3}>
          <mesh position={node.position} scale={node.scale}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.7} />
          </mesh>
        </Float>
      ))}
      {connections.map((conn, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                conn.from.x, conn.from.y, conn.from.z,
                conn.to.x, conn.to.y, conn.to.z,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00f0ff" transparent opacity={0.08} />
        </line>
      ))}
    </group>
  )
}

function SynapticFire({ mouse }) {
  const ref = useRef()
  const particles = useMemo(() => {
    const pos = new Float32Array(100 * 3)
    for (let i = 0; i < 100 * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 2
      pos[i + 1] = (Math.random() - 0.5) * 2
      pos[i + 2] = (Math.random() - 0.5) * 2
    }
    return pos
  }, [])

  useFrame((state) => {
    if (ref.current) {
      const tx = (mouse.current?.x || 0) * 2
      const ty = -(mouse.current?.y || 0) * 2
      ref.current.position.x += (tx - ref.current.position.x) * 0.02
      ref.current.position.y += (ty - ref.current.position.y) * 0.02
      ref.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={100}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#ff006e"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

function ThemeBackground() {
  const { scene } = useThree()

  useEffect(() => {
    const update = () => {
      const isDark = document.documentElement.classList.contains('dark')
      const color = isDark ? '#050508' : '#f3ede1'
      scene.background = new THREE.Color(color)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [scene])

  return null
}

export default function AuroraBackground({ mouse }) {
  return (
    <div className="fixed inset-0 z-0 noise-overlay">
      <Canvas camera={{ position: [0, 0, 12], fov: 60 }}>
        <ThemeBackground />
        <color attach="background" args={['#050508']} />
        <NeuralParticles />
        <AuroraWaves />
        <NeuralNodes />
        <SynapticFire mouse={mouse} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
      </Canvas>
    </div>
  )
}
