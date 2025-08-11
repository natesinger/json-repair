import React, { useRef, useEffect, useCallback, useState } from 'react'
import { ProcessedResult, Settings } from '../types'
import { getErrorSuggestion, getVisualLineNumber } from '../utils/jsonUtils'
import ConfigurationFooter from './ConfigurationFooter'
import CopyAsCodeDropdown from './CopyAsCodeDropdown'


interface OutputPaneProps {
  result: ProcessedResult | null
  visualize: boolean
  settings: Settings
  onSettingsChange: (newSettings: Partial<Settings>) => void
}

const OutputPane: React.FC<OutputPaneProps> = ({ result, visualize, settings, onSettingsChange }) => {
  const outputRef = useRef<HTMLDivElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [lineNumbers, setLineNumbers] = useState<number[]>([])
  const [outputStatus, setOutputStatus] = useState<{ lines: number; chars: number }>({ lines: 0, chars: 0 })

  // Update line numbers
  const updateLineNumbers = useCallback(() => {
    const outputEl = outputRef.current
    
    if (!outputEl) {
      return
    }

    let contentText = ''

    try {
      if (!result) {
        // No result - show placeholder content
        setLineNumbers([1])
        return
      } else if (visualize) {
        // For tree view, get the actual rendered content
        const treeEl = outputEl.querySelector('.json-tree')
        if (treeEl) {
          // Try innerText first, fallback to textContent
          contentText = (treeEl as HTMLElement).innerText || treeEl.textContent || ''
        } else {
          setLineNumbers([1])
          return
        }
      } else {
        // For JSON string, get the actual content
        const preElement = outputEl.querySelector('pre.pretty')
        if (preElement) {
          // Try innerText first, fallback to textContent
          contentText = (preElement as HTMLElement).innerText || preElement.textContent || ''
        } else {
          setLineNumbers([1])
          return
        }
      }
    } catch (err) {
      // Fallback to safe content
      contentText = ''
      setLineNumbers([1])
      return
    }

    // Get the actual logical lines (newline-separated) - exactly like input pane
    const logicalLines = contentText.split('\n')
    const maxLogicalLines = Math.max(logicalLines.length, 1)

    // Calculate how many visual lines each logical line takes up
    let visualLineNumbers: number[] = []
    
    // If minified, we only have one line regardless of content
    if (settings.minify) {
      visualLineNumbers = [1]
    } else {
      for (let logicalLineNum = 1; logicalLineNum <= maxLogicalLines; logicalLineNum++) {
        const logicalLine = logicalLines[logicalLineNum - 1] || ''
        
        // Calculate how many visual lines this logical line takes up
        if (outputEl) {
          
          // Simplified approach - estimate wrapping based on character count and container width
          // This avoids DOM manipulation entirely and prevents crashes
          const estimatedCharsPerLine = Math.floor((outputEl.clientWidth - 24) / 8) // Rough estimate: 8px per character
          const estimatedLines = Math.ceil(logicalLine.length / estimatedCharsPerLine) || 1
          
          // Calculate how many visual lines this logical line needs - exactly like input pane
          const visualLinesForThisLine = estimatedLines
          
          // Add line numbers for each visual line
          for (let visualLine = 1; visualLine <= visualLinesForThisLine; visualLine++) {
            visualLineNumbers.push(logicalLineNum)
          }
        } else {
          // Fallback: just show one line number per logical line
          visualLineNumbers.push(logicalLineNum)
        }
      }
    }
    
    // Update React state instead of manipulating DOM directly
    setLineNumbers(visualLineNumbers)
  }, [visualize, result, settings.minify])

  // Update output status with line count
  const updateOutputStatus = useCallback(() => {
    const outputEl = outputRef.current
    if (!outputEl) return

    let lineCount = 0
    let charCount = 0

    if (!result) {
      // No result - show placeholder content
      lineCount = 1
      charCount = 0
    } else if (visualize) {
      const treeEl = outputEl.querySelector('.json-tree')
      if (treeEl) {
        const textContent = (treeEl as HTMLElement).innerText || treeEl.textContent || ''
        // Use the same simple logic as input pane - just count newlines
        lineCount = Math.max(textContent.split('\n').length, 1)
        charCount = textContent.length
      }
    } else {
      const preElement = outputEl.querySelector('pre.pretty')
      if (preElement) {
        const content = (preElement as HTMLElement).innerText || preElement.textContent || ''
        // If minified, we always have 1 line
        if (settings.minify) {
          lineCount = 1
        } else {
          // Use the same simple logic as input pane - just count newlines
          lineCount = Math.max(content.split('\n').length, 1)
        }
        charCount = content.length
      }
    }

    // Update React state instead of manipulating DOM directly
    setOutputStatus({ lines: lineCount, chars: charCount })
  }, [result, visualize, settings.minify])

  // Sync scroll between output content and line numbers
  const handleScroll = useCallback(() => {
    if (outputRef.current && lineNumbersRef.current) {
      // Get the scrollable content element
      const scrollableContent = outputRef.current.querySelector('.json-tree, .pretty')
      if (scrollableContent) {
        // Sync line numbers scroll with content scroll (no scroll bar on line numbers)
        lineNumbersRef.current.scrollTop = scrollableContent.scrollTop
      }
    }
  }, [])

  // Function to attach scroll listener
  const attachScrollListener = useCallback(() => {
    const outputEl = outputRef.current
    if (!outputEl) return

    // Remove any existing scroll listeners first
    const existingScrollableContent = outputEl.querySelector('.json-tree, .pretty')
    if (existingScrollableContent) {
      existingScrollableContent.removeEventListener('scroll', handleScroll)
    }

    // Find the scrollable content element and listen for scroll on it
    const scrollableContent = outputEl.querySelector('.json-tree, .pretty')
    if (scrollableContent) {
      scrollableContent.addEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Update line numbers and status when result, visualize, or minify changes
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      updateLineNumbers()
      updateOutputStatus()
      // Re-attach scroll listener after content changes
      attachScrollListener()
    }, 0)
    return () => clearTimeout(timer)
  }, [result, visualize, settings.minify, updateLineNumbers, updateOutputStatus, attachScrollListener])

  // Initial line numbers setup
  useEffect(() => {
    // Ensure line numbers are set up when component mounts
    const timer = setTimeout(() => {
      updateLineNumbers()
      updateOutputStatus()
    }, 0)
    return () => clearTimeout(timer)
  }, [updateLineNumbers, updateOutputStatus])

  // Add scroll event listener to the actual scrollable content
  useEffect(() => {
    // Initial attachment
    attachScrollListener()
    
    // Also try to attach after a delay to catch late-rendered content
    const timer = setTimeout(attachScrollListener, 100)
    
    return () => {
      clearTimeout(timer)
      // Clean up scroll listener
      const outputEl = outputRef.current
      if (outputEl) {
        const scrollableContent = outputEl.querySelector('.json-tree, .pretty')
        if (scrollableContent) {
          scrollableContent.removeEventListener('scroll', handleScroll)
        }
      }
    }
  }, [attachScrollListener, handleScroll])

  // Use MutationObserver to detect when output content changes
  useEffect(() => {
    const outputEl = outputRef.current
    if (!outputEl) return
    
    const observer = new MutationObserver((_mutations) => {
      // When the output content changes, update line numbers and status
      requestAnimationFrame(() => {
        updateLineNumbers()
        updateOutputStatus()
        // Re-attach scroll listener after content changes
        attachScrollListener()
      })
    })
    
    observer.observe(outputEl, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    })
    
    return () => observer.disconnect()
  }, [updateLineNumbers, updateOutputStatus, attachScrollListener])

  // Handle window resize to update line numbers when text wrapping changes
  useEffect(() => {
    const handleResize = () => {
      // Debounce resize events
      clearTimeout((window as any).outputResizeTimer)
      ;(window as any).outputResizeTimer = setTimeout(() => {
        updateLineNumbers()
        updateOutputStatus()
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout((window as any).outputResizeTimer)
    }
  }, [updateLineNumbers, updateOutputStatus])

  const handleCopy = async () => {
    if (result?.result.obj) {
      try {
        // Use minified output if minify is enabled, otherwise use pretty-printed with specified tab size
        const space = settings.minify ? undefined : settings.tabSize
        const jsonString = JSON.stringify(result.result.obj, null, space)
        await navigator.clipboard.writeText(jsonString)
        // You could add a toast notification here
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const handleDownload = () => {
    if (result?.result.obj) {
      // Use minified output if minify is enabled, otherwise use pretty-printed with specified tab size
      const space = settings.minify ? undefined : settings.tabSize
      const jsonString = JSON.stringify(result.result.obj, null, space)
      const blob = new Blob([jsonString], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `json.repair-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleCopyAsCode = async (generator: any) => {
    if (result?.result.obj) {
      try {
        const code = generator.generate(result.result.obj, {
          indentSize: settings.tabSize,
          useSpaces: true
        })
        await navigator.clipboard.writeText(code)
        // You could add a toast notification here
      } catch (err) {
        console.error('Failed to copy code:', err)
      }
    }
  }

  const renderTree = (value: any, key?: string | number) => {
    if (value === null || typeof value !== 'object') {
      return (
        <div key={key}>
          {key !== undefined && (
            <span className="json-key">{JSON.stringify(String(key))}: </span>
          )}
          {renderPrimitive(value)}
        </div>
      )
    }

    return (
      <details key={key} open>
        <summary>
          {key !== undefined && (
            <span className="json-key">{JSON.stringify(String(key))}: </span>
          )}
          {Array.isArray(value) ? `Array[${value.length}]` : 'Object'}
        </summary>
        <div style={{ paddingLeft: `${settings.tabSize * 8}px` }}>
          {Array.isArray(value) 
            ? value.map((v, i) => renderTree(v, i))
            : Object.keys(value).map(k => renderTree(value[k], k))
          }
        </div>
      </details>
    )
  }

  const renderPrimitive = (val: any) => {
    if (typeof val === 'string') {
      return <span className="json-string">"{val}"</span>
    } else if (typeof val === 'number') {
      return <span className="json-number">{val}</span>
    } else if (typeof val === 'boolean') {
      return <span className="json-boolean">{String(val)}</span>
    } else if (val === null) {
      return <span className="json-null">null</span>
    }
    return null
  }

  if (!result) {
    return (
      <section className="pane" id="right">
        <header>
          <div className="toolbar">
            <strong>Output</strong>
            <div className="spacer"></div>
            <button className="btn good" disabled>Copy</button>
            <CopyAsCodeDropdown onCopy={handleCopyAsCode} disabled />
            <button className="btn" disabled>Download .json</button>
          </div>
        </header>
        <div className="output" ref={outputRef}>
          {!visualize && !settings.minify && (
            <div className="line-numbers" ref={lineNumbersRef}>
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
          )}
          <pre className="pretty">Paste some data to get started...</pre>
        </div>
        <ConfigurationFooter
          settings={settings}
          onSettingsChange={onSettingsChange}
        />
        <div className="status">
          <span className="pill">Ready</span>
          {settings.minify && <span className="pill">Minified ✓</span>}
          <span className="pill">{outputStatus.lines} lines</span>
          <span className="pill">{outputStatus.chars} chars</span>
        </div>
      </section>
    )
  }

  const { result: parseResult } = result

  if (parseResult.ok === null) {
    return (
      <section className="pane" id="right">
        <header>
          <div className="toolbar">
            <strong>Output</strong>
            <div className="spacer"></div>
            <button className="btn good" disabled>Copy</button>
            <CopyAsCodeDropdown onCopy={handleCopyAsCode} disabled />
            <button className="btn" disabled>Download .json</button>
          </div>
        </header>
        <div className="output" ref={outputRef}>
          {!visualize && !settings.minify && (
            <div className="line-numbers" ref={lineNumbersRef}>
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
          )}
          <pre className="pretty"></pre>
        </div>
        <ConfigurationFooter
          settings={settings}
          onSettingsChange={onSettingsChange}
        />
        <div className="status">
          <span className="pill">Ready</span>
          {settings.minify && <span className="pill">Minified ✓</span>}
          <span className="pill">{outputStatus.lines} lines</span>
          <span className="pill">{outputStatus.chars} chars</span>
        </div>
      </section>
    )
  }

  if (parseResult.ok === true) {
    let jsonString = ''
    let fileSize = '0.0'
    
    try {
      // Use minified output if minify is enabled, otherwise use pretty-printed with specified tab size
      const space = settings.minify ? undefined : settings.tabSize
      jsonString = JSON.stringify(parseResult.obj, null, space)
      fileSize = (new Blob([jsonString]).size / 1024).toFixed(1)
    } catch (err) {
      jsonString = 'Error: Could not stringify JSON'
      fileSize = '0.0'
    }

    return (
      <section className="pane" id="right">
        <header>
          <div className="toolbar">
            <strong>Output</strong>
            <div className="spacer"></div>
            <button className="btn good" onClick={handleCopy}>Copy</button>
            <CopyAsCodeDropdown onCopy={handleCopyAsCode} />
            <button className="btn" onClick={handleDownload}>Download .json</button>
          </div>
        </header>
        <div className="output" ref={outputRef}>
          {!visualize && !settings.minify && (
            <div className="line-numbers" ref={lineNumbersRef}>
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
          )}
          {visualize ? (
            <div className="json-tree">
              {renderTree(parseResult.obj)}
            </div>
          ) : (
            <pre className="pretty">{jsonString}</pre>
          )}
        </div>
        <ConfigurationFooter
          settings={settings}
          onSettingsChange={onSettingsChange}
        />
        <div className="status">
          <span className="pill">Parsed ✓</span>
          {settings.minify && <span className="pill">Minified ✓</span>}
          <span className="pill">{parseResult.ms} ms</span>
          <span className="pill">{fileSize} KB</span>
          <span className="pill">{outputStatus.lines} lines</span>
          <span className="pill">{outputStatus.chars} chars</span>
        </div>
      </section>
    )
  }

  // Error case - show error message and hint in the output area
  // This should trigger when parseResult.ok is false
  const { error, line, col } = parseResult
  
  // Calculate visual line number that accounts for line wrapping
  let displayLine = line
  let displayCol = col
  
  if (line != null && col != null && result?.input) {
    // Get the container width for accurate wrapping calculation
    const containerWidth = outputRef.current?.clientWidth || 800
    displayLine = getVisualLineNumber(result.input, line, containerWidth)
    
    // Note: Column position might also need adjustment for wrapped lines
    // For now, we'll keep the column as-is since it's more complex to calculate
  }
  
  // Replace the parser's line number with our calculated visual line number
  let displayError = error || ''
  if (displayLine != null && displayCol != null && error) {
    // Replace line numbers in the error message with our calculated ones
    displayError = error.replace(
      /\(line (\d+)(?:, column (\d+))?\)/g, 
      `(line ${displayLine}, column ${displayCol})`
    )
  }
  
  const suggestion = getErrorSuggestion(error || '', line, col)
  
  return (
    <section className="pane" id="right">
      <header>
        <div className="toolbar">
          <strong>Output</strong>
          <div className="spacer"></div>
          <button className="btn good" disabled>Copy</button>
          <CopyAsCodeDropdown onCopy={handleCopyAsCode} disabled />
          <button className="btn" disabled>Download .json</button>
        </div>
      </header>
      <div className="output" ref={outputRef}>
        <div className="error-output">
          <div className="error-message">
            <strong>Parse error:</strong> {displayError}
          </div>
          {suggestion && (
            <div className="error-hint">💡 {suggestion}</div>
          )}
        </div>
      </div>
      <ConfigurationFooter
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
      <div className="status">
        <span className="pill error">✗ Parse Error</span>
      </div>
    </section>
  )
}

export default OutputPane 