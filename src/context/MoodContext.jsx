import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { moodPlayer, getMoodById } from '../lib/moodMusic'

const MoodContext = createContext(null)

export function MoodProvider({ children }) {
  const [selectedMood, setSelectedMood] = useState(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicLoading, setMusicLoading] = useState(false)
  const [musicMode, setMusicMode] = useState(null)
  const startedRef = useRef(false)
  const moodIdRef = useRef(null)

  const selectMood = useCallback((moodId) => {
    moodIdRef.current = moodId
    setSelectedMood(moodId)
  }, [])

  const startMusic = useCallback(async (moodId) => {
    const id = moodId || moodIdRef.current
    if (!id) return
    if (startedRef.current) {
      moodPlayer.stop()
    }
    setMusicLoading(true)
    try {
      await moodPlayer.start(id)
      startedRef.current = true
      setMusicPlaying(true)
      setMusicMode(moodPlayer.getMode())
    } catch {
      startedRef.current = false
      setMusicPlaying(false)
    } finally {
      setMusicLoading(false)
    }
  }, [])

  const stopMusic = useCallback(() => {
    moodPlayer.stop()
    startedRef.current = false
    setMusicPlaying(false)
    setMusicMode(null)
  }, [])

  const toggleMusic = useCallback(() => {
    if (musicPlaying) {
      stopMusic()
    } else if (moodIdRef.current) {
      startMusic(moodIdRef.current)
    }
  }, [musicPlaying, startMusic, stopMusic])

  const setVolume = useCallback((v) => {
    moodPlayer.setVolume(v)
  }, [])

  useEffect(() => {
    return () => {
      moodPlayer.stop()
    }
  }, [])

  const mood = selectedMood ? getMoodById(selectedMood) : null

  const value = useMemo(() => ({
    selectedMood,
    mood,
    selectMood,
    startMusic,
    stopMusic,
    toggleMusic,
    setVolume,
    musicPlaying,
    musicLoading,
    musicMode,
  }), [selectedMood, mood, selectMood, startMusic, stopMusic, toggleMusic, setVolume, musicPlaying, musicLoading, musicMode])

  return (
    <MoodContext.Provider value={value}>
      {children}
    </MoodContext.Provider>
  )
}

export function useMood() {
  const ctx = useContext(MoodContext)
  if (!ctx) throw new Error('useMood must be used within MoodProvider')
  return ctx
}
