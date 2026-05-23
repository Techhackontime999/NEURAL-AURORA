import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

export async function getPersonalInfo() {
  const { data, error } = await supabase
    .from('personal_info')
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function getSocialLinks() {
  const { data, error } = await supabase
    .from('social_links')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getSkills() {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getEducation() {
  const { data, error } = await supabase
    .from('education')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getExperience() {
  const { data, error } = await supabase
    .from('experience')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getBlogPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getBlogPostBySlug(slug) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function getCaseStudies() {
  const { data, error } = await supabase
    .from('case_studies')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getCaseStudyBySlug(slug) {
  const { data, error } = await supabase
    .from('case_studies')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function getReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function submitReview(review) {
  const { data, error } = await supabase
    .from('reviews')
    .insert([{ ...review, approved: false }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAllReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function approveReview(id) {
  const { data, error } = await supabase
    .from('reviews')
    .update({ approved: true })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteReview(id) {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updatePersonalInfo(data) {
  const { error } = await supabase
    .from('personal_info')
    .update(data)
    .eq('id', data.id)
  if (error) throw error
}

export async function updateSocialLink(id, data) {
  const { error } = await supabase
    .from('social_links')
    .update(data)
    .eq('id', id)
  if (error) throw error
}

export async function createSocialLink(data) {
  const { data: newLink, error } = await supabase
    .from('social_links')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return newLink
}

export async function deleteSocialLink(id) {
  const { error } = await supabase
    .from('social_links')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateSkill(id, data) {
  const { error } = await supabase
    .from('skills')
    .update(data)
    .eq('id', id)
  if (error) throw error
}

export async function createSkill(data) {
  const { data: newSkill, error } = await supabase
    .from('skills')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return newSkill
}

export async function deleteSkill(id) {
  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateProject(id, data) {
  const { error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', id)
  if (error) throw error
}

export async function createProject(data) {
  const { data: newProject, error } = await supabase
    .from('projects')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return newProject
}

export async function deleteProject(id) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateEducation(id, data) {
  const { error } = await supabase
    .from('education')
    .update(data)
    .eq('id', id)
  if (error) throw error
}

export async function createEducation(data) {
  const { data: newEdu, error } = await supabase
    .from('education')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return newEdu
}

export async function deleteEducation(id) {
  const { error } = await supabase
    .from('education')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateExperience(id, data) {
  const { error } = await supabase
    .from('experience')
    .update(data)
    .eq('id', id)
  if (error) throw error
}

export async function createExperience(data) {
  const { data: newExp, error } = await supabase
    .from('experience')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return newExp
}

export async function deleteExperience(id) {
  const { error } = await supabase
    .from('experience')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateBlogPost(id, data) {
  const { error } = await supabase
    .from('blog_posts')
    .update(data)
    .eq('id', id)
  if (error) throw error
}

export async function createBlogPost(data) {
  const { data: newPost, error } = await supabase
    .from('blog_posts')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return newPost
}

export async function deleteBlogPost(id) {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateCaseStudy(id, data) {
  const { error } = await supabase
    .from('case_studies')
    .update(data)
    .eq('id', id)
  if (error) throw error
}

export async function createCaseStudy(data) {
  const { data: newCs, error } = await supabase
    .from('case_studies')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return newCs
}

export async function deleteCaseStudy(id) {
  const { error } = await supabase
    .from('case_studies')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getAdminSettings() {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateAdminSettings(settings) {
  const { error } = await supabase
    .from('admin_settings')
    .update(settings)
    .eq('id', 1)
  if (error) throw error
}

export async function setAdminEmail(email) {
  const { data, error } = await supabase.rpc('set_admin_email', { p_email: email })
  if (error) throw error
  return data
}

export async function generateTestData(category, count = 3) {
  const { data, error } = await supabase.rpc('generate_test_data', {
    p_category: category,
    p_count: count,
  })
  if (error) throw error
  return data
}

export async function getTestDataTemplates() {
  const { data, error } = await supabase
    .from('test_data_templates')
    .select('*')
  if (error) throw error
  return data
}

export async function clearTestData(table) {
  const { error } = await supabase
    .from(table)
    .delete()
    .ilike('project_id', 'test-%')
  if (error) {
    // Try other id fields
    const { error: err2 } = await supabase
      .from(table)
      .delete()
      .ilike('edu_id', 'test-%')
    if (err2) {
      const { error: err3 } = await supabase
        .from(table)
        .delete()
        .ilike('exp_id', 'test-%')
      if (err3) {
        const { error: err4 } = await supabase
          .from(table)
          .delete()
          .ilike('post_id', 'test-%')
        if (err4) {
          const { error: err5 } = await supabase
            .from(table)
            .delete()
            .ilike('cs_id', 'test-%')
          if (err5) {
            const { error: err6 } = await supabase
              .from(table)
              .delete()
              .ilike('service_id', 'test-%')
            if (err6) throw err6
          }
        }
      }
    }
  }
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateProfileRole(userId, role) {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
  if (error) throw error
}

export async function submitContactMessage({ name, email, message }) {
  const { error } = await supabase
    .from('contact_messages')
    .insert([{ name, email, message }])
  if (error) throw error
}

export async function getContactMessages() {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function markContactMessageRead(id) {
  const { error } = await supabase
    .from('contact_messages')
    .update({ read: true })
    .eq('id', id)
  if (error) throw error
}

export async function deleteContactMessage(id) {
  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getActiveAdVideos() {
  const { data, error } = await supabase
    .from('dev_ads')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAdVideos() {
  const { data, error } = await supabase
    .from('dev_ads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addAdVideo(data) {
  const { data: newAd, error } = await supabase
    .from('dev_ads')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return newAd
}

export async function updateAdVideo(id, data) {
  const { error } = await supabase
    .from('dev_ads')
    .update(data)
    .eq('id', id)
  if (error) throw error
}

export async function deleteAdVideo(id) {
  const { error } = await supabase
    .from('dev_ads')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function incrementAdViewCount(id) {
  const { error } = await supabase.rpc('increment_ad_view_count', { ad_id: id })
  if (error) throw error
}
