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
  getCaseStudyBySlug,
  getServices,
  getServicePage,
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
  services as staticServices,
  defaultServicePage as staticServicePage,
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
  const [loaded, setLoaded] = useState(!supabaseConfigured)
  useEffect(() => {
    if (!supabaseConfigured) return
    const refetch = () =>
      getPersonalInfo().then(setData).catch(() => {}).finally(() => setLoaded(true))
    refetch()
    window.addEventListener('focus', refetch)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refetch()
    })
    return () => window.removeEventListener('focus', refetch)
  }, [])
  return { data, loaded }
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

export function useCaseStudyBySlug(slug) {
  const [data, setData] = useState(() => staticCaseStudies.find((s) => s.slug === slug) || null)
  useEffect(() => {
    if (supabaseConfigured && slug) {
      getCaseStudyBySlug(slug).then(setData).catch(() => {})
    }
  }, [slug])
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

export function useServices() {
  const [data, setData] = useState(staticServices)
  useEffect(() => {
    fetchWithFallback(getServices, staticServices).then(setData)
  }, [])
  return data
}

export function useServicePage() {
  const [data, setData] = useState(staticServicePage)
  useEffect(() => {
    fetchWithFallback(getServicePage, staticServicePage).then((result) => {
      if (result && result !== staticServicePage) {
        const merged = { ...staticServicePage }
        for (const key of Object.keys(merged)) {
          if (key in result) {
            const val = result[key]
            if (Array.isArray(val) && val.length === 0) continue
            if (val === null || val === undefined) continue
            merged[key] = val
          }
        }
        setData(merged)
      }
    })
  }, [])
  return data
}
