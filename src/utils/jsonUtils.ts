export function repairJson(text: string): string {
  if (!text) return ''
  let s = text

  // 1. Strip comments (but not URLs)
  // Block comments: /* ... */
  s = s.replace(/\/\*[\s\S]*?\*\//g, '')
  // Line comments: // ... (but not URLs like http://...)
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1')
  // Hash comments: # ... (Python, Ruby, shell, etc.)
  s = s.replace(/#.*$/gm, '')
  // Semicolon comments: ; ... (INI files, some config formats)
  s = s.replace(/;.*$/gm, '')
  // Remove empty lines that might be left after comment removal
  s = s.replace(/^\s*[\r\n]/gm, '')

  // 2. Quote unquoted keys and values
  // Quote unquoted object keys
  s = s.replace(/([,{]\s*)([A-Za-z_][\w-]*)(\s*:)/g, '$1"$2"$3')
  
  // Quote unquoted string values (after colons, before commas/braces)
  s = s.replace(/(:\s*)([A-Za-z_][\w-]*)(\s*[,}])/g, '$1"$2"$3')
  
    // Handle unquoted values at the end of objects/arrays
  s = s.replace(/(:\s*)([A-Za-z_][\w-]*)(\s*$)/gm, '$1"$2"')
  
  // Additional comprehensive unquoted string detection
  // Handle unquoted strings in arrays: [item1, item2, item3]
  s = s.replace(/([\[,]\s*)([A-Za-z_][\w-]*)(\s*[,}\]])/g, '$1"$2"$3')
  
  // Handle unquoted strings at array ends: [item1, item2]
  s = s.replace(/([\[,]\s*)([A-Za-z_][\w-]*)(\s*$)/gm, '$1"$2"')
  
  // 3. Convert single → double quotes
  s = s.replace(/'([^'\\]|\\.)*'/g, (m) => {
    const inner = m.slice(1, -1)
    const escaped = inner
      .replace(/\\/g, '\\\\')
      .replace(/\\"/g, '"')
      .replace(/"/g, '\\"')
    return '"' + escaped + '"'
  })

  // 4. Replace True/False/None → true/false/null
  s = s
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')

  // 5. Fix numeric forms
  // \b0(\d+) → $1 (remove leading zero from non-decimal numbers)
  s = s.replace(/\b0(\d+)/g, '$1')
  
  // (?<![\d])\.(\d+) → 0.$1 (add leading zero to decimal numbers)
  s = s.replace(/(?<!\d)\.(\d+)/g, '0.$1')
  
  // (\d+)\.(?=[^\d]) → $1.0 (add trailing zero to decimal numbers)
  s = s.replace(/(\d+)\.(?=[^\d])/g, '$1.0')

  // 6. Replace NaN|Infinity|-Infinity with null
  s = s
    .replace(/\bNaN\b/g, 'null')
    .replace(/\bInfinity\b/g, 'null')
    .replace(/\b-Infinity\b/g, 'null')
    .replace(/\bundefined\b/g, 'null')

  // 7. Remove trailing commas and clean up invalid patterns
  // Remove trailing commas in objects/arrays
  s = s.replace(/,\s*([}\]])/g, '$1')
  // Remove trailing commas followed by invalid characters
  s = s.replace(/,\s*[=;]/g, '')
  // Trim dangling commas at end of input
  s = s.replace(/,\s*$/, '')
  
  // 8. Fix missing commas between objects/properties
  // Add missing comma after closing bracket followed by property: "] property:"
  s = s.replace(/(\s*)\]\s*(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:)/g, '$1],$2')
  // Add missing comma after closing brace followed by property: "} property:"
  s = s.replace(/(\s*)\}\s*(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:)/g, '$1},$2')
  // Add missing comma after closing bracket followed by opening brace: "] {"
  s = s.replace(/(\s*)\]\s*(\s*\{)/g, '$1],$2')
  // Add missing comma after closing brace followed by opening bracket: "} ["
  s = s.replace(/(\s*)\}\s*(\s*\[)/g, '$1},$2')

  // Normalize Unicode quotes → straight quotes
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')

  // Remove BOM
  s = s.replace(/^\uFEFF/, '')

  return s.trim()
}

/**
 * Detect JSON errors in the original text before any repairs
 * This provides more accurate error positioning
 */
export function detectOriginalJsonErrors(text: string): {
  pos: number | null
  line: number | null
  col: number | null
  token: string | null
  error: string | null
} | null {
  if (!text) return null
  
  console.log('🔍 detectOriginalJsonErrors: scanning original text for structural errors')
  
  // First, try to parse the original text to see what error we get
  try {
    JSON.parse(text)
    return null // No errors found
  } catch (e: any) {
    const errorMsg = e.message || 'Unknown error'
    console.log('🔍 Original text parse error:', errorMsg)
    
    // Look for structural patterns that commonly cause JSON errors
    const lines = text.split('\n')
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum]
      const trimmed = line.trim()
      
      // Skip empty lines and comment lines
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue
      
      // Check for double commas (like "value,,") - this is a structural issue
      const doubleCommaMatch = line.match(/([^,]),,/)
      if (doubleCommaMatch) {
        const pos = lines.slice(0, lineNum).join('\n').length + line.indexOf(',,') + 1
        console.log('🔍 Found double comma at:', { line: lineNum + 1, col: line.indexOf(',,') + 2, pos })
        return {
          pos,
          line: lineNum + 1,
          col: line.indexOf(',,') + 2,
          token: ',',
          error: 'Unexpected comma - remove duplicate comma'
        }
      }
      
      // Check for trailing commas that can't be auto-fixed
      // Only flag if there's a trailing comma followed by a closing bracket/brace on the same line
      const trailingCommaSameLine = line.match(/,\s*([}\]])/)
      if (trailingCommaSameLine) {
        const pos = lines.slice(0, lineNum).join('\n').length + line.indexOf(',')
        console.log('🔍 Found trailing comma on same line at:', { line: lineNum + 1, col: line.indexOf(',') + 1, pos })
        return {
          pos,
          line: lineNum + 1,
          col: line.indexOf(',') + 1,
          token: ',',
          error: 'Unexpected comma - remove trailing comma'
        }
      }
      
      // Check for missing commas between properties (structural issue)
      // Look for patterns like "} property:" or "] property:" where a comma is missing
      const missingCommaAfterBrace = line.match(/(\s*)\}(\s*)$/)
      if (missingCommaAfterBrace) {
        const nextLine = lines[lineNum + 1]
        if (nextLine && nextLine.trim().match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:/)) {
          const pos = lines.slice(0, lineNum).join('\n').length + line.length
          console.log('🔍 Found missing comma after brace at:', { line: lineNum + 1, col: line.length + 1, pos })
          return {
            pos,
            line: lineNum + 1,
            col: line.length + 1,
            token: ',',
            error: 'Missing comma - add comma after closing brace'
          }
        }
      }
      
      // Check for missing commas after closing brackets
      const missingCommaAfterBracket = line.match(/(\s*)\]\s*$/)
      if (missingCommaAfterBracket) {
        const nextLine = lines[lineNum + 1]
        if (nextLine && nextLine.trim().match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:/)) {
          const pos = lines.slice(0, lineNum).join('\n').length + line.length
          console.log('🔍 Found missing comma after bracket at:', { line: lineNum + 1, col: line.length + 1, pos })
          return {
            pos,
            line: lineNum + 1,
            col: line.length + 1,
            token: ',',
            error: 'Missing comma - add comma after closing bracket'
          }
        }
      }
      
      // Check for missing commas after values followed by properties
      const missingCommaAfterValue = line.match(/(\s*)([a-zA-Z0-9_]+|"[^"]*"|'[^']*'|true|false|null|None|True|False)\s*$/)
      if (missingCommaAfterValue) {
        const nextLine = lines[lineNum + 1]
        if (nextLine && nextLine.trim().match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:/)) {
          const pos = lines.slice(0, lineNum).join('\n').length + line.length
          console.log('🔍 Found missing comma after value at:', { line: lineNum + 1, col: line.length + 1, pos })
          return {
            pos,
            line: lineNum + 1,
            col: line.length + 1,
            token: ',',
            error: 'Missing comma - add comma after value'
          }
        }
      }
      
      // Check for structural bracket/brace mismatches
      // Look for lines that end with an opening bracket/brace but don't have a corresponding closing one
      const openingBracket = line.match(/(\s*)\{\s*$/)
      if (openingBracket) {
        // Count opening vs closing braces from this line forward
        let braceCount = 1
        for (let i = lineNum + 1; i < lines.length; i++) {
          const futureLine = lines[i]
          braceCount += (futureLine.match(/\{/g) || []).length
          braceCount -= (futureLine.match(/\}/g) || []).length
          if (braceCount === 0) break
        }
        if (braceCount > 0) {
          const pos = lines.slice(0, lineNum).join('\n').length + line.length
          console.log('🔍 Found unclosed brace at:', { line: lineNum + 1, col: line.length, pos })
          return {
            pos,
            line: lineNum + 1,
            col: line.length,
            token: '{',
            error: 'Missing closing brace - check bracket balance'
          }
        }
      }
      
      const openingSquareBracket = line.match(/(\s*)\[\s*$/)
      if (openingSquareBracket) {
        // Count opening vs closing brackets from this line forward
        let bracketCount = 1
        for (let i = lineNum + 1; i < lines.length; i++) {
          const futureLine = lines[i]
          bracketCount += (futureLine.match(/\[/g) || []).length
          bracketCount -= (futureLine.match(/\]/g) || []).length
          if (bracketCount === 0) break
        }
        if (bracketCount > 0) {
          const pos = lines.slice(0, lineNum).join('\n').length + line.length
          console.log('🔍 Found unclosed bracket at:', { line: lineNum + 1, col: line.length, pos })
          return {
            pos,
            line: lineNum + 1,
            col: line.length,
            token: '[',
            error: 'Missing closing bracket - check bracket balance'
          }
        }
      }
    }
    
    // If no specific structural pattern found, try to locate the error using the original error message
    // but only if it's a structural error (not a syntax error that can be auto-fixed)
    if (errorMsg.includes('Unexpected token') || errorMsg.includes('Unexpected end') || 
        errorMsg.includes('Unexpected number') || errorMsg.includes('Unexpected string')) {
      const fallbackResult = locateJsonError(errorMsg, text)
      return {
        pos: fallbackResult.pos,
        line: fallbackResult.line,
        col: fallbackResult.col,
        token: fallbackResult.token,
        error: errorMsg
      }
    }
    
    // For other types of errors, let the repair function handle them
    return null
  }
}

export function locateJsonError(msg: string, text: string): {
  pos: number | null
  line: number | null
  col: number | null
  token: string | null
} {
  console.log('🔍 locateJsonError called with:', { msg: msg.substring(0, 100), textLength: text.length })
  // Try multiple regex patterns to find error position
  const patterns = [
    /at position (\d+)/,
    /position (\d+)/,
    /Unexpected token '([^']+)' at position (\d+)/,
    /Unexpected end of JSON input at position (\d+)/,
    /Unexpected number at position (\d+)/,
    /Unexpected string at position (\d+)/,
    /Unexpected token ([^ ]+) at position (\d+)/,
    /Unexpected token '([^']+)' at position (\d+)/,
    /Unexpected token ([^ ]+) at position (\d+)/
  ]
  
  let pos = null
  let token = null
  
  for (const pattern of patterns) {
    const match = pattern.exec(msg || '')
    if (match) {
      if (match[2]) {
        // Pattern with token and position
        token = match[1]
        pos = parseInt(match[2], 10)
      } else if (match[1]) {
        // Pattern with just position
        pos = parseInt(match[1], 10)
      }
      break
    }
  }
  
  if (pos == null || isNaN(pos)) {
    console.log('🔍 No position found, using fallback scanning')
    // Fallback: try to find the first problematic character
    return findFirstProblematicChar(text)
  }
  
  pos = Math.max(0, Math.min(text.length - 1, pos))
  
  console.log('🔍 Parsed position:', { pos, charAtPos: text.charAt(pos) })
  console.log('🔍 Text around position:', text.substring(Math.max(0, pos - 10), pos + 10))
  
  // Debug: let's see what's at position 890 specifically
  if (pos === 890) {
    console.log('🔍 DEBUG: Position 890 analysis:')
    console.log('🔍 Character at 890:', text.charAt(890))
    console.log('🔍 Character at 889:', text.charAt(889))
    console.log('🔍 Character at 891:', text.charAt(891))
    console.log('🔍 Context around 890:', text.substring(885, 895))
  }
  
  // Use a simple, reliable line/column calculation
  const lines = text.split('\n')
  let currentPos = 0
  
  console.log('🔍 Line calculation debug:')
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length
    const lineEndPos = currentPos + lineLength
    console.log(`🔍 Line ${i + 1}: length=${lineLength}, currentPos=${currentPos}, lineEndPos=${lineEndPos}, pos=${pos}`)
    
    if (currentPos + lineLength >= pos) {
      const line = i + 1
      const col = pos - currentPos + 1
      console.log('🔍 Final calculation:', { pos, line, col, charAtPos: text.charAt(pos) })
      return { pos, line, col, token }
    }
    currentPos += lineLength + 1 // +1 for newline
  }
  
  // Fallback if we somehow didn't find the line
  console.log('🔍 Fallback calculation failed, using original')
  return { pos, line: 1, col: 1, token }
}

function findFirstProblematicChar(text: string): {
  pos: number | null
  line: number | null
  col: number | null
  token: string | null
} {
  if (!text) return { pos: null, line: null, col: null, token: null }
  
  console.log('🔍 Scanning for problematic characters in text...')
  
  // First, check for missing commas (higher priority as they're more common)
  const missingComma = findMissingCommas(text)
  if (missingComma) {
    console.log('🔍 Found missing comma:', missingComma)
    return missingComma
  }
  
  console.log('🔍 No missing commas found, checking for invalid characters...')
  
  // Look for common JSON syntax issues
  const lines = text.split('\n')
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]
    const trimmed = line.trim()
    
    // Skip empty lines and comment lines
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue
    
    // Look for invalid characters that cause JSON parse errors
    for (let col = 0; col < line.length; col++) {
      const char = line[col]
      
      // Check for invalid JSON characters
      if (/[=;]/.test(char)) {
        // Calculate the actual position in the text
        let pos = 0
        for (let i = 0; i < lineNum; i++) {
          pos += lines[i].length + 1 // +1 for newline
        }
        pos += col
        console.log('🔍 Found invalid character:', { char, line: lineNum + 1, col: col + 1, pos })
        return { pos, line: lineNum + 1, col: col + 1, token: char }
      }
      
      // Check for other invalid characters that commonly cause issues
      if (/[<>|&%$@!]/.test(char)) {
        // Calculate the actual position in the text
        let pos = 0
        for (let i = 0; i < lineNum; i++) {
          pos += lines[i].length + 1 // +1 for newline
        }
        pos += col
        return { pos, line: lineNum + 1, col: col + 1, token: char }
      }
      
        // Check for unquoted keys
  if (char === ':' && col > 0) {
    let keyStart = col - 1
    while (keyStart >= 0 && /\s/.test(line[keyStart])) keyStart--
    if (keyStart >= 0 && /[a-zA-Z0-9_]*/.test(line.substring(keyStart, col).trim())) {
      // Calculate the actual position in the text
      let pos = 0
      for (let i = 0; i < lineNum; i++) {
        pos += lines[i].length + 1 // +1 for newline
      }
      pos += col
      return { pos, line: lineNum + 1, col: col + 1, token: null }
    }
  }
    }
  }
  
  return { pos: null, line: null, col: null, token: null }
}

/**
 * Detect missing commas between objects and properties
 * @param text The full text content
 * @returns Information about missing commas if found
 */
function findMissingCommas(text: string): {
  pos: number | null
  line: number | null
  col: number | null
  token: string | null
} | null {
  console.log('🔍 findMissingCommas: scanning', text.split('\n').length, 'lines')
  const lines = text.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1]
    
    if (!line || !nextLine) continue
    
    console.log(`🔍 Checking line ${i + 1}: "${line.trim()}" -> "${nextLine.trim()}"`)
    
    // Look for patterns like "} property:" (missing comma after closing brace)
    const missingCommaAfterBrace = line.match(/(\s*)\}(\s*)$/)
    if (missingCommaAfterBrace && nextLine.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:/)) {
      // Found a closing brace followed by a property name - missing comma
      const pos = lines.slice(0, i).join('\n').length + line.length
      console.log('🔍 Found missing comma after brace:', { line: i + 1, nextLine: i + 2, pos })
      return {
        pos,
        line: i + 1,
        col: line.length + 1,
        token: ','
      }
    }
    
    // Look for patterns like "] property:" (missing comma after closing bracket)
    const missingCommaAfterBracket = line.match(/(\s*)\]\s*$/)
    if (missingCommaAfterBracket && nextLine.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:/)) {
      // Found a closing bracket followed by a property name - missing comma
      const pos = lines.slice(0, i).join('\n').length + line.length
      console.log('🔍 Found missing comma after bracket:', { line: i + 1, nextLine: i + 2, pos, lineContent: line.trim(), nextLineContent: nextLine.trim() })
      return {
        pos,
        line: i + 1,
        col: line.length + 1,
        token: ','
      }
    }
    
    // Look for patterns like "value, property:" (missing comma after value)
    const missingCommaAfterValue = line.match(/(\s*)([a-zA-Z0-9_]+|"[^"]*"|'[^']*'|true|false|null|None|True|False)\s*$/)
    if (missingCommaAfterValue && nextLine.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:/)) {
      // Found a value followed by a property name - missing comma
      const pos = lines.slice(0, i).join('\n').length + line.length
      return {
        pos,
        line: i + 1,
        col: line.length + 1,
        token: ','
      }
    }
  }
  
  return null
}

/**
 * Calculate the visual line number that accounts for line wrapping
 * @param text The full text content
 * @param logicalLine The logical line number (1-based)
 * @param containerWidth The width of the container in pixels
 * @param charWidth Approximate width of a character in pixels
 * @returns The visual line number (1-based) that accounts for wrapping
 */
export function getVisualLineNumber(text: string, logicalLine: number, containerWidth: number = 800, charWidth: number = 8): number {
  if (logicalLine <= 0) return 1
  
  const lines = text.split('\n')
  if (logicalLine > lines.length) return logicalLine
  
  let visualLine = 1
  
  // Count visual lines for all lines up to the target logical line
  for (let i = 0; i < logicalLine; i++) {
    const line = lines[i]
    if (line) {
      // Calculate how many visual lines this logical line takes
      const lineWidth = line.length * charWidth
      const visualLinesForThisLine = Math.ceil(lineWidth / containerWidth)
      visualLine += visualLinesForThisLine - 1 // -1 because we already counted this line
    }
  }
  
  return visualLine
}

export function getErrorSuggestion(error: string, _line?: number, _col?: number): string {
  if (!error) return ''
  
  const errorLower = error.toLowerCase()
  
  // Check for structural error patterns first
  if (errorLower.includes('duplicate comma') || errorLower.includes('unexpected comma')) {
    return 'Remove the duplicate or trailing comma'
  }
  
  if (errorLower.includes('missing comma')) {
    if (errorLower.includes('after closing brace')) {
      return 'Add a comma after the closing brace } before the next property'
    }
    if (errorLower.includes('after closing bracket')) {
      return 'Add a comma after the closing bracket ] before the next property'
    }
    if (errorLower.includes('after value')) {
      return 'Add a comma after the value before the next property'
    }
    return 'Add a comma to separate properties or array items'
  }
  
  if (errorLower.includes('missing closing brace')) {
    return 'Check that all opening braces { have matching closing braces }'
  }
  
  if (errorLower.includes('missing closing bracket')) {
    return 'Check that all opening brackets [ have matching closing brackets ]'
  }
  
  if (errorLower.includes('bracket balance')) {
    return 'Check that opening and closing brackets/braces are properly balanced'
  }
  
  // Fallback to general structural suggestions
  if (errorLower.includes('unexpected token')) {
    if (errorLower.includes("'")) {
      return 'Check for missing quotes around strings or keys'
    }
    return 'Check for missing commas, brackets, or quotes'
  }
  
  if (errorLower.includes('unexpected end')) {
    return 'Check for missing closing brackets, braces, or quotes'
  }
  
  if (errorLower.includes('unexpected number')) {
    return 'Check for invalid number format or missing quotes'
  }
  
  if (errorLower.includes('unexpected string')) {
    return 'Check for missing quotes or invalid string format'
  }
  
  if (errorLower.includes('duplicate key')) {
    return 'Remove duplicate object keys'
  }
  
  // Check for specific invalid characters
  if (errorLower.includes('=')) {
    return 'Remove the "=" character - it\'s not valid in JSON'
  }
  
  if (errorLower.includes(';')) {
    return 'Remove the ";" character - it\'s not valid in JSON'
  }
  
  if (errorLower.includes('<') || errorLower.includes('>')) {
    return 'Remove the "<" or ">" characters - they\'re not valid in JSON'
  }
  
  return 'Check the syntax around the highlighted position'
} 