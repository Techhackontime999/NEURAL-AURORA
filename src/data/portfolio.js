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

export const services = [
  {
    service_id: 'web-dev',
    icon_name: 'Globe',
    title: 'Web Development',
    tagline: 'Full-stack applications that perform',
    description: 'From landing pages to complex platforms \u2014 I build responsive, performant web apps using modern stacks like React, Next.js, Node.js, and Tailwind CSS.',
    features: ['Single-page & multi-page apps', 'API integration & backend', 'Performance optimization', 'Responsive design'],
    display_order: 0,
  },
  {
    service_id: 'ui-ux',
    icon_name: 'Palette',
    title: 'UI/UX Design',
    tagline: 'Interfaces people love to use',
    description: 'Human-centered design with a focus on accessibility, micro-interactions, and visual polish. Every pixel has a purpose.',
    features: ['Wireframing & prototyping', 'Design systems & tokens', 'Motion & micro-interactions', 'Usability testing'],
    display_order: 1,
  },
  {
    service_id: 'consulting',
    icon_name: 'Lightbulb',
    title: 'Technical Consulting',
    tagline: 'Strategic guidance for your stack',
    description: 'Architecture reviews, tech stack advice, and code audits to help your team ship faster with fewer surprises.',
    features: ['Stack evaluation & planning', 'Code quality reviews', 'Performance audits', 'Team workshops'],
    display_order: 2,
  },
  {
    service_id: 'custom-projects',
    icon_name: 'MessageCircle',
    title: 'Custom Projects',
    tagline: 'Unique problems need unique solutions',
    description: 'Have something unconventional in mind? Let\u2019s talk about your idea and figure out the best way to bring it to life.',
    features: ['Scope & estimate', 'Iterative delivery', 'Ongoing support', 'Transparent communication'],
    display_order: 3,
  },
]

export const defaultServicePage = {
  hero_title: 'What I Can Do For You',
  hero_description: 'Every project starts with a conversation. Here is how I can help turn your ideas into reality.',
  process_title: 'How I Work',
  process_description: 'A transparent, collaborative process designed to keep you informed and involved at every stage.',
  pricing_title: 'Transparent Pricing',
  pricing_description: 'No hidden fees. Every project is scoped and quoted upfront based on your specific needs.',
  testimonials_title: 'What People Say',
  tech_title: 'Technologies I Use',
  tech_description: 'Modern tools for modern problems.',
  faq_title: 'Frequently Asked Questions',
  stats: [
    { icon_name: 'Users', label: 'Happy Clients', value: 30, suffix: '+' },
    { icon_name: 'Code', label: 'Projects Delivered', value: 50, suffix: '+' },
    { icon_name: 'Clock', label: 'Years Experience', value: 2, suffix: '+' },
    { icon_name: 'Award', label: 'Satisfaction Rate', value: 98, suffix: '%' },
  ],
  process_steps: [
    { icon_name: 'MessageCircle', title: 'Discovery', description: 'We talk through your vision, goals, and constraints. No jargon, just clarity.' },
    { icon_name: 'Target', title: 'Strategy', description: 'I map out the architecture, tech stack, and timeline tailored to your project.' },
    { icon_name: 'Zap', title: 'Execution', description: 'Iterative builds with regular check-ins so you are never left in the dark.' },
    { icon_name: 'Sparkles', title: 'Launch & Support', description: 'Deploy, monitor, and iterate. I stay around to make sure everything runs smoothly.' },
  ],
  packages: [
    {
      name: 'Starter',
      price: '2.5k',
      currency: '$',
      period: '/project',
      icon_name: 'Code',
      features: ['Single-page application', 'Responsive design', 'Basic animations', '1 revision round', '2-week delivery'],
      popular: false,
    },
    {
      name: 'Growth',
      price: '7k',
      currency: '$',
      period: '/project',
      icon_name: 'Cpu',
      features: ['Multi-page application', 'Full backend integration', 'Custom micro-interactions', '3 revision rounds', 'SEO optimization', 'Performance audit'],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '15k',
      currency: '$',
      period: '/project',
      icon_name: 'Star',
      features: ['Complex platform build', 'Team augmentation', 'Dedicated support', 'Unlimited revisions', 'CI/CD setup', 'Security audit', '12-week support'],
      popular: false,
    },
  ],
  testimonials: [
    { quote: 'Transformed our outdated platform into something that actually feels modern. Users noticed immediately.', author: 'Riya S.', role: 'Product Lead, TechCorp' },
    { quote: 'Rare combination of design sense and technical depth. Delivered ahead of schedule.', author: 'Ankit P.', role: 'Founder, DevStudio' },
    { quote: 'The micro-interactions and animations took our UX from good to unforgettable.', author: 'Priya M.', role: 'Design Director, WebFlow Labs' },
  ],
  tech_stack: [
    { icon_name: 'Braces', label: 'React' },
    { icon_name: 'Braces', label: 'Next.js' },
    { icon_name: 'Layout', label: 'Tailwind CSS' },
    { icon_name: 'Server', label: 'Node.js' },
    { icon_name: 'Database', label: 'PostgreSQL' },
    { icon_name: 'PenTool', label: 'Figma' },
    { icon_name: 'GitFork', label: 'GitHub' },
    { icon_name: 'Terminal', label: 'TypeScript' },
    { icon_name: 'Braces', label: 'Three.js' },
    { icon_name: 'Cpu', label: 'Framer Motion' },
  ],
  live_feed: [
    { time: '2 min ago', event: 'Deployed v2.4 for Synaptic Dashboard' },
    { time: '15 min ago', event: 'New build passed all CI checks' },
    { time: '1 hr ago', event: 'Client feedback integrated \u2014 UI revamp phase 2' },
    { time: '3 hrs ago', event: 'Database migration completed successfully' },
    { time: '6 hrs ago', event: 'Performance audit \u2014 96 Lighthouse score' },
  ],
  faqs: [
    { q: 'How long does a typical project take?', a: 'Most projects range from 2 to 8 weeks depending on scope. We will agree on a timeline during the discovery phase.' },
    { q: 'What is your development process?', a: 'I follow an iterative approach with regular check-ins. You will see progress every few days, not just at the end.' },
    { q: 'Do you provide ongoing support?', a: 'Absolutely. Every project comes with a support window. Extended maintenance can be arranged separately.' },
    { q: 'Can you work with existing codebases?', a: 'Yes. I regularly audit and improve existing projects. Compatibility and tech stack alignment are assessed upfront.' },
    { q: 'What if I only need design, not development?', a: 'That works too. I offer standalone UI/UX design services including wireframes, prototypes, and design systems.' },
  ],
}

export const caseStudies = [
  {
    id: 'cs-1',
    title: 'Neural Aurora — A Synaptic Portfolio',
    slug: 'neural-aurora-synaptic-portfolio',
    description: 'Designed and developed an immersive portfolio experience featuring a living neural network suspended in an aurora field.',
    outcome: 'Increased engagement by 300% and received features on multiple design platforms.',
    content: `<p>Neural Aurora is a cutting-edge interactive portfolio that pushes the boundaries of web-based 3D experiences. Built with React and Three.js, it features a living neural network visualization that responds to user interaction in real-time.</p>
<p>The project combines artistic vision with technical excellence, creating an immersive experience that showcases both design sensibility and engineering capability.</p>
<h3>Key Challenges</h3>
<p>Creating a seamless 3D environment that performs well across devices while maintaining visual fidelity was the primary challenge. The neural network visualization required careful optimization to run smoothly on mid-range hardware.</p>
<h3>Approach</h3>
<p>We used React Three Fiber for the 3D scene management, implementing custom shaders for the aurora effect and particle systems for the neural connections. Framer Motion was used for UI transitions and micro-interactions.</p>
<h3>Results</h3>
<p>The project achieved a 300% increase in user engagement compared to traditional portfolio layouts and was featured on multiple design platforms for its innovative approach to personal branding.</p>`,
    tech: ['React', 'Three.js', 'Framer Motion'],
  },
  {
    id: 'cs-2',
    title: 'E-Commerce Redesign',
    slug: 'ecommerce-redesign',
    description: 'Led a complete redesign of an e-commerce platform, improving UX and performance.',
    outcome: '40% increase in conversion rate and 60% improvement in page load time.',
    content: `<p>A comprehensive redesign of a legacy e-commerce platform that was struggling with poor performance and outdated user experience. The goal was to modernize the interface while significantly improving core web vitals.</p>
<h3>Key Challenges</h3>
<p>The existing platform had accumulated significant technical debt, with slow page loads, inconsistent UI components, and a checkout flow that was causing cart abandonment.</p>
<h3>Approach</h3>
<p>We migrated from a monolithic architecture to Next.js with Tailwind CSS, implementing server-side rendering for product pages and optimizing images with next/image. The checkout flow was rebuilt from the ground up with Stripe integration.</p>
<h3>Results</h3>
<p>The redesign delivered a 40% increase in conversion rate and 60% improvement in page load time, with a 25% reduction in cart abandonment during checkout.</p>`,
    tech: ['Next.js', 'Tailwind CSS', 'Stripe'],
  },
]
