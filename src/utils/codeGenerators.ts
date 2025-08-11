export interface CodeGeneratorOptions {
  indentSize?: number
  useSpaces?: boolean
}

export interface CodeGenerator {
  name: string
  extension: string
  mimeType: string
  generate: (obj: any, options?: CodeGeneratorOptions) => string
}

// Helper function to create indentation
function createIndent(level: number, options: CodeGeneratorOptions = {}): string {
  const { indentSize = 2, useSpaces = true } = options
  const indent = useSpaces ? ' '.repeat(indentSize) : '\t'
  return indent.repeat(level)
}

// Helper function to format object keys based on language conventions
function formatKey(key: string, language: 'python' | 'php' | 'ruby' | 'go' | 'rust' | 'kotlin' | 'swift' | 'scala' | 'dart' | 'csharp' | 'java' | 'typescript' | 'javascript' | 'c' | 'cpp'): string {
  switch (language) {
    case 'python':
    case 'php':
    case 'ruby':
    case 'go':
    case 'rust':
    case 'kotlin':
    case 'swift':
    case 'scala':
    case 'dart':
    case 'csharp':
    case 'java':
      // These languages support unquoted keys for valid identifiers
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        return key
      }
      break
    case 'typescript':
    case 'javascript':
      // JavaScript/TypeScript support unquoted keys for valid identifiers
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
        return key
      }
      break
    case 'c':
    case 'cpp':
      // C/C++ support unquoted keys for valid identifiers
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        return key
      }
      break
  }
  // Fallback to quoted key
  return `"${key}"`
}

// Helper function to format values based on language conventions
function formatValue(value: any, language: string, level: number = 0, options: CodeGeneratorOptions = {}): string {
  const indent = createIndent(level, options)
  
  if (value === null) {
    switch (language) {
      case 'python': return 'None'
      case 'php': return 'null'
      case 'ruby': return 'nil'
      case 'go': return 'nil'
      case 'rust': return 'None'
      case 'kotlin': return 'null'
      case 'swift': return 'nil'
      case 'scala': return 'null'
      case 'dart': return 'null'
      case 'csharp': return 'null'
      case 'java': return 'null'
      case 'typescript': return 'null'
      case 'javascript': return 'null'
      case 'c': return 'NULL'
      case 'cpp': return 'nullptr'
      default: return 'null'
    }
  }
  
  if (typeof value === 'boolean') {
    switch (language) {
      case 'python': return value ? 'True' : 'False'
      case 'php': return value ? 'true' : 'false'
      case 'ruby': return value ? 'true' : 'false'
      case 'go': return value ? 'true' : 'false'
      case 'rust': return value ? 'true' : 'false'
      case 'kotlin': return value ? 'true' : 'false'
      case 'swift': return value ? 'true' : 'false'
      case 'scala': return value ? 'true' : 'false'
      case 'dart': return value ? 'true' : 'false'
      case 'csharp': return value ? 'true' : 'false'
      case 'java': return value ? 'true' : 'false'
      case 'typescript': return value ? 'true' : 'false'
      case 'javascript': return value ? 'true' : 'false'
      case 'c': return value ? '1' : '0'
      case 'cpp': return value ? 'true' : 'false'
      default: return value ? 'true' : 'false'
    }
  }
  
  if (typeof value === 'string') {
    // Handle string escaping based on language
    switch (language) {
      case 'python':
      case 'php':
      case 'ruby':
      case 'go':
      case 'rust':
      case 'kotlin':
      case 'swift':
      case 'scala':
      case 'dart':
      case 'csharp':
      case 'java':
      case 'typescript':
      case 'javascript':
        return `"${value.replace(/"/g, '\\"')}"`
      default:
        return `"${value.replace(/"/g, '\\"')}"`
    }
  }
  
  if (typeof value === 'number') {
    return value.toString()
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) {
      switch (language) {
        case 'python': return '[]'
        case 'php': return '[]'
        case 'ruby': return '[]'
        case 'go': return '[]'
        case 'rust': return 'vec![]'
        case 'kotlin': return 'listOf()'
        case 'swift': return '[]'
        case 'scala': return 'List()'
        case 'dart': return '[]'
        case 'csharp': return 'new List<object>()'
        case 'java': return 'new ArrayList<>()'
        case 'typescript': return '[]'
        case 'javascript': return '[]'
        case 'c': return '{}'
        case 'cpp': return '{}'
        default: return '[]'
      }
    }
    
    const items = value.map(item => formatValue(item, language, level + 1, options))
    const content = items.join(',\n' + createIndent(level + 1, options))
    return `[\n${content}\n${indent}]`
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) {
      switch (language) {
        case 'python': return '{}'
        case 'php': return '[]'
        case 'ruby': return '{}'
        case 'go': return 'map[string]interface{}{}'
        case 'rust': return 'HashMap::new()'
        case 'kotlin': return 'mapOf()'
        case 'swift': return '[:]'
        case 'scala': return 'Map()'
        case 'dart': return '{}'
        case 'csharp': return 'new Dictionary<string, object>()'
        case 'java': return 'new HashMap<>()'
        case 'typescript': return '{}'
        case 'javascript': return '{}'
        case 'c': return '{}'
        case 'cpp': return '{}'
        default: return '{}'
      }
    }
    
    const pairs = keys.map(key => {
      const formattedKey = formatKey(key, language as any)
      const formattedValue = formatValue(value[key], language, level + 1, options)
      return `${createIndent(level + 1, options)}${formattedKey}: ${formattedValue}`
    })
    
    const content = pairs.join(',\n')
    return `{\n${content}\n${indent}}`
  }
  
  return String(value)
}

// Python generator
export const pythonGenerator: CodeGenerator = {
  name: 'Python',
  extension: '.py',
  mimeType: 'text/x-python',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 4 } = options
    const formatted = formatValue(obj, 'python', 0, { indentSize, useSpaces: true })
    return `# Generated Python dictionary\n${formatted}`
  }
}

// PHP generator
export const phpGenerator: CodeGenerator = {
  name: 'PHP',
  extension: '.php',
  mimeType: 'text/x-php',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 4 } = options
    const formatted = formatValue(obj, 'php', 0, { indentSize, useSpaces: true })
    return `<?php\n\n// Generated PHP array\n$data = ${formatted};\n`
  }
}

// Ruby generator
export const rubyGenerator: CodeGenerator = {
  name: 'Ruby',
  extension: '.rb',
  mimeType: 'text/x-ruby',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 2 } = options
    const formatted = formatValue(obj, 'ruby', 0, { indentSize, useSpaces: true })
    return `# Generated Ruby hash\n${formatted}`
  }
}

// Go generator
export const goGenerator: CodeGenerator = {
  name: 'Go',
  extension: '.go',
  mimeType: 'text/x-go',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 4 } = options
    const formatted = formatValue(obj, 'go', 0, { indentSize, useSpaces: true })
    return `package main\n\n// Generated Go map\nvar data = ${formatted}\n`
  }
}

// Rust generator
export const rustGenerator: CodeGenerator = {
  name: 'Rust',
  extension: '.rs',
  mimeType: 'text/x-rust',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 4 } = options
    const formatted = formatValue(obj, 'rust', 0, { indentSize, useSpaces: true })
    return `// Generated Rust HashMap\nlet data: HashMap<&str, Value> = ${formatted};\n`
  }
}

// Kotlin generator
export const kotlinGenerator: CodeGenerator = {
  name: 'Kotlin',
  extension: '.kt',
  mimeType: 'text/x-kotlin',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 4 } = options
    const formatted = formatValue(obj, 'kotlin', 0, { indentSize, useSpaces: true })
    return `// Generated Kotlin map\nval data = ${formatted}\n`
  }
}

// Swift generator
export const swiftGenerator: CodeGenerator = {
  name: 'Swift',
  extension: '.swift',
  mimeType: 'text/x-swift',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 4 } = options
    const formatted = formatValue(obj, 'swift', 0, { indentSize, useSpaces: true })
    return `// Generated Swift dictionary\nlet data: [String: Any] = ${formatted}\n`
  }
}

// Scala generator
export const scalaGenerator: CodeGenerator = {
  name: 'Scala',
  extension: '.scala',
  mimeType: 'text/x-scala',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 2 } = options
    const formatted = formatValue(obj, 'scala', 0, { indentSize, useSpaces: true })
    return `// Generated Scala Map\nval data: Map[String, Any] = ${formatted}\n`
  }
}

// Dart generator
export const dartGenerator: CodeGenerator = {
  name: 'Dart',
  extension: '.dart',
  mimeType: 'text/x-dart',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 2 } = options
    const formatted = formatValue(obj, 'dart', 0, { indentSize, useSpaces: true })
    return `// Generated Dart Map\nMap<String, dynamic> data = ${formatted};\n`
  }
}

// C# generator
export const csharpGenerator: CodeGenerator = {
  name: 'C#',
  extension: '.cs',
  mimeType: 'text/x-csharp',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 4 } = options
    const formatted = formatValue(obj, 'csharp', 0, { indentSize, useSpaces: true })
    return `// Generated C# Dictionary\nvar data = new Dictionary<string, object> ${formatted};\n`
  }
}

// Java generator
export const javaGenerator: CodeGenerator = {
  name: 'Java',
  extension: '.java',
  mimeType: 'text/x-java',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 4 } = options
    const formatted = formatValue(obj, 'java', 0, { indentSize, useSpaces: true })
    return `// Generated Java Map\nMap<String, Object> data = ${formatted};\n`
  }
}

// TypeScript generator
export const typescriptGenerator: CodeGenerator = {
  name: 'TypeScript',
  extension: '.ts',
  mimeType: 'text/x-typescript',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 2 } = options
    const formatted = formatValue(obj, 'typescript', 0, { indentSize, useSpaces: true })
    return `// Generated TypeScript object\nconst data: Record<string, any> = ${formatted};\n`
  }
}

// JavaScript generator
export const javascriptGenerator: CodeGenerator = {
  name: 'JavaScript',
  extension: '.js',
  mimeType: 'text/javascript',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 2 } = options
    const formatted = formatValue(obj, 'javascript', 0, { indentSize, useSpaces: true })
    return `// Generated JavaScript object\nconst data = ${formatted};\n`
  }
}

// C generator
export const cGenerator: CodeGenerator = {
  name: 'C',
  extension: '.c',
  mimeType: 'text/x-c',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 2 } = options
    
    // For C, we'll create a simple struct-based approach
    // Since C doesn't have built-in maps, we'll create a basic structure
    const indent = ' '.repeat(indentSize)
    
    let code = `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n\n`
    
    // Generate struct definitions based on the object structure
    if (typeof obj === 'object' && obj !== null) {
      code += `// Generated C struct definitions\n`
      
      // Create a simple struct for the root object
      const keys = Object.keys(obj)
      if (keys.length > 0) {
        code += `typedef struct {\n`
        keys.forEach(key => {
          const value = obj[key]
          if (typeof value === 'string') {
            code += `${indent}char ${key}[256];\n`
          } else if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              code += `${indent}int ${key};\n`
            } else {
              code += `${indent}double ${key};\n`
            }
          } else if (typeof value === 'boolean') {
            code += `${indent}bool ${key};\n`
          } else if (value === null) {
            code += `${indent}void* ${key};\n`
          } else if (Array.isArray(value)) {
            code += `${indent}int ${key}_size;\n`
            code += `${indent}void* ${key}[100];\n` // Fixed size array
          } else if (typeof value === 'object') {
            code += `${indent}void* ${key};\n` // Pointer to nested struct
          }
        })
        code += `} DataStruct;\n\n`
      }
      
      // Create initialization function
      code += `void init_data(DataStruct* data) {\n`
      code += `${indent}if (data == NULL) return; // Safety check\n\n`
      keys.forEach(key => {
        const value = obj[key]
        if (typeof value === 'string') {
          code += `${indent}strncpy(data->${key}, "${value}", sizeof(data->${key}) - 1);\n`
          code += `${indent}data->${key}[sizeof(data->${key}) - 1] = '\\0'; // Ensure null termination\n`
        } else if (typeof value === 'number') {
          code += `${indent}data->${key} = ${value};\n`
        } else if (typeof value === 'boolean') {
          code += `${indent}data->${key} = ${value ? 'true' : 'false'};\n`
        } else if (value === null) {
          code += `${indent}data->${key} = NULL;\n`
        } else if (Array.isArray(value)) {
          code += `${indent}data->${key}_size = ${value.length};\n`
        }
      })
      code += `}\n\n`
      
      // Add a cleanup function for any dynamic allocations
      code += `void cleanup_data(DataStruct* data) {\n`
      code += `${indent}if (data == NULL) return;\n`
      code += `${indent}// Add cleanup code here if needed for dynamic allocations\n`
      code += `}\n\n`
      
      // Main function
      code += `int main() {\n`
      code += `${indent}DataStruct data = {0}; // Initialize all fields to zero\n`
      code += `${indent}init_data(&data);\n`
      code += `${indent}printf("Data initialized successfully\\n");\n`
      code += `${indent}cleanup_data(&data);\n`
      code += `${indent}return 0;\n`
      code += `}\n`
    } else {
      // Simple value
      code += `int main() {\n`
      code += `${indent}printf("Value: ${formatValue(obj, 'c', 0, { indentSize, useSpaces: true })}");\n`
      code += `${indent}return 0;\n`
      code += `}\n`
    }
    
    return code
  }
}

// C++ generator
export const cppGenerator: CodeGenerator = {
  name: 'C++',
  extension: '.cpp',
  mimeType: 'text/x-c++src',
  generate: (obj: any, options: CodeGeneratorOptions = {}) => {
    const { indentSize = 2 } = options
    
    const indent = ' '.repeat(indentSize)
    
    let code = `#include <iostream>\n#include <map>\n#include <string>\n#include <vector>\n#include <variant>\n#include <any>\n\n`
    
    // Generate proper C++ code
    if (typeof obj === 'object' && obj !== null) {
      code += `// Generated C++ data structure\n`
      code += `using ValueType = std::variant<std::string, int, double, bool, std::nullptr_t, std::vector<ValueType>, std::map<std::string, ValueType>>;\n\n`
      
      // Create the data structure
      code += `int main() {\n`
      code += `${indent}std::map<std::string, ValueType> data = ${formatValue(obj, 'cpp', 0, { indentSize, useSpaces: true })};\n\n`
      
      // Add some basic usage
      code += `${indent}// Example usage:\n`
      code += `${indent}std::cout << "Data structure created successfully!" << std::endl;\n`
      code += `${indent}std::cout << "Number of keys: " << data.size() << std::endl;\n\n`
      
      // Print some values
      const keys = Object.keys(obj)
      if (keys.length > 0) {
        code += `${indent}// Accessing values:\n`
        keys.slice(0, 3).forEach(key => { // Limit to first 3 keys for readability
          const value = obj[key]
          if (typeof value === 'string') {
            code += `${indent}std::cout << "${key}: " << std::get<std::string>(data["${key}"]) << std::endl;\n`
          } else if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              code += `${indent}std::cout << "${key}: " << std::get<int>(data["${key}"]) << std::endl;\n`
            } else {
              code += `${indent}std::cout << "${key}: " << std::get<double>(data["${key}"]) << std::endl;\n`
            }
          } else if (typeof value === 'boolean') {
            code += `${indent}std::cout << "${key}: " << std::get<bool>(data["${key}"]) << std::endl;\n`
          }
        })
      }
      
      code += `${indent}return 0;\n`
      code += `}\n`
    } else {
      // Simple value
      code += `int main() {\n`
      code += `${indent}auto value = ${formatValue(obj, 'cpp', 0, { indentSize, useSpaces: true })};\n`
      code += `${indent}std::cout << "Value: " << value << std::endl;\n`
      code += `${indent}return 0;\n`
      code += `}\n`
    }
    
    return code
  }
}

// Export all generators
export const allGenerators: CodeGenerator[] = [
  pythonGenerator,
  phpGenerator,
  rubyGenerator,
  goGenerator,
  rustGenerator,
  kotlinGenerator,
  swiftGenerator,
  scalaGenerator,
  dartGenerator,
  csharpGenerator,
  javaGenerator,
  typescriptGenerator,
  javascriptGenerator,
  cGenerator,
  cppGenerator
]

// Helper function to get generator by name
export function getGeneratorByName(name: string): CodeGenerator | undefined {
  return allGenerators.find(gen => gen.name === name)
}

// Helper function to get generator by extension
export function getGeneratorByExtension(extension: string): CodeGenerator | undefined {
  return allGenerators.find(gen => gen.extension === extension)
} 