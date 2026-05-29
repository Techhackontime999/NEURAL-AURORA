import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const YT_BASE = 'https://www.googleapis.com/youtube/v3'

function fetchYT(endpoint, apiKey, params) {
  const q = new URLSearchParams({ key: apiKey, ...params }).toString()
  return fetch(`${YT_BASE}/${endpoint}?${q}`).then(r => {
    if (!r.ok) throw new Error(`YouTube API error: ${r.status}`)
    return r.json()
  })
}

function formatDuration(iso) {
  if (!iso) return ''
  const m = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!m) return ''
  const h = (m[1] || '').replace('H', '') || 0
  const min = (m[2] || '').replace('M', '') || 0
  const s = (m[3] || '').replace('S', '') || 0
  if (+h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${+min}:${String(s).padStart(2, '0')}`
}

function parseDurationSeconds(iso) {
  if (!iso) return 120
  const m = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!m) return 120
  const h = parseInt((m[1] || '').replace('H', '')) || 0
  const min = parseInt((m[2] || '').replace('M', '')) || 0
  const s = parseInt((m[3] || '').replace('S', '')) || 0
  return h * 3600 + min * 60 + s || 120
}

function timeAgo(dateStr) {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (sec < 60) return 'just now'
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

function VideoSkeleton({ tall }) {
  return (
    <div className={`rounded-2xl overflow-hidden border border-white/[0.04] bg-white/[0.015] ${tall ? 'aspect-[9/16] w-36 sm:w-44 shrink-0' : ''}`}>
      <div className={`relative overflow-hidden ${tall ? 'absolute inset-0' : 'aspect-video bg-white/[0.03]'}`}>
        <div className="absolute inset-0 bg-white/[0.03]" />
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
            transform: 'translateX(-100%)',
          }}
          animate={{ transform: ['translateX(-100%)', 'translateX(200%)'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      {!tall && (
        <div className="p-3 sm:p-4 space-y-2.5">
          <div className="h-3 bg-white/[0.05] rounded-full w-3/4 overflow-hidden relative">
            <motion.div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)', transform: 'translateX(-100%)' }}
              animate={{ transform: ['translateX(-100%)', 'translateX(200%)'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <div className="h-2 bg-white/[0.03] rounded-full w-1/2" />
        </div>
      )}
    </div>
  )
}

function PlaylistCard({ playlist, onSelect }) {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
  const [videos, setVideos] = useState(null)
  const [open, setOpen] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)

  async function toggle() {
    if (open) { setOpen(false); return }
    if (!videos) {
      setLoadingItems(true)
      try {
        const data = await fetchYT('playlistItems', apiKey, {
          part: 'snippet', playlistId: playlist.id, maxResults: 12,
        })
        setVideos(data.items || [])
      } catch {}
      setLoadingItems(false)
    }
    setOpen(true)
  }

  return (
    <motion.div layout className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.015]"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.99 }}
        className="w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0 relative bg-white/[0.04]">
          {playlist.snippet.thumbnails?.default?.url && (
            <img src={playlist.snippet.thumbnails.default.url} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <motion.svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 opacity-90"
              whileHover={{ scale: 1.1 }}
            >
              <path d="M8 5v14l11-7z" />
            </motion.svg>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white/80 text-xs font-medium truncate leading-relaxed">{playlist.snippet.title}</p>
          <p className="text-white/30 text-[10px] font-mono mt-0.5">{playlist.contentDetails?.itemCount || 0} videos</p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-white/30 shrink-0">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="playlist-items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24, mass: 0.8 }}
            className="overflow-hidden border-t border-white/[0.04]"
          >
            <div className="p-2 space-y-0.5">
              {loadingItems ? (
                <div className="flex items-center justify-center py-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 rounded-full border border-white/10 border-t-white/30"
                  />
                </div>
              ) : videos?.length === 0 ? (
                <p className="text-[11px] font-mono text-white/20 text-center py-3">No videos in this playlist</p>
              ) : (
                videos?.map((v, i) => (
                  <motion.button
                    key={v.id || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, type: 'spring', stiffness: 200, damping: 24 }}
                    onClick={() => onSelect({ id: v.snippet.resourceId.videoId, snippet: v.snippet })}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left group"
                  >
                    <div className="w-12 h-8 rounded-md overflow-hidden shrink-0 bg-white/[0.04]">
                      {v.snippet.thumbnails?.default?.url && (
                        <img src={v.snippet.thumbnails.default.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="text-white/50 group-hover:text-white/70 text-[11px] truncate leading-relaxed transition-colors">{v.snippet.title}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-white/20 group-hover:text-white/40 ml-auto shrink-0 transition-colors">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
}

const videoCardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 20 },
  },
}

export default function YouTubeBrowse({ channelId, onComplete, onBack }) {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
  const [tab, setTab] = useState('videos')
  const [videos, setVideos] = useState([])
  const [shorts, setShorts] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [channelInfo, setChannelInfo] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [watched, setWatched] = useState(0)
  const [playerError, setPlayerError] = useState(null)
  const [nextPageToken, setNextPageToken] = useState(null)
  const [shortsPageToken, setShortsPageToken] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [videoDurations, setVideoDurations] = useState({})
  const [shortsDurations, setShortsDurations] = useState({})
  const playerContainerRef = useRef(null)
  const playerInstanceRef = useRef(null)
  const watchTimerRef = useRef(null)
  const searchInputRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const apiPromiseRef = useRef(null)

  useEffect(() => {
    if (!apiKey) { setError('YouTube API key not configured. Add VITE_YOUTUBE_API_KEY to .env'); setLoading(false); return }
    loadChannel()
    return () => {
      if (watchTimerRef.current) clearInterval(watchTimerRef.current)
      if (playerInstanceRef.current) { playerInstanceRef.current.destroy(); playerInstanceRef.current = null }
    }
  }, [])

  const YT_ERROR_MAP = { 2: 'Invalid parameter', 5: 'HTML5 player error', 100: 'Video not found or removed', 101: 'Embedding not allowed', 150: 'Embedding not allowed' }

  function getYouTubeAPI() {
    if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
    if (apiPromiseRef.current) return apiPromiseRef.current
    apiPromiseRef.current = new Promise((resolve, reject) => {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.onerror = () => reject(new Error('Failed to load YouTube player API'))
      document.head.appendChild(tag)
      window.onYouTubeIframeAPIReady = () => resolve(window.YT)
      setTimeout(() => reject(new Error('YouTube API load timed out')), 10000)
    })
    return apiPromiseRef.current
  }

  useEffect(() => {
    if (!selectedVideo) return
    setWatched(0)
    setPlayerError(null)
    startWatchTimer()
    let destroyed = false
    getYouTubeAPI().then(YT => {
      if (destroyed || !playerContainerRef.current) return
      if (playerInstanceRef.current) { playerInstanceRef.current.destroy(); playerInstanceRef.current = null }
      playerContainerRef.current.innerHTML = ''
      const p = new YT.Player(playerContainerRef.current, {
        videoId: selectedVideo.id,
        playerVars: { autoplay: 1, rel: 0, controls: 1 },
        events: {
          onStateChange: e => {
            if (e.data === YT.PlayerState.ENDED) {
              if (watchTimerRef.current) clearInterval(watchTimerRef.current)
              setTimeout(() => { if (playerInstanceRef.current) { playerInstanceRef.current.destroy(); playerInstanceRef.current = null }; setSelectedVideo(null); setWatched(0) }, 400)
            }
          },
          onError: e => { setPlayerError(YT_ERROR_MAP[e.data] || 'Playback error') },
        },
      })
      playerInstanceRef.current = p
    }).catch(err => {
      if (!destroyed) setPlayerError(err.message || 'Failed to load player')
    })
    return () => {
      destroyed = true
      if (watchTimerRef.current) clearInterval(watchTimerRef.current)
      if (playerInstanceRef.current) { playerInstanceRef.current.destroy(); playerInstanceRef.current = null }
    }
  }, [selectedVideo])

  function startWatchTimer() {
    if (watchTimerRef.current) clearInterval(watchTimerRef.current)
    watchTimerRef.current = setInterval(() => {
      setWatched(prev => prev + 1)
    }, 1000)
  }

  function stopVideo() {
    if (watchTimerRef.current) clearInterval(watchTimerRef.current)
    if (playerInstanceRef.current) { playerInstanceRef.current.destroy(); playerInstanceRef.current = null }
    setSelectedVideo(null)
    setWatched(0)
    setPlayerError(null)
  }

  function retryPlayer() {
    if (!selectedVideo) return
    setPlayerError(null)
    if (playerInstanceRef.current) { playerInstanceRef.current.destroy(); playerInstanceRef.current = null }
    setSelectedVideo({ ...selectedVideo })
  }

  async function loadChannel() {
    setLoading(true)
    setError(null)
    try {
      const [chData, plData] = await Promise.all([
        fetchYT('channels', apiKey, { part: 'snippet,statistics', id: channelId }),
        fetchYT('playlists', apiKey, { part: 'snippet,contentDetails', channelId, maxResults: 50 }),
      ])
      if (chData.items?.length) setChannelInfo(chData.items[0])
      setPlaylists(plData.items || [])
      await Promise.all([loadVideos(), loadShorts()])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function loadVideos(token) {
    try {
      const data = await fetchYT('search', apiKey, {
        part: 'snippet', channelId, order: 'date', maxResults: 24,
        type: 'video', videoDuration: 'any',
        ...(token ? { pageToken: token } : {}),
      })
      const items = data.items || []
      if (token) {
        setVideos(prev => [...prev, ...items])
      } else {
        setVideos(items)
      }
      const ids = items.map(v => typeof v.id === 'object' ? v.id.videoId : v.id).filter(Boolean)
      fetchDurations(ids, false)
      setNextPageToken(data.nextPageToken || null)
    } catch {}
  }

  async function fetchDurations(ids, isShorts) {
    if (!ids.length) return
    try {
      const data = await fetchYT('videos', apiKey, {
        part: 'contentDetails', id: ids.join(','),
      })
      const map = {}
      ;(data.items || []).forEach(v => { map[v.id] = v.contentDetails?.duration || '' })
      if (isShorts) setShortsDurations(p => ({ ...p, ...map }))
      else setVideoDurations(p => ({ ...p, ...map }))
    } catch {}
  }

  async function loadShorts(token) {
    try {
      const data = await fetchYT('search', apiKey, {
        part: 'snippet', channelId, order: 'date', maxResults: 24,
        type: 'video', videoDuration: 'short',
        ...(token ? { pageToken: token } : {}),
      })
      const items = data.items || []
      if (token) {
        setShorts(prev => [...prev, ...items])
      } else {
        setShorts(items)
      }
      const ids = items.map(v => typeof v.id === 'object' ? v.id.videoId : v.id).filter(Boolean)
      fetchDurations(ids, true)
      setShortsPageToken(data.nextPageToken || null)
    } catch {}
  }

  async function handleSearch() {
    if (!search.trim()) {
      if (tab === 'videos') await loadVideos()
      else if (tab === 'shorts') await loadShorts()
      return
    }
    setLoading(true)
    try {
      const params = {
        part: 'snippet', channelId, q: search, maxResults: 24, type: 'video',
        videoDuration: tab === 'shorts' ? 'short' : 'any',
      }
      const data = await fetchYT('search', apiKey, params)
      if (tab === 'shorts') {
        setShorts(data.items || [])
        setShortsPageToken(null)
      } else {
        setVideos(data.items || [])
        setNextPageToken(null)
      }
    } catch {}
    setLoading(false)
  }

  function handleSelect(video) {
    setSelectedVideo({
      id: typeof video.id === 'object' ? video.id.videoId : video.id,
      snippet: video.snippet,
    })
  }

  const vidDuration = selectedVideo ? videoDurations[selectedVideo.id] : null
  const watchedPercent = vidDuration ? Math.min(100, Math.round((watched / parseDurationSeconds(vidDuration)) * 100)) : 0

  if (loading && videos.length === 0 && shorts.length === 0) {
    return (
      <div className="rounded-2xl sm:rounded-[2.5rem] border border-white/[0.06] p-4 sm:p-7"
        style={{
          background: 'rgba(8,8,16,0.7)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 60px -15px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full bg-white/[0.04] overflow-hidden relative">
              <motion.div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)', transform: 'translateX(-100%)' }}
                animate={{ transform: ['translateX(-100%)', 'translateX(200%)'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <div className="w-28 sm:w-36 h-2.5 rounded-full bg-white/[0.04] overflow-hidden relative">
              <motion.div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)', transform: 'translateX(-100%)' }}
                animate={{ transform: ['translateX(-100%)', 'translateX(200%)'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </motion.div>
          <div className="ml-auto w-16 h-2 rounded-full bg-white/[0.03] overflow-hidden relative">
            <motion.div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)', transform: 'translateX(-100%)' }}
              animate={{ transform: ['translateX(-100%)', 'translateX(200%)'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </div>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div key={i} variants={videoCardVariants}>
                <VideoSkeleton />
              </motion.div>
            ))}
          </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative z-10 flex flex-col items-center gap-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 18 }}
          className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-6 sm:p-7 max-w-md text-center"
          style={{ boxShadow: 'inset 0 1px 0 rgba(239,68,68,0.06)' }}
        >
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="w-5 h-5">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" />
              <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-red-400 text-sm font-medium mb-1.5">Failed to load channel</p>
          <p className="text-white/30 text-xs font-mono leading-relaxed">{error}</p>
        </motion.div>
        <motion.button
          onClick={onBack}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="text-[11px] font-mono text-white/25 hover:text-white/50 transition-colors tracking-wider uppercase"
        >
          Back to verification
        </motion.button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="rounded-2xl sm:rounded-[2.5rem] border border-white/[0.06] overflow-hidden"
      style={{
        background: 'rgba(8,8,16,0.7)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 60px -15px rgba(0,0,0,0.5)',
      }}
    >
        {/* Watch progress bar */}
        <div className="h-[2px] bg-white/[0.04]">
          <motion.div
            className="h-full origin-left"
            style={{ background: 'linear-gradient(90deg, #00f0ff, #10b981)' }}
            animate={{ scaleX: watchedPercent / 100 }}
            transition={{ type: 'spring', stiffness: 60, damping: 20, mass: 0.5 }}
          />
        </div>

        {/* Channel header */}
        {channelInfo && !selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2.5 p-3 sm:p-5 border-b border-white/[0.06]"
          >
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
            {channelInfo.snippet.thumbnails?.default?.url && (
              <motion.img
                src={channelInfo.snippet.thumbnails.default.url}
                alt=""
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/10 shrink-0"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 150, damping: 14 }}
              />
            )}
            <div className="min-w-0">
              <h2 className="text-white font-semibold text-sm truncate tracking-tight">{channelInfo.snippet.title}</h2>
              <p className="text-white/25 text-[10px] font-mono mt-0.5">
                {parseInt(channelInfo.statistics?.subscriberCount || 0).toLocaleString()} subscribers
              </p>
            </div>
            <div className="ml-auto">
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, type: 'spring', stiffness: 80, damping: 10 }}
                className="px-2 py-0.5 rounded-full border border-emerald-400/15 bg-emerald-400/5"
              >
                <span className="text-[9px] font-mono text-emerald-400/70 tracking-wider uppercase">Browse to verify</span>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Selected video player */}
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="border-b border-white/[0.06] overflow-hidden"
          >
            <div className="relative aspect-video bg-black">
              <div ref={playerContainerRef} className="absolute inset-0 w-full h-full" />
              {playerError && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur-sm p-4">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="w-4 h-4">
                      <circle cx="12" cy="12" r="10" strokeLinecap="round" />
                      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
                      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-red-400 text-xs font-medium text-center">{playerError}</p>
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={retryPlayer}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-[10px] font-mono text-white/60 hover:text-white/80 hover:bg-white/15 transition-colors"
                    >
                      Retry
                    </motion.button>
                    <motion.button
                      onClick={stopVideo}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-white/30 hover:text-white/50 transition-colors"
                    >
                      Back to videos
                    </motion.button>
                  </div>
                </div>
              )}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <motion.button
                  onClick={stopVideo}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </motion.button>
              </div>
              <motion.button
                onClick={stopVideo}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </motion.button>
            </div>
            <div className="p-3 sm:p-5">
              <p className="text-white/80 text-sm font-medium leading-relaxed line-clamp-2">{selectedVideo.snippet.title}</p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-2 sm:gap-0">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 shrink-0"
                  />
                  <p className="text-[10px] font-mono text-white/20 tracking-wider">Watching to verify</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-2.5">
                  {vidDuration && (
                    <p className="text-[9px] font-mono text-white/15 tabular-nums hidden sm:inline">{formatDuration(vidDuration)}</p>
                  )}
                  <div className="w-16 sm:w-20 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-emerald-400/60 origin-left"
                      animate={{ scaleX: watchedPercent / 100 }}
                      transition={{ type: 'spring', stiffness: 60, damping: 20 }}
                    />
                  </div>
                  <motion.p
                    key={watched}
                    initial={{ opacity: 0.5, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] font-mono text-emerald-400/80 tabular-nums min-w-[7ch] text-right"
                  >
                    {String(Math.floor(watched / 60)).padStart(2, '0')}:{String(watched % 60).padStart(2, '0')}
                  </motion.p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs + search */}
        {!selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/[0.06]"
          >
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="shrink-0 w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors sm:hidden"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
            <div className="flex gap-0.5 p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.04] overflow-x-auto scrollbar-thin shrink min-w-0">
              {['videos', 'shorts', 'playlists'].map(t => (
                <motion.button
                  key={t}
                  onClick={() => setTab(t)}
                  whileTap={{ scale: 0.96 }}
                  className={`relative shrink-0 px-3.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    tab === t ? 'text-white' : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {tab === t && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 rounded-lg bg-white/[0.08]"
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                  )}
                  <span className="relative z-10 font-mono tracking-wider uppercase">{t}</span>
                </motion.button>
              ))}
            </div>
            <div className="flex-1 min-w-[8px]" />
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={`Search ${tab}...`}
                  className="w-28 sm:w-36 lg:w-44 bg-white/[0.03] border border-white/[0.06] rounded-lg pl-2.5 pr-7 py-1.5 text-[11px] text-white/60 placeholder-white/15 outline-none focus:border-white/15 focus:bg-white/[0.04] transition-all font-mono"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                />
                <motion.button
                  onClick={handleSearch}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/[0.06] transition-colors text-white/25 hover:text-white/50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><circle cx="11" cy="11" r="8" strokeLinecap="round" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Content */}
        {!selectedVideo && (
          <div className="p-3 sm:p-4 lg:p-5 overflow-y-auto scrollbar-thin min-h-[160px] sm:min-h-[200px] max-h-[calc(100dvh-260px)] sm:max-h-[calc(100dvh-320px)]"
            ref={scrollContainerRef}
          >
            <AnimatePresence mode="wait">
              {tab === 'videos' && (
                <motion.div
                  key="videos"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3"
                  >
                    {videos.map((v, i) => {
                      const vidId = typeof v.id === 'object' ? v.id.videoId : v.id
                      return (
                        <motion.button
                          key={vidId || i}
                          variants={videoCardVariants}
                          whileHover={{ scale: 1.02, y: -3 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSelect(v)}
                          className="group relative rounded-2xl overflow-hidden border border-white/[0.04] hover:border-white/[0.12] transition-colors text-left bg-white/[0.015]"
                          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                        >
                          <div className="relative aspect-video bg-white/[0.03] overflow-hidden">
                            {v.snippet.thumbnails?.high?.url && (
                              <motion.img
                                src={v.snippet.thumbnails.high.url}
                                alt=""
                                className="w-full h-full object-cover"
                                whileHover={{ scale: 1.06 }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <motion.div
                                initial={{ opacity: 0, scale: 0.7 }}
                                whileHover={{ opacity: 1, scale: 1 }}
                                className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' }}
                              >
                                <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                              </motion.div>
                            </div>
                            {videoDurations[vidId] && (
                              <div className="absolute bottom-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10">
                                <span className="text-[9px] font-mono text-white/90 font-semibold tabular-nums">{formatDuration(videoDurations[vidId])}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-2.5 sm:p-3">
                            <p className="text-white/70 text-[11px] font-medium line-clamp-2 leading-snug group-hover:text-white/95 transition-colors duration-300">{v.snippet.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <p className="text-white/15 text-[9px] font-mono">{timeAgo(v.snippet.publishedAt)}</p>
                              <span className="text-white/[0.06] text-[9px]">&bull;</span>
                              <p className="text-white/15 text-[9px] font-mono truncate">{v.snippet.channelTitle}</p>
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </motion.div>

                  {nextPageToken && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-center mt-4 sm:mt-5"
                    >
                      <motion.button
                        onClick={() => { setLoadingMore(true); loadVideos(nextPageToken).then(() => setLoadingMore(false)) }}
                        disabled={loadingMore}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-5 py-2 rounded-xl border border-white/[0.06] text-[11px] font-mono text-white/35 hover:text-white/60 hover:border-white/15 transition-colors disabled:opacity-25 bg-white/[0.02]"
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                      >
                        {loadingMore ? (
                          <span className="flex items-center gap-2">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 rounded-full border border-white/10 border-t-white/30" />
                            Loading
                          </span>
                        ) : (
                          'Load more videos'
                        )}
                      </motion.button>
                    </motion.div>
                  )}

                  {videos.length === 0 && !loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center gap-4 py-16"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-6 h-6 text-white/15"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" /><polyline points="14 2 14 8 20 8" strokeLinecap="round" /><line x1="9" y1="15" x2="15" y2="15" strokeLinecap="round" /></svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-white/20">No videos found</p>
                        <p className="text-[10px] font-mono text-white/10 mt-1">Try a different search or check back later</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {tab === 'shorts' && (
                <motion.div
                  key="shorts"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Shorts horizontal scrolling row */}
                  <div className="flex gap-2 sm:gap-3 pb-2 overflow-x-auto snap-x snap-mandatory scrollbar-thin -mx-1 px-1"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {shorts.map((v, i) => {
                      const vidId = typeof v.id === 'object' ? v.id.videoId : v.id
                      return (
                        <motion.button
                          key={vidId || i}
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, type: 'spring', stiffness: 90, damping: 18 }}
                          whileHover={{ scale: 1.04, y: -5 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleSelect(v)}
                          className="snap-start shrink-0 w-32 sm:w-40 lg:w-48 rounded-[1.75rem] overflow-hidden border border-red-500/10 hover:border-red-400/25 transition-colors bg-white/[0.015] group relative flex flex-col"
                          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                        >
                          <div className="relative aspect-[9/16] bg-white/[0.03] overflow-hidden">
                            {v.snippet.thumbnails?.high?.url && (
                              <motion.img
                                src={v.snippet.thumbnails.high.url}
                                alt=""
                                className="w-full h-full object-cover"
                                whileHover={{ scale: 1.1 }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
                              <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                whileHover={{ opacity: 1, y: 0 }}
                                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}
                              >
                                <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                              </motion.div>
                            </div>
                            {shortsDurations[vidId] && (
                              <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10">
                                <span className="text-[8px] font-mono text-white/90 font-semibold tabular-nums">{formatDuration(shortsDurations[vidId])}</span>
                              </div>
                            )}
                            <div className="absolute top-2 left-2 z-10">
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/20 backdrop-blur-sm border border-red-400/20">
                                <svg viewBox="0 0 24 24" fill="#ef4444" className="w-2.5 h-2.5"><path d="M17.5 12.5L8 18V7l9.5 5.5z" /></svg>
                                <span className="text-[7px] font-mono text-red-300 tracking-widest uppercase font-semibold">Short</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-2.5 flex-1 flex flex-col justify-between gap-1">
                            <p className="text-white/60 text-[10px] font-medium line-clamp-2 leading-snug group-hover:text-white/85 transition-colors duration-300">{v.snippet.title}</p>
                            <p className="text-white/12 text-[8px] font-mono">{timeAgo(v.snippet.publishedAt)}</p>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>

                  {shortsPageToken && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-center mt-4"
                    >
                      <motion.button
                        onClick={() => { setLoadingMore(true); loadShorts(shortsPageToken).then(() => setLoadingMore(false)) }}
                        disabled={loadingMore}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-5 py-2 rounded-xl border border-white/[0.06] text-[11px] font-mono text-white/35 hover:text-white/60 hover:border-white/15 transition-colors disabled:opacity-25 bg-white/[0.02]"
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                      >
                        {loadingMore ? (
                          <span className="flex items-center gap-2">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 rounded-full border border-white/10 border-t-white/30" />
                            Loading
                          </span>
                        ) : (
                          'Load more shorts'
                        )}
                      </motion.button>
                    </motion.div>
                  )}

                  {shorts.length === 0 && !loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center gap-4 py-16"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-6 h-6 text-white/15">
                          <path d="M17.5 12.5L8 18V7l9.5 5.5z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-white/20">No shorts found</p>
                        <p className="text-[10px] font-mono text-white/10 mt-1">Short-form content will appear here</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {tab === 'playlists' && (
                <motion.div
                  key="playlists"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2 max-w-xl mx-auto"
                >
                  {playlists.map((pl, i) => (
                    <motion.div
                      key={pl.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, type: 'spring', stiffness: 100, damping: 20 }}
                    >
                      <PlaylistCard playlist={pl} onSelect={handleSelect} />
                    </motion.div>
                  ))}
                  {playlists.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-4 py-16"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-6 h-6 text-white/15"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" /></svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-white/20">No public playlists</p>
                        <p className="text-[10px] font-mono text-white/10 mt-1">Channel playlists will appear here</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
  )
}
