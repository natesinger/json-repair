import React, { useRef, useEffect, useState, useCallback } from 'react'
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
  const [localErrorInfo, setLocalErrorInfo] = useState<{
    line: number
    col: number
    token?: string
  } | null>(null)
  
  // Use prop error info if available and has valid line/col, otherwise use local error info
  // Clear local error info if prop error info is null (JSON is valid)
  const errorInfo = (propErrorInfo && propErrorInfo.line && propErrorInfo.col) ? {
    line: propErrorInfo.line,
    col: propErrorInfo.col,
    token: propErrorInfo.token
  } : (propErrorInfo === null ? null : localErrorInfo)

  // Debug logging to see what's happening with error state
  useEffect(() => {
    console.log('=== Error State Debug ===')
    console.log('propErrorInfo:', propErrorInfo)
    console.log('localErrorInfo:', localErrorInfo)
    console.log('final errorInfo:', errorInfo)
    if (errorInfo) {
      console.log('ErrorMarker will show at:', { line: errorInfo.line, col: errorInfo.col })
    } else {
      console.log('No error marker to show')
    }
    console.log('========================')
  }, [errorInfo, propErrorInfo, localErrorInfo])

  // Clear local error info when prop error info becomes null (JSON is valid)
  useEffect(() => {
    if (propErrorInfo === null) {
      console.log('Prop error info is null, clearing local error info')
      setLocalErrorInfo(null)
    }
  }, [propErrorInfo])

  // Additional error clearing when input value changes and becomes valid
  useEffect(() => {
    if (value.trim()) {
      try {
        JSON.parse(value)
        console.log('Input value changed: JSON is valid, clearing localErrorInfo')
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
  


  // Update line numbers
  const updateLineNumbers = useCallback(() => {
    // Get the actual logical lines (newline-separated)
    const logicalLines = value.split('\n')
    const maxLogicalLines = Math.max(logicalLines.length, 1)
    
    // Calculate how many visual lines each logical line takes up
    let visualLineNumbers: number[] = []
    
    for (let logicalLineNum = 1; logicalLineNum <= maxLogicalLines; logicalLineNum++) {
      const logicalLine = logicalLines[logicalLineNum - 1] || ''
      
      // Calculate how many visual lines this logical line takes up
      if (textareaRef.current) {
        const textarea = textareaRef.current
        
        // Simplified approach - estimate wrapping based on character count and container width
        // This avoids DOM manipulation entirely and prevents crashes
        const estimatedCharsPerLine = Math.floor((textarea.clientWidth - 24) / 8) // Rough estimate: 8px per character
        const estimatedLines = Math.ceil(logicalLine.length / estimatedCharsPerLine) || 1
        
        // Add the line number for each visual line (wrapped lines get the same number)
        for (let visualLine = 1; visualLine <= estimatedLines; visualLine++) {
          visualLineNumbers.push(logicalLineNum)
        }
      } else {
        // Fallback: just show one line number per logical line
        visualLineNumbers.push(logicalLineNum)
      }
    }
    
    // Update React state instead of manipulating DOM directly
    setLineNumbers(visualLineNumbers)
  }, [value])

  // Update input status (line count and character count)
  const updateInputStatus = useCallback(() => {
    const len = value.length
    const logicalLines = Math.max(value.split('\n').length, 1)
    
    // Update React state instead of manipulating DOM directly
    setInputStatus({ lines: logicalLines, chars: len })
  }, [value])

  // Update line numbers and status whenever value changes
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      updateLineNumbers()
      updateInputStatus()
    }, 0)
    return () => clearTimeout(timer)
  }, [value, updateLineNumbers, updateInputStatus])

  // Use MutationObserver to detect when content changes (including paste operations)
  useEffect(() => {
    if (!textareaRef.current) return
    
    const observer = new MutationObserver(() => {
      // When the textarea content changes, update line numbers
      requestAnimationFrame(() => {
        updateLineNumbers()
      })
    })
    
    observer.observe(textareaRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    })
    
    return () => observer.disconnect()
  }, [updateLineNumbers])

  // Initial line numbers and status setup
  useEffect(() => {
    // Ensure line numbers and status are set up when component mounts
    const timer = setTimeout(() => {
      updateLineNumbers()
      updateInputStatus()
    }, 0)
    return () => clearTimeout(timer)
  }, [updateLineNumbers, updateInputStatus])

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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      if (file.type === 'text/plain' || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
        try {
          const text = await file.text()
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
        } catch (error) {
          console.error('Error reading file:', error)
        }
      }
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

      <div className="editor">
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
          placeholder="Paste JSON, Python dict, or messy data here…"
          value={value}
          onChange={handleInput}
          onInput={handleInputChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onPaste={handlePasteEvent}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
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
      </div>
      <div className="status" id="inStatus">
        <span className="pill">{inputStatus.lines} lines</span>
        <span className="pill">{inputStatus.chars} chars</span>
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
  const linesBeforeError = lines.slice(0, line - 1)
  
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
  
  // Debug logging for positioning
  console.log('ErrorMarker positioning:', {
    line,
    col,
    fontSize,
    charWidth,
    lineNumbersWidth,
    paddingTop,
    paddingLeft,
    lineHeight,
    top,
    left
  })
  

  
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