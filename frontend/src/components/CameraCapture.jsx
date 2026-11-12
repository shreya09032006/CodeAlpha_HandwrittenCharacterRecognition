import { useEffect, useRef, useState } from 'react'

const explain = e =>
  e?.name === 'NotAllowedError' ? 'Camera access was blocked. Allow it in your browser settings and try again.'
  : e?.name === 'NotFoundError' ? 'No camera was found on this device.'
  : 'Could not start the camera.'

// Full-screen live camera (used on laptops/desktops; phones use their native camera app).
export default function CameraCapture({ onClose, onCapture }) {
  const video = useRef(null)
  const stream = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let dead = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr('The camera needs a secure (https) connection.')
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(s => {
        if (dead) return s.getTracks().forEach(t => t.stop())
        stream.current = s
        video.current.srcObject = s
        return video.current.play().then(() => setReady(true))
      })
      .catch(e => { if (!dead) setErr(explain(e)) })
    const onKey = e => e.key === 'Escape' && closeRef.current()
    addEventListener('keydown', onKey)
    return () => {
      dead = true
      removeEventListener('keydown', onKey)
      stream.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const shoot = () => {
    const v = video.current
    if (!v?.videoWidth) return
    const k = Math.min(1, 2000 / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * k)
    c.height = Math.round(v.videoHeight * k)
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
    c.toBlob(b => {
      if (!b) return
      onCapture(new File([b], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      onClose()
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-ink text-mist" role="dialog" aria-modal="true" aria-label="Take a photo">
      {err ? (
        <div className="grid flex-1 place-items-center p-8 text-center">
          <div className="max-w-sm space-y-5">
            <p className="font-display text-3xl uppercase">Camera unavailable</p>
            <p className="text-sm leading-relaxed opacity-80">{err}</p>
            <button onClick={onClose} className="min-h-11 rounded-full bg-mist px-6 text-xs uppercase tracking-[.14em] text-ink">Close</button>
          </div>
        </div>
      ) : (
        <>
          <video ref={video} playsInline muted className="min-h-0 flex-1 bg-black object-contain" />
          <div className="flex items-center justify-between px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
            <button onClick={onClose} className="min-h-11 rounded-full border border-white/30 px-5 text-xs uppercase tracking-[.14em]">Cancel</button>
            <button
              onClick={shoot} disabled={!ready} aria-label="Take photo"
              className="h-16 w-16 rounded-full border-4 border-white bg-jelly transition active:scale-90 disabled:opacity-40"
            />
            <span className="w-[5.5rem]" aria-hidden="true" />
          </div>
        </>
      )}
    </div>
  )
}
