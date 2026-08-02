"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

import { TOUR_STEPS, type TourStep } from "@/lib/tour/steps"

const STORAGE_KEY = "nabar-ftue"

type TourStatus = "idle" | "active" | "done"

type TourContextValue = {
  status: TourStatus
  step: TourStep | null
  start: () => void
  next: () => void
  skip: () => void
  finish: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

const readStoredStatus = (): TourStatus => {
  if (typeof window === "undefined") return "idle"
  return window.localStorage.getItem(STORAGE_KEY) === "done" ? "done" : "idle"
}

export const TourProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<TourStatus>(readStoredStatus)
  const [stepIndex, setStepIndex] = useState(0)

  const persistDone = useCallback(() => {
    setStatus("done")
    window.localStorage.setItem(STORAGE_KEY, "done")
  }, [])

  const start = useCallback(() => {
    setStepIndex(0)
    setStatus("active")
  }, [])

  const next = useCallback(() => {
    setStepIndex((index) => {
      const nextIndex = index + 1
      if (nextIndex >= TOUR_STEPS.length) {
        persistDone()
        return index
      }
      return nextIndex
    })
  }, [persistDone])

  const step = status === "active" ? (TOUR_STEPS[stepIndex] ?? null) : null

  const value = useMemo(
    () => ({
      status,
      step,
      start,
      next,
      skip: persistDone,
      finish: persistDone,
    }),
    [status, step, start, next, persistDone],
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export const useTour = () => {
  const context = useContext(TourContext)

  if (!context) {
    throw new Error("useTour must be used within a TourProvider.")
  }

  return context
}
