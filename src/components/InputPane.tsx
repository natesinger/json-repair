import React, { useRef, useEffect, useCallback, useState } from 'react'
import { ErrorLocation } from '../types'
import { locateJsonError } from '../utils/jsonUtils'

interface InputPaneProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  onSample: () => void
  onManualProcess: () => void
  tabSize: number
  errorInfo?: {
    error: string
    line?: number
    col?: number
    token?: string
  } | null
}

const InputPane: React.FC<InputPaneProps> = ({ 
  value, 
  onChange, 
  onClear, 
  onSample,
  onManualProcess,
  tabSize,
  errorInfo: propErrorInfo
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [dragError, setDragError] = useState<string | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  
  // Local error state for input validation
  const [localErrorInfo, setLocalErrorInfo] = useState<ErrorLocation | null>(null)
  
  // Use prop error info if available and has valid line/col, otherwise use local error info
  // Clear local error info if prop error info is null (JSON is valid)
  const errorInfo = (propErrorInfo && propErrorInfo.line && propErrorInfo.col) ? {
    error: propErrorInfo.error,
    line: propErrorInfo.line,
    col: propErrorInfo.col,
    token: propErrorInfo.token
  } : (propErrorInfo === null ? null : localErrorInfo)

  // Clear local error info when prop error info becomes null (JSON is valid)
  useEffect(() => {
    if (propErrorInfo === null) {
      setLocalErrorInfo(null)
    }
  }, [propErrorInfo])

  // Additional error clearing when input value changes and becomes valid
  useEffect(() => {
    if (value.trim()) {
      try {
        JSON.parse(value)
        setLocalErrorInfo(null)
      } catch (err) {
        // JSON is invalid, keep existing error info
      }
    } else {
      setLocalErrorInfo(null)
    }
  }, [value])
  const [lineNumbers, setLineNumbers] = useState<number[]>([])
  const [inputStatus, setInputStatus] = useState<{ lines: number; chars: number }>({ lines: 0, chars: 0 })
  const [scrollTop, setScrollTop] = useState(0)
  


  // Update line numbers - optimized version
  const updateLineNumbers = useCallback(() => {
    if (!textareaRef.current) return
    
    const logicalLines = value.split('\n')
    const textarea = textareaRef.current
    const containerWidth = textarea.clientWidth - 24
    const charsPerLine = Math.max(Math.floor(containerWidth / 8), 1) // Minimum 1 char per line
    
    const visualLineNumbers: number[] = []
    
    for (let i = 0; i < logicalLines.length; i++) {
      const lineLength = logicalLines[i].length
      const visualLines = Math.max(Math.ceil(lineLength / charsPerLine), 1)
      
      // Fill array with the same line number for wrapped lines
      visualLineNumbers.push(...Array(visualLines).fill(i + 1))
    }
    
    setLineNumbers(visualLineNumbers)
  }, [value])

  // Update input status (line count and character count) - optimized
  const updateInputStatus = useCallback(() => {
    const len = value.length
    const logicalLines = value.length > 0 ? value.split('\n').length : 1
    
    setInputStatus({ lines: logicalLines, chars: len })
  }, [value])

  // Combined effect for updating line numbers and status
  useEffect(() => {
    if (!textareaRef.current) return
    
    // Use requestAnimationFrame for better performance
    const updateUI = () => {
      updateLineNumbers()
      updateInputStatus()
    }
    
    // Debounce updates to avoid excessive recalculations
    const timer = setTimeout(updateUI, 16) // ~60fps
    return () => clearTimeout(timer)
  }, [value, updateLineNumbers, updateInputStatus])

  // Global drag event prevention to stop browser from opening files
  useEffect(() => {
    const preventDefaultDrag = (e: DragEvent) => {
      e.preventDefault()
    }
    
    const preventDefaultDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Prevent default drag/drop behavior globally
    document.addEventListener('dragover', preventDefaultDrag)
    document.addEventListener('drop', preventDefaultDrop)
    
    return () => {
      document.removeEventListener('dragover', preventDefaultDrag)
      document.removeEventListener('drop', preventDefaultDrop)
    }
  }, [])

  // Handle window resize to update line numbers when text wrapping changes
  useEffect(() => {
    const handleResize = () => {
      // Debounce resize events
      clearTimeout((window as any).resizeTimer)
      ;(window as any).resizeTimer = setTimeout(() => {
        updateLineNumbers()
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout((window as any).resizeTimer)
    }
  }, [updateLineNumbers])

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current) {
      const lineNumbersEl = document.getElementById('lineNumbers')
      if (lineNumbersEl) {
        // Ensure smooth scrolling by using the exact scroll position
        lineNumbersEl.scrollTop = textareaRef.current.scrollTop
      }
      
      // Update scroll position state for error marker positioning
      setScrollTop(textareaRef.current.scrollTop)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    updateInputStatus()
    updateLineNumbers()
    
    // Show errors in real-time and clear them immediately when JSON becomes valid
    if (e.target.value.trim()) {
      try {
        JSON.parse(e.target.value)
        console.log('JSON is valid, clearing localErrorInfo immediately')
        setLocalErrorInfo(null)
      } catch (err: any) {
        const result = locateJsonError(err.message, e.target.value)
        if (result.line && result.col) {
          console.log('Setting localErrorInfo to:', { line: result.line, col: result.col })
          setLocalErrorInfo({ 
            line: result.line, 
            col: result.col, 
            token: result.token || undefined 
          })
        }
      }
    } else {
      console.log('Empty input, clearing localErrorInfo')
      setLocalErrorInfo(null)
    }
  }

  const handleInputChange = (_e: React.FormEvent<HTMLTextAreaElement>) => {
    // This fires immediately on any content change (typing, pasting, etc.)
    
    // Reset scroll position to top to ensure proper alignment
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0
    }
    
    // Update both line numbers and status immediately
    updateLineNumbers()
    updateInputStatus()
    
    // Note: Error handling is now done in handleInput to avoid conflicts
    // This function only handles UI updates (line numbers, status, scroll)
    
    // Also update after a short delay to catch any delayed changes
    setTimeout(() => {
      updateLineNumbers()
      updateInputStatus()
    }, 0)
    
    // Additional update after DOM has processed
    requestAnimationFrame(() => {
      updateLineNumbers()
      updateInputStatus()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Tab key to insert tab character instead of moving focus
    if (e.key === 'Tab' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      
      if (textareaRef.current) {
        const textarea = textareaRef.current
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        
        // Insert tab character based on tabSize setting
        const tabChar = ' '.repeat(tabSize)
        const newValue = value.substring(0, start) + tabChar + value.substring(end)
        
        // Update the value
        onChange(newValue)
        
        // Set cursor position after the inserted tab
        const newCursorPos = start + tabChar.length
        
        // Use setTimeout to ensure the DOM has updated before setting selection
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
            textareaRef.current.focus()
          }
        }, 0)
      }
      return
    }
    
    // Handle Shift+Enter for manual processing
    if (e.key === 'Enter' && e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      onManualProcess()
    }
  }



  // Handle paste events more directly
  const handlePasteEvent = (_e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Let the default paste happen first
    // Then update everything after the paste has completed
    setTimeout(() => {
      // Reset scroll position to top to ensure proper alignment
      if (textareaRef.current) {
        textareaRef.current.scrollTop = 0
      }
      updateLineNumbers()
      updateInputStatus()
      
      // Check for errors after paste and clear them immediately if JSON is valid
      if (textareaRef.current && textareaRef.current.value.trim()) {
        try {
          JSON.parse(textareaRef.current.value)
          console.log('PasteEvent: JSON is valid, clearing localErrorInfo')
          setLocalErrorInfo(null)
        } catch (err) {
          // JSON is invalid, error will be set by handleInput
        }
      } else {
        setLocalErrorInfo(null)
      }
    }, 0)
  }

  // Enhanced drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    setIsDragOver(true)
    setDragError(null)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => Math.max(0, prev - 1))
    if (dragCounter <= 1) {
      setIsDragOver(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    setDragCounter(0)
    setDragError(null)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) {
      setDragError('No files were dropped')
      return
    }
    
    if (files.length > 1) {
      setDragError('Please drop only one file at a time')
      return
    }
    
    const file = files[0]
    
    // Enhanced file validation
    const isValidFile = () => {
      // Check file type
      if (file.type === 'text/plain' || file.type === 'application/json') {
        return true
      }
      
      // Check file extension
      const extension = file.name.toLowerCase().split('.').pop()
      const validExtensions = ['json', 'txt', 'js', 'py', 'md', 'csv', 'xml', 'yaml', 'yml']
      if (extension && validExtensions.includes(extension)) {
        return true
      }
      
      return false
    }
    
    if (!isValidFile()) {
      setDragError(`Unsupported file type: ${file.type || 'unknown'}. Please drop a text file (.txt, .json, .js, .py, .md, .csv, .xml, .yaml, .yml)`)
      return
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setDragError('File too large. Please drop a file smaller than 5MB')
      return
    }
    
    setIsProcessingFile(true)
    
    try {
      const text = await file.text()
      
      // Basic content validation
      if (!text.trim()) {
        setDragError('File is empty or contains only whitespace')
        return
      }
      
      // Success! Load the file content
      onChange(text)
      
      // Reset scroll position to top to ensure proper alignment
      if (textareaRef.current) {
        textareaRef.current.scrollTop = 0
      }
      
      // Update line numbers and status after file load
      setTimeout(() => {
        updateLineNumbers()
        updateInputStatus()
        
        // Check for errors after file load
        if (text.trim()) {
          try {
            JSON.parse(text)
            console.log('FileDrop: JSON is valid, clearing localErrorInfo')
            setLocalErrorInfo(null)
          } catch (err) {
            // JSON is invalid, error will be set by handleInput
          }
        } else {
          setLocalErrorInfo(null)
        }
      }, 0)
      
      // Clear any previous drag errors
      setDragError(null)
      
    } catch (error) {
      console.error('Error reading file:', error)
      setDragError('Failed to read file. Please try again.')
    } finally {
      setIsProcessingFile(false)
    }
  }

  return (
    <section className="pane" id="left">
      <header>
        <div className="toolbar">
          <strong>Input</strong>
          <div className="spacer"></div>
          <button className="btn" onClick={onSample}>Sample</button>
          <button className="btn" onClick={onClear}>Clear</button>
        </div>
      </header>

      <div 
        className="editor"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <div 
          className="line-numbers" 
          id="lineNumbers"
        >
          {lineNumbers.map((lineNum, index) => {
            // Check if this is a wrapped line (same number as previous)
            const isWrapped = index > 0 && lineNumbers[index - 1] === lineNum
            return (
              <div 
                key={index} 
                className={`line-number ${isWrapped ? 'line-number-wrapped' : ''}`}
              >
                {lineNum}
              </div>
            )
          })}
        </div>
        <textarea
          ref={textareaRef}
          id="input"
          spellCheck={false}
          placeholder="Paste JSON, Python dict, or messy data here… or drag and drop a file"
          value={value}
          onChange={handleInput}
          onInput={handleInputChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onPaste={handlePasteEvent}
          className={`${isDragOver ? 'drag-over' : ''} ${dragError ? 'drag-error' : ''}`}
          draggable={false}
        />
        <div id="markerLayer" className="marker-layer" aria-hidden="true">
          {errorInfo && errorInfo.line && errorInfo.col && (
            <ErrorMarker
              key={`${errorInfo.line}-${errorInfo.col}-${scrollTop}`}
              line={errorInfo.line}
              col={errorInfo.col}
              token={errorInfo.token}
              value={value}
              textareaRef={textareaRef}
              scrollTop={scrollTop}
            />
          )}
        </div>
        
        {/* Drag and Drop Visual Feedback */}
        {isDragOver && (
          <div className="drag-overlay">
            <div className="drag-content">
              <div className="drag-icon">📁</div>
              <div className="drag-text">Drop file here</div>
              <div className="drag-hint">Supported: .json, .txt, .js, .py, .md, .csv, .xml, .yaml, .yml</div>
            </div>
          </div>
        )}
        
        {dragError && (
          <div className="drag-error-message">
            <div className="drag-error-icon">⚠️</div>
            <div className="drag-error-text">{dragError}</div>
            <button 
              className="drag-error-dismiss" 
              onClick={() => setDragError(null)}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
        
        {isProcessingFile && (
          <div className="file-processing">
            <div className="processing-spinner"></div>
            <div className="processing-text">Processing file...</div>
          </div>
        )}
        
      </div>
      <div className="status" id="inStatus">
        <span className="pill">{inputStatus.lines} lines</span>
        <span className="pill">{inputStatus.chars} chars</span>
        <div className="spacer"></div>
        {errorInfo && 'error' in errorInfo && errorInfo.error && !errorInfo.line && !errorInfo.col && (
          <span className="pill error" title={errorInfo.error}>
            ⚠️ Parse Error
          </span>
        )}
        <span className="pill drag-hint-pill" title="Drag & drop files here">
          <span className="drag-hint-icon-small">📁</span>
          <span className="drag-hint-text-small">Drag files here</span>
        </span>
      </div>
    </section>
  )
}

// Error marker component
interface ErrorMarkerProps {
  line: number
  col: number
  token?: string
  value: string
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  scrollTop: number
}

const ErrorMarker: React.FC<ErrorMarkerProps> = React.memo(({ line, col, token, value, textareaRef, scrollTop }) => {
  // Only show highlights if we have both line and column information
  if (!line || !col) return null
  
  // Get the textarea element to calculate accurate positions
  const textarea = textareaRef.current
  if (!textarea) return null
  
  // Additional safety checks to prevent crashes
  try {
    // Verify the textarea is properly mounted and accessible
    if (!textarea.offsetParent || !textarea.clientWidth || !textarea.clientHeight) {
      return null
    }
  } catch (error) {
    console.warn('ErrorMarker: textarea not ready yet', error)
    return null
  }
  
  // Get actual CSS values that match the textarea
  let computedStyle: CSSStyleDeclaration
  try {
    computedStyle = window.getComputedStyle(textarea)
  } catch (error) {
    console.warn('ErrorMarker: could not get computed style', error)
    return null
  }
  
  // Get more accurate line height by measuring actual text rendering
  let lineHeight = 18 // Default fallback
  try {
    // Try to get the actual line height from computed styles
    const computedLineHeight = computedStyle.lineHeight
    if (computedLineHeight && computedLineHeight !== 'normal') {
      lineHeight = parseInt(computedLineHeight)
    } else {
      // If line-height is 'normal', calculate it based on font size
      // Most browsers use 1.2x font size for 'normal' line height
      const fontSize = parseInt(computedStyle.fontSize) || 13
      lineHeight = Math.round(fontSize * 1.2)
    }
  } catch (error) {
    console.warn('ErrorMarker: could not get line height, using default', error)
  }
  
  const fontSize = parseInt(computedStyle.fontSize) || 13
  const paddingTop = parseInt(computedStyle.paddingTop) || 12
  const paddingLeft = parseInt(computedStyle.paddingLeft) || 8
  
  // Calculate character width more accurately
  // For monospace fonts, we can use a more precise calculation
  // Most monospace fonts have character width that's close to font size, but let's be more precise
  const charWidth = Math.round(fontSize * 0.6) // Most monospace fonts are about 60% of font size
  
  // Get the content up to the error line
  const lines = value.split('\n')
  
  // Calculate top position (accounting for line wrapping and scroll position)
  let top = paddingTop
  
  try {
    // Calculate the actual pixel position by measuring each line's height
    // This accounts for lines that wrap multiple times
    let currentTop = paddingTop
    
    // Iterate through each line up to the error line
    for (let i = 0; i < line - 1; i++) {
      const lineText = lines[i] || ''
      
      // Calculate how many wrapped lines this line creates
      // We need to create a temporary element to measure the actual height
      const tempDiv = document.createElement('div')
      tempDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: ${computedStyle.fontFamily};
        font-size: ${computedStyle.fontSize};
        line-height: ${computedStyle.lineHeight};
        width: ${textarea.clientWidth - paddingLeft - parseInt(computedStyle.paddingRight || '0')}px;
        padding: 0;
        margin: 0;
        border: 0;
      `
      tempDiv.textContent = lineText
      
      // Add to DOM temporarily to measure
      document.body.appendChild(tempDiv)
      const lineHeight = tempDiv.offsetHeight
      document.body.removeChild(tempDiv)
      
      // Add this line's height to our running total
      currentTop += lineHeight
    }
    
    top = currentTop
    
    // Account for scroll position - when scrolling down, the marker should move up
    // This makes the marker stay aligned with the actual text content
    top -= scrollTop
    
    // Apply user's manual adjustment (moved up a couple pixels)
    top -= 2
  } catch (error) {
    console.warn('ErrorMarker: error calculating top position, using fallback', error)
    // Fallback to simple calculation (less accurate but won't crash)
    top = paddingTop + (line - 1) * lineHeight - scrollTop - 2
  }
  
  // Calculate left position based on column (more precise)
  // Need to account for the line numbers column width
  let lineNumbersWidth = 45 // Default fallback
  try {
    const lineNumbersEl = textarea.parentElement?.querySelector('.line-numbers') as HTMLElement
    if (lineNumbersEl && lineNumbersEl.offsetWidth) {
      lineNumbersWidth = lineNumbersEl.offsetWidth
    }
  } catch (error) {
    console.warn('ErrorMarker: could not get line numbers width', error)
  }
  const left = lineNumbersWidth + (col - 1) * charWidth + paddingLeft - 3 // User's manual adjustment
  
  // Position calculated successfully
  

  
  return (
    <>
      {/* Line indicator - red bar on the left */}
      <div 
        className="error-line-indicator"
        style={{
          top: `${top}px`,
          left: '0px',
          width: '3px',
          height: `${lineHeight}px`
        }}
        title={`Error at line ${line}, column ${col}${token ? ` (token: ${token})` : ''}`}
      />
      {/* Character highlight - red box around the problematic character */}
      <div 
        className="error-char-highlight"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width: `${charWidth}px`,
          height: `${lineHeight}px`
        }}
        title={`Error at line ${line}, column ${col}${token ? ` (token: ${token})` : ''}`}
      />
    </>
  )
})

export default InputPane 