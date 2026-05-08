import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { X } from 'lucide-react'

interface Props {
  onCode: (code: string) => void
  onClose: () => void
}

/**
 * Live camera barcode scanner using @zxing/browser.
 *
 * NOTE: getUserMedia requires HTTPS on real phones (localhost is exempt
 * on desktop). For LAN testing on your phone, use a tunnel like
 *   `npx cloudflared tunnel --url http://localhost:5173`
 * which gives you an HTTPS URL.
 */
export default function BarcodeScanner({ onCode, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let cancelled = false

    ;(async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        // Prefer back camera on phones
        const back = devices.find(d => /back|rear|environment/i.test(d.label)) ?? devices[devices.length - 1]
        const deviceId = back?.deviceId

        const controls = await reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
          if (result) {
            const code = result.getText()
            controls.stop()
            if (!cancelled) onCode(code)
          }
          // ignore err — fires constantly on each video frame
        })
        controlsRef.current = controls
      } catch (e: any) {
        setError(e?.message ?? 'Camera not available')
      }
    })()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [onCode])

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="font-semibold">Point at a barcode</span>
        <button onClick={onClose} aria-label="Close" className="p-2"><X /></button>
      </div>

      <div className="flex-1 relative grid place-items-center overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {/* viewfinder overlay */}
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="w-72 max-w-[80%] h-40 border-2 border-accent rounded-xl shadow-[0_0_60px_rgba(168,85,247,.3)]" />
        </div>
        {error && (
          <div className="absolute inset-x-4 bottom-8 text-center text-sm text-red-300 bg-black/60 rounded-xl p-3">
            {error}
            <div className="text-xs text-muted mt-1">
              Camera needs HTTPS on phones. See README for the cloudflared tunnel command.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
