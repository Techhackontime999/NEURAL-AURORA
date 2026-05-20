import { useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import AuroraBackground from './components/AuroraBackground'
import Hero from './components/Hero'
import About from './components/About'
import Skills from './components/Skills'
import Projects from './components/Projects'
import Resume from './components/Resume'
import Contact from './components/Contact'
import More from './components/More'
import Service from './components/Service'
import Blog from './components/Blog'
import BlogPost from './components/BlogPost'
import { Footer } from './components/ui/footer-section'

function HomePage() {
  const mouse = useRef({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    mouse.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: (e.clientY / window.innerHeight) * 2 - 1,
    }
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-screen overflow-hidden"
    >
      <AuroraBackground mouse={mouse} />
      <Navbar />
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Resume />
      <Contact />
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/more" element={<More />} />
      <Route path="/services" element={<Service />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
    </Routes>
  )
}
