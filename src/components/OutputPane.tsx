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

  // Update line numbers - optimized version
  const updateLineNumbers = useCallback(() => {
    const outputEl = outputRef.current
    if (!outputEl) return

    // If minified, always show single line
    if (settings.minify) {
      setLineNumbers([1])
      return
    }

    // Get content text efficiently
    let contentText = ''
    try {
      if (!result) {
        setLineNumbers([1])
        return
      }
      
      if (visualize) {
        const treeEl = outputEl.querySelector('.json-tree')
        contentText = treeEl ? (treeEl as HTMLElement).innerText || treeEl.textContent || '' : ''
      } else {
        const preElement = outputEl.querySelector('pre.pretty')
        contentText = preElement ? (preElement as HTMLElement).innerText || preElement.textContent || '' : ''
      }
      
      if (!contentText) {
        setLineNumbers([1])
        return
      }
    } catch (err) {
      setLineNumbers([1])
      return
    }

    // Calculate visual lines efficiently
    const logicalLines = contentText.split('\n')
    const containerWidth = outputEl.clientWidth - 24
    const charsPerLine = Math.max(Math.floor(containerWidth / 8), 1)
    
    const visualLineNumbers: number[] = []
    
    for (let i = 0; i < logicalLines.length; i++) {
      const lineLength = logicalLines[i].length
      const visualLines = Math.max(Math.ceil(lineLength / charsPerLine), 1)
      visualLineNumbers.push(...Array(visualLines).fill(i + 1))
    }
    
    setLineNumbers(visualLineNumbers)
  }, [result, visualize, settings.minify])

  // Update output status with line count - optimized
  const updateOutputStatus = useCallback(() => {
    if (!result) {
      setOutputStatus({ lines: 1, chars: 0 })
      return
    }

    // Always calculate character count, even for minified content
    let content = ''
    try {
      if (visualize) {
        const treeEl = outputRef.current?.querySelector('.json-tree')
        content = treeEl ? (treeEl as HTMLElement).innerText || treeEl.textContent || '' : ''
      } else {
        const preElement = outputRef.current?.querySelector('pre.pretty')
        content = preElement ? (preElement as HTMLElement).innerText || preElement.textContent || '' : ''
      }
    } catch (err) {
      setOutputStatus({ lines: 1, chars: 0 })
      return
    }

    // For minified content, always show 1 line but keep character count
    if (settings.minify) {
      setOutputStatus({ lines: 1, chars: content.length })
      return
    }

    const lines = content.length > 0 ? content.split('\n').length : 1
    setOutputStatus({ lines, chars: content.length })
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

  // Combined effect for updating line numbers and status
  useEffect(() => {
    if (!outputRef.current) return
    
    // Use requestAnimationFrame for better performance
    const updateUI = () => {
      updateLineNumbers()
      updateOutputStatus()
      attachScrollListener()
    }
    
    // Debounce updates to avoid excessive recalculations
    const timer = setTimeout(updateUI, 16) // ~60fps
    return () => clearTimeout(timer)
  }, [result, visualize, settings.minify, updateLineNumbers, updateOutputStatus, attachScrollListener])

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