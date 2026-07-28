import { useCallback, useEffect, useRef, useState } from "react"

const THRESHOLD = 80
const MAX_PULL = 120

/**
 * iOS Safari standalone (ditambahkan ke layar utama) tidak punya gestur
 * pull-to-refresh bawaan seperti tab browser biasa atau PWA Android/Chrome —
 * makanya fitur ini cuma aktif di kondisi itu. Deteksi lewat `navigator.standalone`
 * (khusus iOS) DAN UA iPhone/iPad, bukan cuma salah satu, supaya tidak
 * kepicu di iPad mode desktop atau browser lain yang kebetulan punya properti
 * serupa.
 */
const isIosStandalone = () => {
  if (typeof navigator === "undefined") return false
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (!standalone) return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export const usePullToRefresh = (onRefresh: () => void) => {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const startYRef = useRef(0)
  const isPullingRef = useRef(false)
  const isRefreshingRef = useRef(false)
  const pullDistanceRef = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0) return
    startYRef.current = e.touches[0].clientY
    isPullingRef.current = true
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || isRefreshingRef.current) return

    const delta = e.touches[0].clientY - startYRef.current
    if (delta <= 0) {
      pullDistanceRef.current = 0
      setPullDistance(0)
      return
    }

    // Rubber-band: makin ditarik, makin berat gerakannya.
    const clamped = Math.min(delta * 0.5, MAX_PULL)
    pullDistanceRef.current = clamped
    setPullDistance(clamped)
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return
    isPullingRef.current = false

    if (pullDistanceRef.current >= THRESHOLD) {
      isRefreshingRef.current = true
      setIsRefreshing(true)
      setPullDistance(THRESHOLD)
      await new Promise((resolve) => setTimeout(resolve, 500))
      onRefresh()
    } else {
      setPullDistance(0)
    }
  }, [onRefresh])

  useEffect(() => {
    if (!isIosStandalone()) return

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    })
    document.addEventListener("touchmove", handleTouchMove, { passive: true })
    document.addEventListener("touchend", handleTouchEnd)

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return { pullDistance, isRefreshing }
}
