import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { moodEngine, getMoodById } from '../lib/moodMusic'

const MoodContext = createContext(null)

export function MoodProvider({ children }) {
  const [selectedMood, setSelectedMood] = useState(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const startedRef = useRef(false)

  const selectMood = useCallback((moodId) => {
    setSelectedMood(moodId)
  }, [])

  const startMusic = useCallback((moodId) => {
    const id = moodId || selectedMood
    if (!id) return
    if (startedRef.current) {
      moodEngine.stop()
    }
    moodEngine.start(id)
    startedRef.current = true
    setMusicPlaying(true)
  }, [selectedMood])

  const stopMusic = useCallback(() => {
    moodEngine.stop()
    startedRef.current = false
    setMusicPlaying(false)
  }, [])

  const toggleMusic = useCallback(() => {
    if (musicPlaying) {
      stopMusic()
    } else if (selectedMood) {
      startMusic(selectedMood)
    }
  }, [musicPlaying, selectedMood, startMusic, stopMusic])

  useEffect(() => {
    return () => {
      moodEngine.stop()
    }
  }, [])

  const mood = selectedMood ? getMoodById(selectedMood) : null

  return (
    <MoodContext.Provider value={{
      selectedMood,
      mood,
      selectMood,
      startMusic,
      stopMusic,
      toggleMusic,
      musicPlaying,
    }}>
      {children}
    </MoodContext.Provider>
  )
}

export function useMood() {
  const ctx = useContext(MoodContext)
  if (!ctx) throw new Error('useMood must be used within MoodProvider')
  return ctx
}
