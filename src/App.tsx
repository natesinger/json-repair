import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import InputPane from './components/InputPane'
import OutputPane from './components/OutputPane'
import ErrorBoundary from './components/ErrorBoundary'
import { useSettings } from './hooks/useSettings'
import { useJsonProcessor } from './hooks/useJsonProcessor'
import './App.css'

function App() {
  const { settings, updateSettings } = useSettings()
  const { 
    inputValue, 
    setInputValue, 
    processedResult, 
    processInput, 
    processManual,
    clearInput 
  } = useJsonProcessor(settings.live)

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