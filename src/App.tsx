import { useState, useEffect } from 'react'
import Header from './components/Header'
import InputPane from './components/InputPane'
import OutputPane from './components/OutputPane'
import ErrorBoundary from './components/ErrorBoundary'
import MobileWarning from './components/MobileWarning'
import { useSettings } from './hooks/useSettings'
import { useJsonProcessor } from './hooks/useJsonProcessor'
import './App.css'

function App() {
  const [isMobile, setIsMobile] = useState(false)
  const { settings, updateSettings } = useSettings()
  const { 
    inputValue, 
    setInputValue, 
    processedResult, 
    processManual,
    clearInput 
  } = useJsonProcessor(settings.live)

  // Check screen size on mount and resize - optimized
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkScreenSize()
    
    // Debounce resize events for better performance
    let resizeTimer: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(checkScreenSize, 100)
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
    }
  }, [])

  // Show mobile warning if screen is too small
  if (isMobile) {
    return <MobileWarning />
  }

  return (
    <div className="app">
      <Header 
        settings={settings}
        onSettingsChange={updateSettings}
      />
      <main className="wrap">
        <ErrorBoundary>
          <InputPane
            value={inputValue}
            onChange={setInputValue}
            onClear={clearInput}
            onManualProcess={processManual}
            errorInfo={processedResult?.result?.ok === false && processedResult.result.error ? {
              error: processedResult.result.error,
              line: processedResult.result.line,
              col: processedResult.result.col,
              token: processedResult.result.token
            } : null}
            tabSize={settings.tabSize}
            onSample={() => {
              const sampleData = `# messy example (Python dict + comments + trailing commas)
{
  user: 'nate',  # inline comment
  id: 12345,
  active: True,
                meta: {
                note: 'He said: \\'hello\\'',
                last_login: None,
              },
  tags: ['a', 'b',],
}
`
              setInputValue(sampleData)
            }}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <OutputPane
            result={processedResult}
            visualize={settings.visualize}
            settings={settings}
            onSettingsChange={updateSettings}
          />
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default App 