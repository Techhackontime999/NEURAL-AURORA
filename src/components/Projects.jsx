import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { projects } from '../data/portfolio'

function GithubIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ProjectCard({ project, index }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 80, damping: 20 }}
      className={`glass-panel rounded-[2rem] overflow-hidden group cursor-pointer transition-all duration-500 ${
        expanded ? 'md:col-span-2 md:row-span-2' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="relative overflow-hidden aspect-[4/3]">
        <motion.img
          layout
          src={project.image}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-transparent" />
        <div className="absolute top-4 left-4 flex gap-2">
          {project.technologies.slice(0, 2).map((tech) => (
            <span
              key={tech}
              className="text-[10px] px-2 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-black/50 dark:text-white/40"
            >
              {tech}
            </span>
          ))}
          {project.technologies.length > 2 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-black/40 dark:text-white/30">
              +{project.technologies.length - 2}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-3">
        <motion.h3 layout className="text-lg font-display font-bold text-black/80 dark:text-white/90 tracking-tight">
          {project.title}
        </motion.h3>
        <motion.p
          layout
          className={`text-sm text-black/50 dark:text-white/40 leading-relaxed ${
            expanded ? '' : 'line-clamp-2'
          }`}
        >
          {project.description}
        </motion.p>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 80, damping: 20 }}
              className="space-y-4 pt-2"
            >
              <div className="flex flex-wrap gap-2">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="text-xs px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              <div className="flex gap-4 mt-1">
                {['github', 'link', 'demo'].map((type) => {
                  const url = project[type]
                  const Icon = type === 'github' ? GithubIcon : type === 'link' ? LinkIcon : PlayIcon
                  return url ? (
                    <a key={type} href={url} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="group text-xs text-black/50 dark:text-white/40 hover:text-black/80 dark:hover:text-white/80 transition-colors flex items-center gap-1.5"
                    >
                      <Icon />
                      <span className="relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-current after:transition-all after:duration-300 group-hover:after:w-full">{type === 'github' ? 'Source' : type === 'link' ? 'Link' : 'Demo'}</span>
                    </a>
                  ) : (
                    <span key={type} className="text-xs text-black/20 dark:text-white/20 flex items-center gap-1.5 cursor-not-allowed">
                      <Icon />
                      {type === 'github' ? 'Source' : type === 'link' ? 'Link' : 'Demo'}
                    </span>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default function Projects() {
  return (
    <section id="projects" className="relative z-10 py-32 md:py-40">
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <span className="eyebrow">Portfolio</span>
          <h2 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-none">
            Neural <span className="text-gradient">Projects</span>
          </h2>
          <p className="mt-4 text-base text-black/50 dark:text-white/40 max-w-[65ch] leading-relaxed">
            Each project is a node in a growing neural network. Click to expand and explore the synaptic connections.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-auto">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
