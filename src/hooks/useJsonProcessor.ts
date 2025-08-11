import { useState, useEffect, useCallback, useRef } from 'react'
import { JsonParseResult, ProcessedResult } from '../types'
import { repairJson, detectOriginalJsonErrors, locateJsonError } from '../utils/jsonUtils'

const INPUT_STORAGE_KEY = 'jrInput:v1'

export function useJsonProcessor(liveMode: boolean) {
  const [inputValue, setInputValue] = useState('')
  const [processedResult, setProcessedResult] = useState<ProcessedResult | null>(null)
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load input from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(INPUT_STORAGE_KEY)
      if (saved) {
        setInputValue(saved)
      }
    } catch {
      // Use empty string if localStorage fails
    }
  }, [])

  // Save input to localStorage whenever it changes
  useEffect(() => {
    try {
      if (inputValue.trim()) {
        localStorage.setItem(INPUT_STORAGE_KEY, inputValue)
      } else {
        localStorage.removeItem(INPUT_STORAGE_KEY)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [inputValue])

  const processInput = useCallback((text: string) => {
    const result = safeParse(text)
    const processed: ProcessedResult = {
      input: text,
      result,
      timestamp: Date.now()
    }
    setProcessedResult(processed)
    return processed
  }, [])

  const clearInput = useCallback(() => {
    setInputValue('')
    setProcessedResult(null)
    try {
      localStorage.removeItem(INPUT_STORAGE_KEY)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Live processing with debouncing
  useEffect(() => {
    if (!inputValue.trim()) {
      if (liveTimerRef.current) {
        clearTimeout(liveTimerRef.current)
        liveTimerRef.current = null
      }
      // Clear processed result when input is empty
      setProcessedResult(null)
      return
    }

    // Only auto-process if live mode is enabled
    if (!liveMode) {
      if (liveTimerRef.current) {
        clearTimeout(liveTimerRef.current)
        liveTimerRef.current = null
      }
      return
    }

    if (liveTimerRef.current) {
      clearTimeout(liveTimerRef.current)
    }

    liveTimerRef.current = setTimeout(() => {
      const result = processInput(inputValue)
      setProcessedResult(result)
    }, 120)

    return () => {
      if (liveTimerRef.current) {
        clearTimeout(liveTimerRef.current)
      }
    }
  }, [inputValue, liveMode, processInput])

  // Manual processing for non-live mode
  const processManual = useCallback(() => {
    if (inputValue.trim()) {
      processInput(inputValue)
    }
  }, [inputValue, processInput])

  return {
    inputValue,
    setInputValue,
    processedResult,
    processInput,
    processManual,
    clearInput
  }
}

function safeParse(text: string): JsonParseResult {
  if (!text.trim()) {
    return { ok: null, cleaned: '' }
  }

  const before = performance.now()
  
  // First, try to detect errors in the original text for better positioning
  const originalError = detectOriginalJsonErrors(text)
  
  const cleaned = repairJson(text)
  
  try {
    const obj = JSON.parse(cleaned)
    const after = performance.now()
    return { 
      ok: true, 
      obj, 
      cleaned, 
      ms: parseFloat((after - before).toFixed(1)) 
    }
  } catch (e: any) {
    // Check if this error can be auto-fixed by trying to repair it again
    const doubleCleaned = repairJson(cleaned)
    try {
      JSON.parse(doubleCleaned)
      // If it can be auto-fixed, don't show it as an error
      return { 
        ok: true, 
        obj: JSON.parse(doubleCleaned), 
        cleaned: doubleCleaned, 
        ms: parseFloat((performance.now() - before).toFixed(1)) 
      }
    } catch (secondError: any) {
      // This error requires manual intervention
      // Use the original error detection if available, otherwise fall back to the old method
      if (originalError) {
        return { 
          ok: false, 
          error: originalError.error || secondError?.message || 'Unknown error', 
          cleaned: doubleCleaned, 
          pos: originalError.pos || undefined, 
          line: originalError.line || undefined, 
          col: originalError.col || undefined,
          token: originalError.token || undefined
        }
      } else {
        // Fallback to old error detection method
        const result = locateJsonError(secondError?.message, doubleCleaned)
        return { 
          ok: false, 
          error: secondError?.message || 'Unknown error', 
          cleaned: doubleCleaned, 
          pos: result.pos || undefined, 
          line: result.line || undefined, 
          col: result.col || undefined,
          token: result.token || undefined
        }
      }
    }
  }
} 