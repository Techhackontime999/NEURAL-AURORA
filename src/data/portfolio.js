export const personalInfo = {
  name: 'Amit Kumar',
  handle: 'Techhackontime999',
  title: 'Full-Stack Developer & UI/UX Architect',
  tagline: 'Crafting digital experiences where neural networks meet aurora light',
  bio: 'A passionate developer who builds immersive digital experiences at the intersection of creative design and engineering. I architect systems that breathe, think, and respond in real-time.',
  avatar: '/images/profile.jpg',
  resume: '/resume.pdf',
}

export const socialLinks = [
  { label: 'GitHub', url: 'https://github.com/Techhackontime999', icon: 'github' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/mr-amit-kumar-bb8088296/', icon: 'linkedin' },
  { label: 'LeetCode', url: 'https://leetcode.com/u/techhackontime999/', icon: 'code' },
  { label: 'Codeforces', url: 'https://codeforces.com/profile/Techhackontime999', icon: 'terminal' },
  { label: 'X / Twitter', url: 'https://x.com/Techhackontime/', icon: 'x' },
  { label: 'YouTube', url: 'https://www.youtube.com/@Techhackontime999', icon: 'youtube' },
  { label: 'Instagram', url: 'https://www.instagram.com/techhackontime999/', icon: 'instagram' },
  { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61559725537190', icon: 'facebook' },
]

export const skills = [
  { name: 'React / Next.js', level: 92, category: 'frontend' },
  { name: 'Three.js / WebGL', level: 78, category: 'frontend' },
  { name: 'TypeScript', level: 85, category: 'language' },
  { name: 'Node.js / Express', level: 88, category: 'backend' },
  { name: 'Python', level: 82, category: 'language' },
  { name: 'Tailwind CSS', level: 95, category: 'frontend' },
  { name: 'Framer Motion', level: 80, category: 'frontend' },
  { name: 'PostgreSQL', level: 75, category: 'backend' },
  { name: 'Docker', level: 70, category: 'devops' },
  { name: 'Git / CI/CD', level: 85, category: 'devops' },
  { name: 'Rust', level: 55, category: 'language' },
  { name: 'UI/UX Design', level: 88, category: 'design' },
]

export const projects = [
  {
    id: 'neural-aurora',
    title: 'NEURAL AURORA',
    description: 'An immersive interactive portfolio experience featuring a living neural network suspended in an aurora field. Projects fire across synaptic pathways with real-time interaction.',
    technologies: ['React', 'Three.js', 'Framer Motion', 'Tailwind CSS'],
    image: '/images/project-1.png',
    github: 'https://github.com/Techhackontime999/NEURAL-AURORA',
    link: null,
    demo: null,
  },
  {
    id: 'synaptic-dashboard',
    title: 'Synaptic Dashboard',
    description: 'A real-time analytics dashboard with neural network visualization, adaptive data flow monitoring, and interactive node-based filtering.',
    technologies: ['React', 'D3.js', 'Node.js', 'WebSocket'],
    image: '/images/project-2.png',
    github: null,
    link: null,
    demo: null,
  },
  {
    id: 'aurora-engine',
    title: 'Aurora Engine',
    description: 'A GPU-accelerated particle system and dynamic lighting engine for creating ethereal aurora visualizations in browser environments.',
    technologies: ['Three.js', 'WebGL', 'GLSL', 'TypeScript'],
    image: '/images/project-3.png',
    github: 'https://github.com/Techhackontime999',
    link: null,
    demo: null,
  },
  {
    id: 'codeflux',
    title: 'CodeFlux',
    description: 'A collaborative coding platform with real-time execution environment, multi-language support, and integrated version control.',
    technologies: ['Next.js', 'WebSocket', 'Docker', 'PostgreSQL'],
    image: '/images/project-4.png',
    github: null,
    link: null,
    demo: null,
  },
  {
    id: 'pixel-oracle',
    title: 'Pixel Oracle',
    description: 'AI-powered image generation and manipulation tool with a focus on creative workflows and intuitive visual programming interfaces.',
    technologies: ['Python', 'TensorFlow', 'React', 'FastAPI'],
    image: '/images/project-5.png',
    github: 'https://github.com/Techhackontime999',
    link: null,
    demo: null,
  },
  {
    id: 'quantum-shell',
    title: 'Quantum Shell',
    description: 'A modern terminal emulator with GPU-accelerated rendering, customizable neural themes, and plugin-based extensibility.',
    technologies: ['Rust', 'WebAssembly', 'React', 'xterm.js'],
    image: '/images/project-6.jpg',
    github: null,
    link: null,
    demo: null,
  },
]

export const education = [
  {
    id: 'btech',
    degree: 'B.Tech in Computer Science',
    school: 'University of Technology',
    year: '2022 — 2026',
    description: 'Focused on software engineering, AI/ML, and distributed systems. Built full-stack applications and contributed to open-source.',
  },
  {
    id: 'diploma',
    degree: 'Diploma in Web Development',
    school: 'Codecademy Pro',
    year: '2021 — 2022',
    description: 'Intensive program covering modern web technologies including React, Node.js, and database design.',
  },
]

export const experience = [
  {
    id: 'exp-1',
    role: 'Full-Stack Developer Intern',
    company: 'TechCorp Inc.',
    year: '2024 — Present',
    description: 'Building internal tools and customer-facing dashboards. Working with React, Node.js, and PostgreSQL.',
  },
  {
    id: 'exp-2',
    role: 'Freelance Web Developer',
    company: 'Self-Employed',
    year: '2023 — 2024',
    description: 'Designed and developed responsive websites for small businesses. Specialized in React and Tailwind CSS.',
  },
  {
    id: 'exp-3',
    role: 'Open Source Contributor',
    company: 'Various Projects',
    year: '2022 — Present',
    description: 'Contributed to multiple open-source projects including documentation, bug fixes, and feature implementations.',
  },
]

export const blogPosts = [
  {
    id: 'post-1',
    title: 'Building Immersive Web Experiences with Three.js',
    slug: 'building-immersive-web-threejs',
    excerpt: 'Exploring how to create stunning 3D visualizations in the browser using Three.js and React Three Fiber.',
    content: 'Three.js has revolutionized the way we think about web graphics...',
    date: '2024-12-15',
    readTime: '5 min read',
    tags: ['Three.js', 'WebGL', 'React'],
  },
  {
    id: 'post-2',
    title: 'The Future of AI in Frontend Development',
    slug: 'future-ai-frontend',
    excerpt: 'How artificial intelligence is reshaping the way we build user interfaces and developer workflows.',
    content: 'Artificial intelligence is no longer a futuristic concept...',
    date: '2024-11-28',
    readTime: '7 min read',
    tags: ['AI', 'Frontend', 'Development'],
  },
  {
    id: 'post-3',
    title: 'Mastering Tailwind CSS for Production Apps',
    slug: 'mastering-tailwind-css',
    excerpt: 'Tips and tricks for using Tailwind CSS effectively in large-scale production applications.',
    content: 'Tailwind CSS has become one of the most popular CSS frameworks...',
    date: '2024-10-10',
    readTime: '6 min read',
    tags: ['CSS', 'Tailwind', 'Design'],
  },
]

export const caseStudies = [
  {
    id: 'cs-1',
    title: 'Neural Aurora — A Synaptic Portfolio',
    description: 'Designed and developed an immersive portfolio experience featuring a living neural network suspended in an aurora field.',
    outcome: 'Increased engagement by 300% and received features on multiple design platforms.',
    tech: ['React', 'Three.js', 'Framer Motion'],
  },
  {
    id: 'cs-2',
    title: 'E-Commerce Redesign',
    description: 'Led a complete redesign of an e-commerce platform, improving UX and performance.',
    outcome: '40% increase in conversion rate and 60% improvement in page load time.',
    tech: ['Next.js', 'Tailwind CSS', 'Stripe'],
  },
]
