import { useState, useEffect } from 'react'
import {
  getPersonalInfo,
  getSocialLinks,
  getSkills,
  getProjects,
  getEducation,
  getExperience,
  getBlogPosts,
  getCaseStudies,
} from './supabase'
import {
  personalInfo as staticPersonalInfo,
  socialLinks as staticSocialLinks,
  skills as staticSkills,
  projects as staticProjects,
  education as staticEducation,
  experience as staticExperience,
  blogPosts as staticBlogPosts,
  caseStudies as staticCaseStudies,
} from '../data/portfolio'

const supabaseConfigured =
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'

async function fetchWithFallback(fetchFn, staticData) {
  if (!supabaseConfigured) return staticData
  try {
    const data = await fetchFn()
    if (data && (Array.isArray(data) ? data.length > 0 : true)) return data
  } catch {}
  return staticData
}

export function usePersonalInfo() {
  const [data, setData] = useState(staticPersonalInfo)
  useEffect(() => {
    if (supabaseConfigured) {
      getPersonalInfo().then(setData).catch(() => {})
    }
  }, [])
  return data
}

export function useSocialLinks() {
  const [data, setData] = useState(staticSocialLinks)
  useEffect(() => {
    if (supabaseConfigured) {
      getSocialLinks().then(setData).catch(() => {})
    }
  }, [])
  return data
}

export function useSkills() {
  const [data, setData] = useState(staticSkills)
  useEffect(() => {
    if (supabaseConfigured) {
      getSkills().then(setData).catch(() => {})
    }
  }, [])
  return data
}

export function useProjects() {
  const [data, setData] = useState(staticProjects)
  useEffect(() => {
    if (supabaseConfigured) {
      getProjects().then(setData).catch(() => {})
    }
  }, [])
  return data
}

export function useEducation() {
  const [data, setData] = useState(staticEducation)
  useEffect(() => {
    if (supabaseConfigured) {
      getEducation().then(setData).catch(() => {})
    }
  }, [])
  return data
}

export function useExperience() {
  const [data, setData] = useState(staticExperience)
  useEffect(() => {
    if (supabaseConfigured) {
      getExperience().then(setData).catch(() => {})
    }
  }, [])
  return data
}

export function useBlogPosts() {
  const [data, setData] = useState(staticBlogPosts)
  useEffect(() => {
    if (supabaseConfigured) {
      getBlogPosts().then(setData).catch(() => {})
    }
  }, [])
  return data
}

export function useCaseStudies() {
  const [data, setData] = useState(staticCaseStudies)
  useEffect(() => {
    if (supabaseConfigured) {
      getCaseStudies().then(setData).catch(() => {})
    }
  }, [])
  return data
}
