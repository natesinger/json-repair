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

  // Save input to localStorage with debouncing
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      try {
        if (inputValue.trim()) {
          localStorage.setItem(INPUT_STORAGE_KEY, inputValue)
        } else {
          localStorage.removeItem(INPUT_STORAGE_KEY)
        }
      } catch {
        // Ignore localStorage errors
      }
    }, 500) // Debounce localStorage writes

    return () => clearTimeout(saveTimer)
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

  // Live processing with optimized debouncing
  useEffect(() => {
    // Clear timer if input is empty or live mode is disabled
    if (!inputValue.trim() || !liveMode) {
      if (liveTimerRef.current) {
        clearTimeout(liveTimerRef.current)
        liveTimerRef.current = null
      }
      
      if (!inputValue.trim()) {
        setProcessedResult(null)
      }
      return
    }

    // Debounce processing
    if (liveTimerRef.current) {
      clearTimeout(liveTimerRef.current)
    }

    liveTimerRef.current = setTimeout(() => {
      processInput(inputValue)
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
  
  // Check if input contains common JSON syntax issues that need repair
  const needsRepair = /0[1-9]|\.\d+|\d+\.|\b(NaN|Infinity|undefined|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\b|\d+[eE]/.test(text)
  
  // If input needs repair, skip the initial parse attempt
  if (needsRepair) {
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
    } catch (repairedError: any) {
      const after = performance.now()
      
      // Try to detect errors in the original text for better positioning
      const originalErrorInfo = detectOriginalJsonErrors(text)
      
      if (originalErrorInfo) {
        return { 
          ok: false, 
          error: originalErrorInfo.error || repairedError.message || 'Unknown error', 
          cleaned, 
          pos: originalErrorInfo.pos || undefined, 
          line: originalErrorInfo.line || undefined, 
          col: originalErrorInfo.col || undefined,
          token: originalErrorInfo.token || undefined,
          ms: parseFloat((after - before).toFixed(1)) 
        }
      } else {
        // Fallback to error detection from repaired text
        const result = locateJsonError(repairedError.message, cleaned)
        return { 
          ok: false, 
          error: repairedError.message, 
          cleaned, 
          pos: result.pos || undefined, 
          line: result.line || undefined, 
          col: result.col || undefined,
          token: result.token || undefined,
          ms: parseFloat((after - before).toFixed(1)) 
        }
      }
    }
  }
  
  // Otherwise, try to parse the original text first
  try {
    const obj = JSON.parse(text)
    const after = performance.now()
    return { 
      ok: true, 
      obj, 
      cleaned: text, // Return original text as cleaned since no repair was needed
      ms: parseFloat((after - before).toFixed(1)) 
    }
  } catch (originalError: any) {
    // Original text is not valid JSON, proceed with repair
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
        // Try to detect errors in the original text for better positioning
        const originalErrorInfo = detectOriginalJsonErrors(text)
        
        if (originalErrorInfo) {
          return { 
            ok: false, 
            error: originalErrorInfo.error || secondError?.message || 'Unknown error', 
            cleaned: doubleCleaned, 
            pos: originalErrorInfo.pos || undefined, 
            line: originalErrorInfo.line || undefined, 
            col: originalErrorInfo.col || undefined,
            token: originalErrorInfo.token || undefined
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
}