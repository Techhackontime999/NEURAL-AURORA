const { Client } = require('pg')
const path = require('path')

const client = new Client({
  connectionString: 'postgresql://postgres:Kumaramit%40%237654@db.vtbldaytmebyakoukswb.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

const sql = `
-- Seed initial portfolio data

-- Social Links
INSERT INTO social_links (label, url, icon, display_order) VALUES
  ('GitHub', 'https://github.com/Techhackontime999', 'github', 1),
  ('LinkedIn', 'https://www.linkedin.com/in/mr-amit-kumar-bb8088296/', 'linkedin', 2),
  ('LeetCode', 'https://leetcode.com/u/techhackontime999/', 'code', 3),
  ('Codeforces', 'https://codeforces.com/profile/Techhackontime999', 'terminal', 4),
  ('X / Twitter', 'https://x.com/Techhackontime/', 'x', 5),
  ('YouTube', 'https://www.youtube.com/@Techhackontime999', 'youtube', 6),
  ('Instagram', 'https://www.instagram.com/techhackontime999/', 'instagram', 7),
  ('Facebook', 'https://www.facebook.com/profile.php?id=61559725537190', 'facebook', 8)
ON CONFLICT DO NOTHING;

-- Skills
INSERT INTO skills (name, level, category, display_order) VALUES
  ('React / Next.js', 92, 'frontend', 1),
  ('Three.js / WebGL', 78, 'frontend', 2),
  ('TypeScript', 85, 'language', 1),
  ('Node.js / Express', 88, 'backend', 1),
  ('Python', 82, 'language', 2),
  ('Tailwind CSS', 95, 'frontend', 3),
  ('Framer Motion', 80, 'frontend', 4),
  ('PostgreSQL', 75, 'backend', 2),
  ('Docker', 70, 'devops', 1),
  ('Git / CI/CD', 85, 'devops', 2),
  ('Rust', 55, 'language', 3),
  ('UI/UX Design', 88, 'design', 1)
ON CONFLICT DO NOTHING;

-- Projects
INSERT INTO projects (project_id, title, description, technologies, image, github, link, demo, display_order) VALUES
  ('neural-aurora', 'NEURAL AURORA', 'An immersive interactive portfolio experience featuring a living neural network suspended in an aurora field. Projects fire across synaptic pathways with real-time interaction.', ARRAY['React', 'Three.js', 'Framer Motion', 'Tailwind CSS'], '/images/project-1.png', 'https://github.com/Techhackontime999/NEURAL-AURORA', NULL, NULL, 1),
  ('synaptic-dashboard', 'Synaptic Dashboard', 'A real-time analytics dashboard with neural network visualization, adaptive data flow monitoring, and interactive node-based filtering.', ARRAY['React', 'D3.js', 'Node.js', 'WebSocket'], '/images/project-2.png', NULL, NULL, NULL, 2),
  ('aurora-engine', 'Aurora Engine', 'A GPU-accelerated particle system and dynamic lighting engine for creating ethereal aurora visualizations in browser environments.', ARRAY['Three.js', 'WebGL', 'GLSL', 'TypeScript'], '/images/project-3.png', 'https://github.com/Techhackontime999', NULL, NULL, 3),
  ('codeflux', 'CodeFlux', 'A collaborative coding platform with real-time execution environment, multi-language support, and integrated version control.', ARRAY['Next.js', 'WebSocket', 'Docker', 'PostgreSQL'], '/images/project-4.png', NULL, NULL, NULL, 4),
  ('pixel-oracle', 'Pixel Oracle', 'AI-powered image generation and manipulation tool with a focus on creative workflows and intuitive visual programming interfaces.', ARRAY['Python', 'TensorFlow', 'React', 'FastAPI'], '/images/project-5.png', 'https://github.com/Techhackontime999', NULL, NULL, 5),
  ('quantum-shell', 'Quantum Shell', 'A modern terminal emulator with GPU-accelerated rendering, customizable neural themes, and plugin-based extensibility.', ARRAY['Rust', 'WebAssembly', 'React', 'xterm.js'], '/images/project-6.jpg', NULL, NULL, NULL, 6)
ON CONFLICT DO NOTHING;

-- Education
INSERT INTO education (edu_id, degree, school, year, description, display_order) VALUES
  ('btech', 'B.Tech in Computer Science', 'University of Technology', '2022 — 2026', 'Focused on software engineering, AI/ML, and distributed systems. Built full-stack applications and contributed to open-source.', 1),
  ('diploma', 'Diploma in Web Development', 'Codecademy Pro', '2021 — 2022', 'Intensive program covering modern web technologies including React, Node.js, and database design.', 2)
ON CONFLICT DO NOTHING;

-- Experience
INSERT INTO experience (exp_id, role, company, year, description, display_order) VALUES
  ('exp-1', 'Full-Stack Developer Intern', 'TechCorp Inc.', '2024 — Present', 'Building internal tools and customer-facing dashboards. Working with React, Node.js, and PostgreSQL.', 1),
  ('exp-2', 'Freelance Web Developer', 'Self-Employed', '2023 — 2024', 'Designed and developed responsive websites for small businesses. Specialized in React and Tailwind CSS.', 2),
  ('exp-3', 'Open Source Contributor', 'Various Projects', '2022 — Present', 'Contributed to multiple open-source projects including documentation, bug fixes, and feature implementations.', 3)
ON CONFLICT DO NOTHING;

-- Blog Posts
INSERT INTO blog_posts (post_id, title, slug, excerpt, content, date, read_time, tags) VALUES
  ('post-1', 'Building Immersive Web Experiences with Three.js', 'building-immersive-web-threejs', 'Exploring how to create stunning 3D visualizations in the browser using Three.js and React Three Fiber.', 'Three.js has revolutionized the way we think about web graphics...', '2024-12-15', '5 min read', ARRAY['Three.js', 'WebGL', 'React']),
  ('post-2', 'The Future of AI in Frontend Development', 'future-ai-frontend', 'How artificial intelligence is reshaping the way we build user interfaces and developer workflows.', 'Artificial intelligence is no longer a futuristic concept...', '2024-11-28', '7 min read', ARRAY['AI', 'Frontend', 'Development']),
  ('post-3', 'Mastering Tailwind CSS for Production Apps', 'mastering-tailwind-css', 'Tips and tricks for using Tailwind CSS effectively in large-scale production applications.', 'Tailwind CSS has become one of the most popular CSS frameworks...', '2024-10-10', '6 min read', ARRAY['CSS', 'Tailwind', 'Design'])
ON CONFLICT DO NOTHING;

-- Case Studies
INSERT INTO case_studies (cs_id, title, description, outcome, tech, display_order) VALUES
  ('cs-1', 'Neural Aurora — A Synaptic Portfolio', 'Designed and developed an immersive portfolio experience featuring a living neural network suspended in an aurora field.', 'Increased engagement by 300% and received features on multiple design platforms.', ARRAY['React', 'Three.js', 'Framer Motion'], 1),
  ('cs-2', 'E-Commerce Redesign', 'Led a complete redesign of an e-commerce platform, improving UX and performance.', '40% increase in conversion rate and 60% improvement in page load time.', ARRAY['Next.js', 'Tailwind CSS', 'Stripe'], 2)
ON CONFLICT DO NOTHING;
`

async function main() {
  console.log('Connecting to database...')
  await client.connect()
  console.log('Connected. Seeding data...')

  try {
    await client.query(sql)
    console.log('✓ Seed data inserted successfully!')
  } catch (err) {
    console.error('Seed error:', err.message)
  }

  await client.end()
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
