import { supabase } from '../lib/supabase'
import { callAi } from '../lib/ai/provider'
import { PORTFOLIO_TOOLS } from '../lib/ai/types'

const SYSTEM_PROMPT = `You are Neural Aurora Portfolio Assistant, an AI assistant for the Neural Aurora portfolio admin panel. You have full control over the portfolio content through natural language.

AVAILABLE TOOLS — You MUST use these tools when the user requests an action. Do NOT just reply with text — call the appropriate tool:

1. get_personal_info / update_personal_info — view/update name, title, tagline, bio
2. list_skills / create_skill / update_skill / delete_skill — manage skills
3. list_projects / create_project / update_project / delete_project — manage projects
4. list_education / create_education / delete_education — manage education
5. list_experience / create_experience / delete_experience — manage experience
6. list_blog_posts / create_blog_post — manage blog posts. For "write blog on [topic]", call create_blog_post(topic, title).
7. list_case_studies / create_case_study — manage case studies. For "create case study on [topic]" or "write case study on [topic]", call create_case_study(topic, title).
8. list_services, list_social_links, list_reviews, list_contact_messages — view content
9. get_dashboard_stats — get portfolio statistics
10. reply — use ONLY for greetings, thanks, or casual chat (not for portfolio actions)

INSTRUCTIONS:
- When the user asks you to WRITE, CREATE, or ADD a blog post or case study, you MUST call the appropriate tool (create_blog_post or create_case_study). Do NOT refuse — generate the content based on your training data.
- When the user asks to LIST or SHOW something, call the corresponding list_* tool.
- For greetings like "hello" or "thanks", use the reply tool.
- Use your existing knowledge to generate content. Do not say you cannot browse the internet — use what you already know.
- Current portfolio owner: Amit Kumar (Techhackontime999)
- Current date: {date}`

const TOOL_TO_INTENT = {
  get_personal_info: 'get_personal_info',
  update_personal_info: 'update_personal_info',
  list_skills: 'list_skills',
  create_skill: 'create_skill',
  update_skill: 'update_skill',
  delete_skill: 'delete_skill',
  list_projects: 'list_projects',
  create_project: 'create_project',
  update_project: 'update_project',
  delete_project: 'delete_project',
  list_education: 'list_education',
  create_education: 'create_education',
  delete_education: 'delete_education',
  list_experience: 'list_experience',
  create_experience: 'create_experience',
  delete_experience: 'delete_experience',
  list_blog_posts: 'list_blog_posts',
  create_blog_post: 'create_blog_post',
  list_services: 'list_services',
  list_social_links: 'list_social_links',
  list_reviews: 'list_reviews',
  list_contact_messages: 'list_contact_messages',
  get_dashboard_stats: 'get_dashboard_stats',
  list_case_studies: 'list_case_studies',
  create_case_study: 'create_case_study',
}

function extractNumber(text) {
  const m = text.match(/\d+/)
  return m ? parseInt(m[1], 10) : null
}

function extractQuoted(text) {
  return [...text.matchAll(/[""](.+?)[""]/g)].map((m) => m[1])
}

function extractFirstParam(args, ...keys) {
  for (const key of keys) {
    const v = args[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

// ─── INTENT PATTERNS ───────────────────────────────────────

const intentPatterns = [
  { regex: /show\s+(me\s+)?(my\s+)?(personal\s+)?info/i, intent: 'get_personal_info' },
  { regex: /(?:update|edit|change)\s+(my\s+)?(personal\s+)?info/i, intent: 'update_personal_info' },
  { regex: /update\s+(my\s+)?(name|title|tagline|bio)/i, intent: 'update_personal_info' },
  { regex: /list\s+(all\s+)?skills/i, intent: 'list_skills' },
  { regex: /show\s+(my\s+)?skills/i, intent: 'list_skills' },
  { regex: /what\s+(are\s+)?(my\s+)?skills/i, intent: 'list_skills' },
  { regex: /add\s+(a\s+)?(new\s+)?skill/i, intent: 'create_skill' },
  { regex: /create\s+(a\s+)?(new\s+)?skill/i, intent: 'create_skill' },
  { regex: /update\s+skill\s+(.+)/i, intent: 'update_skill', group: 1 },
  { regex: /edit\s+skill\s+(.+)/i, intent: 'update_skill', group: 1 },
  { regex: /delete\s+skill\s+(.+)/i, intent: 'delete_skill', group: 1 },
  { regex: /remove\s+skill\s+(.+)/i, intent: 'delete_skill', group: 1 },
  { regex: /list\s+(all\s+)?projects/i, intent: 'list_projects' },
  { regex: /show\s+(my\s+)?projects/i, intent: 'list_projects' },
  { regex: /create\s+(a\s+)?(new\s+)?project/i, intent: 'create_project' },
  { regex: /add\s+(a\s+)?(new\s+)?project/i, intent: 'create_project' },
  { regex: /update\s+project\s+(.+)/i, intent: 'update_project', group: 1 },
  { regex: /edit\s+project\s+(.+)/i, intent: 'update_project', group: 1 },
  { regex: /delete\s+project\s+(.+)/i, intent: 'delete_project', group: 1 },
  { regex: /remove\s+project\s+(.+)/i, intent: 'delete_project', group: 1 },
  { regex: /list\s+(all\s+)?education/i, intent: 'list_education' },
  { regex: /show\s+(my\s+)?education/i, intent: 'list_education' },
  { regex: /add\s+(a\s+)?(new\s+)?education/i, intent: 'create_education' },
  { regex: /create\s+(a\s+)?(new\s+)?education/i, intent: 'create_education' },
  { regex: /delete\s+education\s+(.+)/i, intent: 'delete_education', group: 1 },
  { regex: /list\s+(all\s+)?experience/i, intent: 'list_experience' },
  { regex: /show\s+(my\s+)?experience/i, intent: 'list_experience' },
  { regex: /add\s+(a\s+)?(new\s+)?experience/i, intent: 'create_experience' },
  { regex: /create\s+(a\s+)?(new\s+)?experience/i, intent: 'create_experience' },
  { regex: /delete\s+experience\s+(.+)/i, intent: 'delete_experience', group: 1 },
  { regex: /list\s+(all\s+)?blog\s+posts/i, intent: 'list_blog_posts' },
  { regex: /show\s+(my\s+)?blog\s+posts/i, intent: 'list_blog_posts' },
  { regex: /write\s+(a\s+)?blog/i, intent: 'create_blog_post' },
  { regex: /create\s+(a\s+)?(new\s+)?blog\s+post/i, intent: 'create_blog_post' },
  { regex: /research\s+(and\s+)?(write|post|create)\s+(a\s+)?blog/i, intent: 'create_blog_post' },
  { regex: /list\s+(all\s+)?services/i, intent: 'list_services' },
  { regex: /show\s+(my\s+)?services/i, intent: 'list_services' },
  { regex: /list\s+(my\s+)?social\s+links/i, intent: 'list_social_links' },
  { regex: /show\s+(my\s+)?social\s+links/i, intent: 'list_social_links' },
  { regex: /list\s+(all\s+)?reviews/i, intent: 'list_reviews' },
  { regex: /show\s+(my\s+)?reviews/i, intent: 'list_reviews' },
  { regex: /list\s+(my\s+)?(contact\s+)?messages/i, intent: 'list_contact_messages' },
  { regex: /show\s+(my\s+)?messages/i, intent: 'list_contact_messages' },
  { regex: /dashboard/i, intent: 'get_dashboard_stats' },
  { regex: /stats/i, intent: 'get_dashboard_stats' },
  { regex: /summary/i, intent: 'get_dashboard_stats' },
  { regex: /list\s+(all\s+)?case\s+studies/i, intent: 'list_case_studies' },
  { regex: /show\s+(my\s+)?case\s+studies/i, intent: 'list_case_studies' },
  { regex: /create\s+(a\s+)?(new\s+)?case\s+study/i, intent: 'create_case_study' },
  { regex: /add\s+(a\s+)?(new\s+)?case\s+study/i, intent: 'create_case_study' },
  { regex: /write\s+(a\s+)?case\s+study/i, intent: 'create_case_study' },
  { regex: /help/i, intent: 'help' },
  { regex: /what\s+can\s+you\s+do/i, intent: 'help' },
  { regex: /commands?/i, intent: 'help' },
]

function parseIntent(message) {
  for (const { regex, intent, group } of intentPatterns) {
    const m = message.match(regex)
    if (m) {
      const target = group ? m[group]?.trim() : undefined
      return { intent, target, params: extractQuoted(message) }
    }
  }
  return { intent: 'unknown', params: [] }
}

// ─── AI INTENT RESOLUTION ──────────────────────────────────

async function resolveIntent(message, history = []) {
  const apiKey = import.meta.env.VITE_AI_API_KEY
  if (!apiKey) {
    return { parsed: parseIntent(message) }
  }

  try {
    const systemPrompt = SYSTEM_PROMPT.replace('{date}', new Date().toLocaleDateString())
    const response = await callAi(
      [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10),
        { role: 'user', content: message },
      ],
      PORTFOLIO_TOOLS,
    )

    const choice = response.choices[0]
    const toolCall = choice.message?.tool_calls?.[0]

    if (!toolCall) {
      const text = choice.message?.content
      if (text) return { parsed: { intent: 'ai_reply', params: [] }, replyOverride: text }
      return { parsed: parseIntent(message) }
    }

    const toolName = toolCall.function.name
    const args = JSON.parse(toolCall.function.arguments)

    if (toolName === 'reply') {
      return { parsed: { intent: 'ai_reply', params: [] }, replyOverride: args.text ?? '' }
    }

    const intent = TOOL_TO_INTENT[toolName] ?? 'unknown'
    const target = extractFirstParam(args, 'name', 'title', 'degree', 'role')

    return { parsed: { intent, target, params: [] }, args }
  } catch (err) {
    console.error('AI intent resolution failed, falling back to regex:', err)
    return { parsed: parseIntent(message) }
  }
}

// ─── PORTFOLIO DATA (FALLBACK STATIC DATA) ─────────────────

import { personalInfo, skills, projects, education, experience, blogPosts, services, socialLinks, caseStudies } from '../data/portfolio'

// ─── HANDLERS ──────────────────────────────────────────────

async function handleGetPersonalInfo() {
  const { data, error } = await supabase.from('personal_info').select('*').single()
  if (error || !data) return personalInfo
  return data
}

async function handleUpdatePersonalInfo(args) {
  const { data: existing } = await supabase.from('personal_info').select('*').single()
  const updates = {}
  if (args.name) updates.name = args.name
  if (args.title) updates.title = args.title
  if (args.tagline) updates.tagline = args.tagline
  if (args.bio) updates.bio = args.bio
  if (Object.keys(updates).length === 0) return null
  if (existing) {
    const { error } = await supabase.from('personal_info').update(updates).eq('id', existing.id)
    if (error) return null
    return { ...existing, ...updates }
  } else {
    const { data, error } = await supabase.from('personal_info').insert([updates]).select().single()
    if (error) return null
    return data
  }
}

async function handleListSkills() {
  const { data, error } = await supabase.from('skills').select('*').order('display_order', { ascending: true })
  if (error || !data || data.length === 0) return skills
  return data
}

async function handleCreateSkill(args) {
  const { data, error } = await supabase
    .from('skills')
    .insert([{ name: args.name, level: args.level, category: args.category || 'other' }])
    .select().single()
  if (error) return null
  return data
}

async function handleUpdateSkill(target, args) {
  const { data: list } = await supabase.from('skills').select('*').ilike('name', `%${target}%`).limit(1)
  const existing = list?.[0]
  if (!existing) return null
  const updates = {}
  if (args.new_name) updates.name = args.new_name
  if (args.level !== undefined) updates.level = args.level
  if (args.category) updates.category = args.category
  if (Object.keys(updates).length === 0) return null
  const { error } = await supabase.from('skills').update(updates).eq('id', existing.id)
  if (error) return null
  return { ...existing, ...updates }
}

async function handleDeleteSkill(target) {
  const { data: list } = await supabase.from('skills').select('*').ilike('name', `%${target}%`).limit(1)
  const existing = list?.[0]
  if (!existing) return null
  await supabase.from('skills').delete().eq('id', existing.id)
  return existing
}

async function handleListProjects() {
  const { data, error } = await supabase.from('projects').select('*').order('display_order', { ascending: true })
  if (error || !data || data.length === 0) return projects
  return data
}

async function handleCreateProject(args) {
  const techs = typeof args.technologies === 'string' ? args.technologies.split(',').map(t => t.trim()) : (args.technologies || [])
  const { data, error } = await supabase
    .from('projects')
    .insert([{ title: args.title, description: args.description, technologies: techs, github: args.github || null, link: args.link || null }])
    .select().single()
  if (error) return null
  return data
}

async function handleUpdateProject(target, args) {
  const { data: list } = await supabase.from('projects').select('*').ilike('title', `%${target}%`).limit(1)
  const existing = list?.[0]
  if (!existing) return null
  const updates = {}
  if (args.new_title) updates.title = args.new_title
  if (args.description) updates.description = args.description
  if (args.technologies) updates.technologies = typeof args.technologies === 'string' ? args.technologies.split(',').map(t => t.trim()) : args.technologies
  if (args.github !== undefined) updates.github = args.github
  if (args.link !== undefined) updates.link = args.link
  if (Object.keys(updates).length === 0) return null
  const { error } = await supabase.from('projects').update(updates).eq('id', existing.id)
  if (error) return null
  return { ...existing, ...updates }
}

async function handleDeleteProject(target) {
  const { data: list } = await supabase.from('projects').select('*').ilike('title', `%${target}%`).limit(1)
  const existing = list?.[0]
  if (!existing) return null
  await supabase.from('projects').delete().eq('id', existing.id)
  return existing
}

async function handleListEducation() {
  const { data, error } = await supabase.from('education').select('*').order('display_order', { ascending: true })
  if (error || !data || data.length === 0) return education
  return data
}

async function handleCreateEducation(args) {
  const { data, error } = await supabase
    .from('education')
    .insert([{ degree: args.degree, school: args.school, year: args.year, description: args.description || '' }])
    .select().single()
  if (error) return null
  return data
}

async function handleDeleteEducation(target) {
  const { data: list } = await supabase.from('education').select('*').ilike('degree', `%${target}%`).limit(1)
  const existing = list?.[0]
  if (!existing) return null
  await supabase.from('education').delete().eq('id', existing.id)
  return existing
}

async function handleListExperience() {
  const { data, error } = await supabase.from('experience').select('*').order('display_order', { ascending: true })
  if (error || !data || data.length === 0) return experience
  return data
}

async function handleCreateExperience(args) {
  const { data, error } = await supabase
    .from('experience')
    .insert([{ role: args.role, company: args.company, year: args.year, description: args.description || '' }])
    .select().single()
  if (error) return null
  return data
}

async function handleDeleteExperience(role, company) {
  const { data: list } = await supabase
    .from('experience')
    .select('*')
    .ilike('role', `%${role}%`)
    .ilike('company', `%${company}%`)
    .limit(1)
  const existing = list?.[0]
  if (!existing) return null
  await supabase.from('experience').delete().eq('id', existing.id)
  return existing
}

async function handleListBlogPosts() {
  const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
  if (error || !data || data.length === 0) return blogPosts
  return data
}

async function handleCreateBlogPost(topic, title) {
  const apiKey = import.meta.env.VITE_AI_API_KEY
  if (!apiKey) {
    return { error: 'AI API key required for research. Set VITE_AI_API_KEY in .env' }
  }

  const blogTitle = title || `The Rise of ${topic.charAt(0).toUpperCase() + topic.slice(1)}`

  try {
    const response = await callAi([
      {
        role: 'system',
        content: `You are a professional tech blogger for Neural Aurora portfolio. Write a complete blog post on the given topic.

Return ONLY valid JSON with no markdown, no code fences:
{
  "title": "Blog title",
  "excerpt": "A compelling 1-2 sentence summary",
  "content": "Full HTML content with <h2>, <h3>, <p>, <ul>, <li> tags. At least 500 words with real facts, trends, examples from your knowledge.",
  "tags": ["tag1", "tag2", "tag3"],
  "readTime": "X min read"
}`,
      },
      {
        role: 'user',
        content: `Write a detailed blog post about: ${topic}. Title: ${blogTitle}. Include real-world examples, statistics, trends, and practical insights. Format the content as HTML.`,
      },
    ])

    const text = response.choices?.[0]?.message?.content || ''
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const generated = JSON.parse(cleaned)

    const slug = generated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)

    const now = new Date().toISOString().split('T')[0]
    const postId = `blog-${Date.now()}`
    const readTime = generated.readTime || `${Math.ceil((generated.content || '').split(' ').length / 200)} min read`

    const { data, error } = await supabase
      .from('blog_posts')
      .insert([{
        post_id: postId,
        title: generated.title,
        slug,
        excerpt: generated.excerpt || '',
        content: generated.content || '',
        date: now,
        read_time: readTime,
        tags: generated.tags || [topic],
      }])
      .select()
      .single()

    if (error) return { error: error.message }

    return {
      post: data,
      reply: `Researched and published **"${generated.title}"**\n\n_${generated.excerpt || ''}_\n\nTags: ${(generated.tags || []).join(', ')} | ${readTime}\n\nSlug: \`${slug}\``,
    }
  } catch (err) {
    return { error: `Research failed: ${err.message}` }
  }
}

async function handleListServices() {
  const { data, error } = await supabase.from('services').select('*').order('display_order', { ascending: true })
  if (error || !data || data.length === 0) return services
  return data
}

async function handleListSocialLinks() {
  const { data, error } = await supabase.from('social_links').select('*').order('display_order', { ascending: true })
  if (error || !data || data.length === 0) return socialLinks
  return data
}

async function handleListReviews() {
  const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(10)
  if (error || !data || data.length === 0) return []
  return data
}

async function handleListContactMessages() {
  const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(10)
  if (error || !data || data.length === 0) return []
  return data
}

async function handleDashboardStats() {
  const [
    { count: skillsCount },
    { count: projectsCount },
    { count: blogCount },
    { count: caseStudiesCount },
    { count: servicesCount },
    { count: reviewsCount },
    { count: messagesCount },
  ] = await Promise.all([
    supabase.from('skills').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
    supabase.from('case_studies').select('*', { count: 'exact', head: true }),
    supabase.from('services').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
    supabase.from('contact_messages').select('*', { count: 'exact', head: true }),
  ])
  return { skillsCount, projectsCount, blogCount, caseStudiesCount, servicesCount, reviewsCount, messagesCount }
}

async function handleListCaseStudies() {
  const { data, error } = await supabase.from('case_studies').select('*').order('display_order', { ascending: true })
  if (error || !data || data.length === 0) return caseStudies
  return data
}

async function handleCreateCaseStudy(topic, title) {
  const apiKey = import.meta.env.VITE_AI_API_KEY
  if (!apiKey) {
    return { error: 'AI API key required for case study creation. Set VITE_AI_API_KEY in .env' }
  }

  const csTitle = title || `Case Study: ${topic.charAt(0).toUpperCase() + topic.slice(1)}`

  try {
    const response = await callAi([
      {
        role: 'system',
        content: `You are a professional case study writer for Neural Aurora portfolio. Write a detailed case study on the given topic using your knowledge.

Return ONLY valid JSON with no markdown, no code fences:
{
  "title": "Case study title",
  "description": "A compelling 1-2 sentence summary",
  "outcome": "The key result or outcome achieved",
  "content": "Full HTML content with <h2>, <h3>, <p>, <ul>, <li> tags. At least 400 words with details, challenges, solutions, and results.",
  "tech": ["tech1", "tech2", "tech3"]
}`,
      },
      {
        role: 'user',
        content: `Write a detailed case study about: ${topic}. Title: ${csTitle}. Include the challenge, solution, and results. Format the content as HTML.`,
      },
    ])

    const text = response.choices?.[0]?.message?.content || ''
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const generated = JSON.parse(cleaned)

    const slug = generated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)

    const csId = `cs-${Date.now()}`
    const techs = Array.isArray(generated.tech) ? generated.tech : (generated.tech || topic).split(',').map(t => t.trim())

    const { data, error } = await supabase
      .from('case_studies')
      .insert([{
        cs_id: csId,
        title: generated.title,
        slug,
        description: generated.description || '',
        outcome: generated.outcome || '',
        content: generated.content || '',
        tech: techs,
      }])
      .select()
      .single()

    if (error) return { error: error.message }

    return {
      post: data,
      reply: `Researched and published case study **"${generated.title}"**\n\n_${generated.description || ''}_\n\n**Outcome:** ${generated.outcome || ''}\n\nTech: ${techs.join(', ')}\n\nSlug: \`${slug}\``,
    }
  } catch (err) {
    return { error: `Research failed: ${err.message}` }
  }
}

// ─── MAIN HANDLER ──────────────────────────────────────────

export async function handleAiAutomation(message, history = []) {
  const { parsed, replyOverride, args } = await resolveIntent(message, history)
  let { intent, target } = parsed

  try {
    if (replyOverride) {
      return { reply: replyOverride, action: { type: 'ai_reply', status: 'success' } }
    }

    switch (intent) {
      case 'get_personal_info': {
        const info = await handleGetPersonalInfo()
        return {
          reply: `**${info.name || 'Amit Kumar'}** — ${info.title || 'Full-Stack Developer'}\n_Tagline:_ ${info.tagline || '—'}\n_Bio:_ ${info.bio || '—'}`,
          action: { type: 'details', status: 'success', detail: 'Personal Info' },
        }
      }

      case 'update_personal_info': {
        const result = await handleUpdatePersonalInfo(args || {})
        if (!result) return { reply: 'Could not update personal info. Please provide fields to update (name, title, tagline, bio).' }
        return {
          reply: `Updated personal info successfully.${args?.name ? ` Name: **${args.name}**` : ''}${args?.title ? ` Title: **${args.title}**` : ''}`,
          action: { type: 'updated', status: 'success', detail: 'Personal Info' },
        }
      }

      case 'list_skills': {
        const list = await handleListSkills()
        if (list.length === 0) return { reply: 'No skills added yet. Try "add a skill React with level 90".' }
        const lines = list.map((s, i) => `${i + 1}. **${s.name}** — ${s.level}% (${s.category || 'general'})`)
        return {
          reply: `**${list.length}** skill(s):\n${lines.join('\n')}`,
          action: { type: 'list', status: 'success', detail: `${list.length} skills` },
        }
      }

      case 'create_skill': {
        if (!args) return { reply: 'Usage: "create skill named React with level 90 in category frontend"' }
        const result = await handleCreateSkill(args)
        if (!result) return { reply: 'Failed to create skill.' }
        return {
          reply: `Added skill **${result.name}** at ${result.level}% in ${result.category}.`,
          action: { type: 'created', status: 'success', detail: result.name },
        }
      }

      case 'update_skill': {
        if (!target) return { reply: 'Which skill to update?' }
        const result = await handleUpdateSkill(target, args || {})
        if (!result) return { reply: `Skill "${target}" not found.` }
        return {
          reply: `Updated **${result.name}** (${result.level}%, ${result.category}).`,
          action: { type: 'updated', status: 'success', detail: result.name },
        }
      }

      case 'delete_skill': {
        if (!target) return { reply: 'Which skill to delete?' }
        const result = await handleDeleteSkill(target)
        if (!result) return { reply: `Skill "${target}" not found.` }
        return {
          reply: `Deleted skill **${result.name}**.`,
          action: { type: 'deleted', status: 'success', detail: result.name },
        }
      }

      case 'list_projects': {
        const list = await handleListProjects()
        if (list.length === 0) return { reply: 'No projects yet. Try "create a project \\"My App\\" using React and Node".' }
        const lines = list.map((p, i) => `${i + 1}. **${p.title}** — ${p.description?.slice(0, 60)}...${p.github ? ' [GitHub]' : ''}${p.link ? ' [Live]' : ''}`)
        return {
          reply: `**${list.length}** project(s):\n${lines.join('\n')}`,
          action: { type: 'list', status: 'success', detail: `${list.length} projects` },
        }
      }

      case 'create_project': {
        if (!args) return { reply: 'Usage: "create a project \\"Title\\" with description \\"Desc\\" using React, Node.js"' }
        const result = await handleCreateProject(args)
        if (!result) return { reply: 'Failed to create project.' }
        return {
          reply: `Created project **${result.title}**.`,
          action: { type: 'created', status: 'success', detail: result.title },
        }
      }

      case 'update_project': {
        if (!target) return { reply: 'Which project to update?' }
        const result = await handleUpdateProject(target, args || {})
        if (!result) return { reply: `Project "${target}" not found.` }
        return {
          reply: `Updated **${result.title}**.`,
          action: { type: 'updated', status: 'success', detail: result.title },
        }
      }

      case 'delete_project': {
        if (!target) return { reply: 'Which project to delete?' }
        const result = await handleDeleteProject(target)
        if (!result) return { reply: `Project "${target}" not found.` }
        return {
          reply: `Deleted project **${result.title}**.`,
          action: { type: 'deleted', status: 'success', detail: result.title },
        }
      }

      case 'list_education': {
        const list = await handleListEducation()
        if (list.length === 0) return { reply: 'No education entries yet.' }
        const lines = list.map((e, i) => `${i + 1}. **${e.degree}** — ${e.school} (${e.year})`)
        return {
          reply: `**${list.length}** education entry(ies):\n${lines.join('\n')}`,
          action: { type: 'list', status: 'success' },
        }
      }

      case 'create_education': {
        if (!args) return { reply: 'Usage: "add education \\"B.Tech CS\\" at \\"University\\" in 2022-2026"' }
        const result = await handleCreateEducation(args)
        if (!result) return { reply: 'Failed to add education.' }
        return {
          reply: `Added education **${result.degree}** at ${result.school}.`,
          action: { type: 'created', status: 'success' },
        }
      }

      case 'delete_education': {
        if (!target) return { reply: 'Which education entry to delete?' }
        const result = await handleDeleteEducation(target)
        if (!result) return { reply: `Education "${target}" not found.` }
        return {
          reply: `Deleted education **${result.degree}**.`,
          action: { type: 'deleted', status: 'success' },
        }
      }

      case 'list_experience': {
        const list = await handleListExperience()
        if (list.length === 0) return { reply: 'No experience entries yet.' }
        const lines = list.map((e, i) => `${i + 1}. **${e.role}** at ${e.company} (${e.year})`)
        return {
          reply: `**${list.length}** experience entry(ies):\n${lines.join('\n')}`,
          action: { type: 'list', status: 'success' },
        }
      }

      case 'create_experience': {
        if (!args) return { reply: 'Usage: "add experience \\"Developer\\" at \\"Company\\" in 2024"' }
        const result = await handleCreateExperience(args)
        if (!result) return { reply: 'Failed to add experience.' }
        return {
          reply: `Added experience **${result.role}** at ${result.company}.`,
          action: { type: 'created', status: 'success' },
        }
      }

      case 'delete_experience': {
        if (!target) return { reply: 'Which experience entry to delete?' }
        const result = await handleDeleteExperience(target, args?.company || '')
        if (!result) return { reply: `Experience "${target}" not found.` }
        return {
          reply: `Deleted experience **${result.role}** at ${result.company}.`,
          action: { type: 'deleted', status: 'success' },
        }
      }

      case 'list_blog_posts': {
        const list = await handleListBlogPosts()
        if (list.length === 0) return { reply: 'No blog posts yet.' }
        const lines = list.map((p, i) => `${i + 1}. **${p.title}** — ${p.date || 'No date'} (${p.read_time || p.readTime || '?'})`)
        return {
          reply: `**${list.length}** blog post(s):\n${lines.join('\n')}`,
          action: { type: 'list', status: 'success' },
        }
      }

      case 'create_blog_post': {
        const topic = args?.topic || target || message.replace(/write\s+(a\s+)?blog\s+(on\s+|about\s+)?/i, '').trim() || 'vibe coding'
        const title = args?.title || ''
        const result = await handleCreateBlogPost(topic, title)
        if (result.error) return { reply: `❌ ${result.error}`, action: { type: 'error', status: 'error', detail: result.error } }
        return {
          reply: result.reply,
          action: { type: 'created', status: 'success', detail: result.post?.title || topic },
        }
      }

      case 'list_services': {
        const list = await handleListServices()
        if (list.length === 0) return { reply: 'No services configured yet.' }
        const lines = list.map((s, i) => `${i + 1}. **${s.title}** — ${s.tagline || ''}`)
        return {
          reply: `**${list.length}** service(s):\n${lines.join('\n')}`,
          action: { type: 'list', status: 'success' },
        }
      }

      case 'list_social_links': {
        const list = await handleListSocialLinks()
        if (list.length === 0) return { reply: 'No social links configured.' }
        const lines = list.map((s, i) => `${i + 1}. **${s.label}** — ${s.url}`)
        return {
          reply: `**${list.length}** social link(s):\n${lines.join('\n')}`,
          action: { type: 'list', status: 'success' },
        }
      }

      case 'list_reviews': {
        const list = await handleListReviews()
        if (list.length === 0) return { reply: 'No reviews yet.' }
        const lines = list.map((r, i) => `${i + 1}. **${r.author || 'Anonymous'}** — "${(r.content || r.text || '').slice(0, 80)}..."`)
        return {
          reply: `**${list.length}** review(s):\n${lines.join('\n')}`,
          action: { type: 'list', status: 'success' },
        }
      }

      case 'list_case_studies': {
        const csList = await handleListCaseStudies()
        if (csList.length === 0) return { reply: 'No case studies yet.' }
        const lines = csList.map((cs, i) => `${i + 1}. **${cs.title}** — ${cs.description?.slice(0, 60)}...`)
        return {
          reply: `**${csList.length}** case study(ies):\n${lines.join('\n')}`,
          action: { type: 'list', status: 'success' },
        }
      }

      case 'create_case_study': {
        const csTopic = args?.topic || target || message.replace(/create\s+(a\s+)?(new\s+)?case\s+study\s+(on\s+|about\s+)?/i, '').replace(/add\s+(a\s+)?(new\s+)?case\s+study\s+(on\s+|about\s+)?/i, '').replace(/write\s+(a\s+)?case\s+study\s+(on\s+|about\s+)?/i, '').trim() || 'neural aurora'
        const csTitle = args?.title || ''
        const csResult = await handleCreateCaseStudy(csTopic, csTitle)
        if (csResult.error) return { reply: `❌ ${csResult.error}`, action: { type: 'error', status: 'error', detail: csResult.error } }
        return {
          reply: csResult.reply,
          action: { type: 'created', status: 'success', detail: csResult.post?.title || csTopic },
        }
      }

      case 'list_contact_messages': {
        const list = await handleListContactMessages()
        if (list.length === 0) return { reply: 'No contact messages yet.' }
        const lines = list.map((m, i) => `${i + 1}. **${m.name || 'Anonymous'}** (${m.email || '?'}) — "${(m.message || '').slice(0, 60)}..."${m.read ? ' ✓' : ' ○'}`)
        return {
          reply: `**${list.length}** contact message(s):\n${lines.join('\n')}`,
          action: { type: 'list', status: 'success' },
        }
      }

      case 'get_dashboard_stats': {
        const stats = await handleDashboardStats()
        return {
          reply: `**Portfolio Dashboard**\n- Skills: ${stats.skillsCount ?? '?'}\n- Projects: ${stats.projectsCount ?? '?'}\n- Blog Posts: ${stats.blogCount ?? '?'}\n- Case Studies: ${stats.caseStudiesCount ?? '?'}\n- Services: ${stats.servicesCount ?? '?'}\n- Reviews: ${stats.reviewsCount ?? '?'}\n- Messages: ${stats.messagesCount ?? '?'}`,
          action: { type: 'dashboard', status: 'success' },
        }
      }

      case 'help': {
        return {
          reply: `I can manage your entire portfolio through natural language. Try these:\n\n**Info**\n"Show my info" / "Update my title to ..."\n\n**Skills**\n"List skills" / "Add a skill React at 90%" / "Delete skill ..."\n\n**Projects**\n"List projects" / "Create a project \\"Title\\"" / "Delete project ..."\n\n**Education & Experience**\n"Show education" / "Add experience \\"Dev\\" at \\"Co\\""\n\n**Blog & Case Studies**\n"Write blog on vibe coding" / "Create a case study on Neural Aurora" / "List blog posts" / "List case studies"\n\n**Content**\n"Show services" / "Social links" / "Reviews"\n\n**Admin**\n"Messages" / "Dashboard" / "Summary"`,
          action: { type: 'help', status: 'success' },
        }
      }

      default: {
        return {
          reply: `I did not understand that. I can manage personal info, skills, projects, education, experience, case studies, blog posts (write/research), services, and more.\n\nTry "help" for the full command list.\n\nTip: "write blog on vibe coding" or "create a case study on Neural Aurora" will research and publish.`,
          action: { type: 'unrecognized', status: 'error' },
        }
      }
    }
  } catch (err) {
    return { reply: `Error: ${err.message}`, action: { type: 'error', status: 'error', detail: err.message } }
  }
}
