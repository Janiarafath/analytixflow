"use client"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, Download, LinkIcon, Loader2, Plus, Trash2, Calculator, Wand2, Lock } from "lucide-react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { toast } from "react-hot-toast"
import _ from "lodash"
import { useAuth } from "../contexts/AuthContext"
import { canUserUpload, incrementUploadCount, getUserUploadCount } from "../lib/firebase"

interface TransformationRule {
  column: string
  operation: string
  value: string
}

interface ColumnStats {
  column: string
  mean: number
  median: number
  min: number
  max: number
  count: number
  nullCount: number
}

export const ETLProcessor: React.FC = () => {
  const { user } = useAuth()
  const [data, setData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [transformations, setTransformations] = useState<TransformationRule[]>([])
  const [apiUrl, setApiUrl] = useState("")
  const [outputFormat, setOutputFormat] = useState("csv")
  const [loading, setLoading] = useState(false)
  const [columnStats, setColumnStats] = useState<ColumnStats[]>([])
  const [newColumnName, setNewColumnName] = useState("")
  const [newColumnFormula, setNewColumnFormula] = useState("")
  const [newColumnData, setNewColumnData] = useState("")
  const [uploadCount, setUploadCount] = useState(0)
  const [isAICleaning, setIsAICleaning] = useState(false)

  useEffect(() => {
    const fetchUploadCount = async () => {
      if (user) {
        const count = await getUserUploadCount(user.uid)
        setUploadCount(count)
      }
    }
    fetchUploadCount()
  }, [user])

  const calculateStats = (data: any[]) => {
    const stats = columns.map((column) => {
      const values = data.map((row) => Number.parseFloat(row[column])).filter((val) => !isNaN(val))
      const nullCount = data.filter(
        (row) => row[column] === null || row[column] === undefined || row[column] === "",
      ).length

      return {
        column,
        mean: values.length ? _.mean(values) : 0,
        median: values.length ? _.sortBy(values)[Math.floor(values.length / 2)] : 0,
        min: values.length ? _.min(values) : 0,
        max: values.length ? _.max(values) : 0,
        count: values.length,
        nullCount,
      }
    })
    setColumnStats(stats)
  }

  const handleDataUpload = async (uploadedData: any[]) => {
    if (!user) {
      toast.error("Please sign in to upload files")
      return
    }

    try {
      setData(uploadedData)
      setColumns(Object.keys(uploadedData[0] || {}))
      calculateStats(uploadedData)
      localStorage.setItem("etl_processed_data", JSON.stringify(uploadedData))

      await incrementUploadCount(user.uid)
      const newCount = await getUserUploadCount(user.uid)
      setUploadCount(newCount)

      toast.success("File uploaded and data stored successfully")
    } catch (error) {
      console.error("Error processing upload:", error)
      toast.error("Error processing file")
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      if (!user) {
        toast.error("Please sign in to upload files")
        return
      }

      try {
        setLoading(true)
        if (file.name.endsWith(".csv")) {
          Papa.parse(file, {
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                const cleanData = results.data.filter((row: any) =>
                  Object.values(row).some((value) => value !== null && value !== ""),
                )
                handleDataUpload(cleanData)
              }
            },
            header: true,
            skipEmptyLines: true,
            error: (error) => {
              toast.error("Error parsing CSV: " + error.message)
            },
          })
        } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              const workbook = XLSX.read(e.target?.result, { type: "binary" })
              const sheetName = workbook.SheetNames[0]
              const worksheet = workbook.Sheets[sheetName]
              const json = XLSX.utils.sheet_to_json(worksheet)
              if (json.length > 0) {
                handleDataUpload(json)
              }
            } catch (error) {
              toast.error("Error parsing Excel file")
            }
          }
          reader.onerror = () => {
            toast.error("Error reading file")
          }
          reader.readAsBinaryString(file)
        } else {
          toast.error("Unsupported file format")
        }
      } catch (error) {
        toast.error("Error processing file")
      } finally {
        setLoading(false)
      }
    },
    [user], // Removed handleDataUpload from dependencies
  )

  const fetchFromApi = async () => {
    if (!apiUrl) return

    try {
      setLoading(true)
      const response = await fetch(apiUrl)
      const json = await response.json()
      if (Array.isArray(json)) {
        handleDataUpload(json)
      }
    } catch (error) {
      toast.error("Error fetching data from API")
    } finally {
      setLoading(false)
    }
  }

  const addTransformation = () => {
    setTransformations([...transformations, { column: "", operation: "uppercase", value: "" }])
  }

  const updateTransformation = (index: number, field: keyof TransformationRule, value: string) => {
    const newTransformations = [...transformations]
    newTransformations[index] = { ...newTransformations[index], [field]: value }
    setTransformations(newTransformations)
  }

  const removeTransformation = (index: number) => {
    setTransformations(transformations.filter((_, i) => i !== index))
  }

  const handleTransform = (data: any[], column: string, operation: string, value = "") => {
    return data.map((row) => {
      const newRow = { ...row }
      if (column in newRow) {
        switch (operation) {
          case "uppercase":
            newRow[column] = String(newRow[column]).toUpperCase()
            break
          case "lowercase":
            newRow[column] = String(newRow[column]).toLowerCase()
            break
          case "replace":
            newRow[column] = String(newRow[column]).replace(new RegExp(value, "g"), "")
            break
          case "fillNull":
            newRow[column] = newRow[column] || value
            break
          case "trim":
            newRow[column] = String(newRow[column]).trim()
            break
          case "removeSpecialChars":
            newRow[column] = String(newRow[column]).replace(/[^a-zA-Z0-9\s]/g, "")
            break
          case "extractNumbers":
            newRow[column] = String(newRow[column]).replace(/[^0-9.]/g, "")
            break
          case "extractEmails":
            const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g
            const matches = String(newRow[column]).match(emailRegex)
            newRow[column] = matches ? matches.join(", ") : ""
            break
          case "formatDate":
            try {
              const date = new Date(newRow[column])
              newRow[column] = date.toISOString().split("T")[0]
            } catch (error) {
              // Keep original value if date parsing fails
            }
            break
          case "formatPhoneNumber":
            const numbers = String(newRow[column]).replace(/\D/g, "")
            if (numbers.length === 10) {
              newRow[column] = numbers.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
            }
            break
          case "roundNumber":
            const num = Number.parseFloat(newRow[column])
            if (!isNaN(num)) {
              newRow[column] =
                Math.round(num * Math.pow(10, Number.parseInt(value))) / Math.pow(10, Number.parseInt(value))
            }
            break
          case "truncateText":
            newRow[column] =
              String(newRow[column]).length > Number.parseInt(value)
                ? String(newRow[column]).substring(0, Number.parseInt(value)) + "..."
                : String(newRow[column])
            break
          case "removeEmptySpaces":
            newRow[column] = String(newRow[column]).replace(/\s+/g, " ")
            break
          case "titleCase":
            newRow[column] = String(newRow[column])
              .toLowerCase()
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")
            break
        }
      }
      return newRow
    })
  }

  const applyTransformations = () => {
    let transformedData = [...data]
    transformations.forEach(({ column, operation, value }) => {
      transformedData = handleTransform(transformedData, column, operation, value)
    })
    setData(transformedData)
    calculateStats(transformedData)
    localStorage.setItem("etl_processed_data", JSON.stringify(transformedData))
    toast.success("Transformations applied and data stored successfully")
  }

  // Enhanced Groq AI data cleaning function - specifically for 0 values
  const cleanZeroValuesWithAI = async () => {
    if (!data.length) {
      toast.error("Please upload data first")
      return
    }

    setIsAICleaning(true)
    try {
      const cleanedData = [...data]
      let totalReplaced = 0

      // Analyze each column for 0 values specifically
      for (const column of columns) {
        const columnData = data.map(row => row[column])
        const zeroValueIndices = columnData
          .map((value, index) => ({ value, index }))
          .filter(item => {
            const val = item.value
            return val === 0 || val === "0" || val === 0.0 || val === "0.0" || 
                   (typeof val === 'string' && val.trim() === "0") ||
                   (typeof val === 'string' && val.trim() === "0.0")
          })

        if (zeroValueIndices.length > 0) {
          // Get non-zero values for pattern analysis
          const nonZeroValues = columnData.filter(v => {
            const val = v
            return v !== null && v !== undefined && v !== "" && 
                   val !== 0 && val !== "0" && val !== 0.0 && val !== "0.0" &&
                   !(typeof val === 'string' && val.trim() === "0") &&
                   !(typeof val === 'string' && val.trim() === "0.0")
          })
          const numericNonZeroValues = nonZeroValues.map(v => parseFloat(v)).filter(v => !isNaN(v))
          
          // Get sample data rows for context
          const sampleRows = data.slice(0, 10).map(row => ({ ...row }))
          
          try {
            // Use Groq AI to analyze patterns and suggest intelligent replacements
            const response = await fetch('/api/ai/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question: `I need to replace ${zeroValueIndices.length} zero values in column "${column}" with intelligent alternatives.
                
                Dataset context (first 10 rows):
                ${JSON.stringify(sampleRows)}
                
                Non-zero values in this column: ${JSON.stringify(numericNonZeroValues.slice(0, 15))}
                
                Please analyze the data patterns and suggest ${zeroValueIndices.length} replacement values for the zeros. Consider:
                1. Seasonal/trend patterns in the data
                2. Average values from similar time periods
                3. Logical relationships with other columns
                4. Business context (if sales data, consider typical sales patterns)
                5. Statistical patterns (mean, median, mode of non-zero values)
                
                For each zero, suggest a realistic value that fits the data pattern.
                Return only the replacement values separated by commas, in order.`,
                dataSample: sampleRows,
                columns: columns,
                dataProfile: []
              }),
            })

            const json = await response.json()
            if (!response.ok) {
              throw new Error(json?.message || 'Failed to get AI suggestions')
            }

            // Parse and validate AI suggestions
            const aiSuggestions = json.answer
              .split(',')
              .map((val: string) => val.trim())
              .filter((val: string) => val !== "")
              .slice(0, zeroValueIndices.length)

            // Apply AI suggestions with validation
            zeroValueIndices.forEach((item, index) => {
              if (aiSuggestions[index]) {
                const suggestion = aiSuggestions[index]
                const numValue = parseFloat(suggestion)
                
                // Validate the suggestion makes sense
                if (!isNaN(numValue) && numValue > 0) {
                  cleanedData[item.index][column] = numValue
                  totalReplaced++
                } else if (numericNonZeroValues.length > 0) {
                  // Fallback to median if AI suggestion is invalid
                  const median = numericNonZeroValues.sort((a, b) => a - b)[Math.floor(numericNonZeroValues.length / 2)]
                  cleanedData[item.index][column] = median
                  totalReplaced++
                }
              } else if (numericNonZeroValues.length > 0) {
                // Fallback to statistical value if no AI suggestion
                const mean = numericNonZeroValues.reduce((a, b) => a + b, 0) / numericNonZeroValues.length
                cleanedData[item.index][column] = mean
                totalReplaced++
              }
            })

            console.log(`Replaced ${zeroValueIndices.length} zeros in column "${column}" with AI-suggested values`)

          } catch (error) {
            console.error(`AI cleaning failed for column ${column}:`, error)
            // Enhanced fallback: use weighted average based on neighboring values
            zeroValueIndices.forEach(item => {
              const neighbors = []
              
              // Get values from adjacent rows
              if (item.index > 0) neighbors.push(parseFloat(columnData[item.index - 1]))
              if (item.index < columnData.length - 1) neighbors.push(parseFloat(columnData[item.index + 1]))
              
              const validNeighbors = neighbors.filter(v => !isNaN(v) && v > 0)
              
              if (validNeighbors.length > 0) {
                // Use average of neighboring non-zero values
                cleanedData[item.index][column] = validNeighbors.reduce((a, b) => a + b, 0) / validNeighbors.length
                totalReplaced++
              } else if (numericNonZeroValues.length > 0) {
                // Use median of all non-zero values
                const median = numericNonZeroValues.sort((a, b) => a - b)[Math.floor(numericNonZeroValues.length / 2)]
                cleanedData[item.index][column] = median
                totalReplaced++
              }
            })
          }
        }
      }

      setData(cleanedData)
      calculateStats(cleanedData)
      localStorage.setItem("etl_processed_data", JSON.stringify(cleanedData))
      toast.success(`AI replaced ${totalReplaced} zero values with intelligent alternatives`)
    } catch (error) {
      console.error("AI cleaning error:", error)
      toast.error("Failed to clean zero values with AI")
    } finally {
      setIsAICleaning(false)
    }
  }

  // Smart data cleaning function for categorical and numerical data
  const smartCleanData = async () => {
    if (!data.length) {
      toast.error("Please upload data first")
      return
    }

    setIsAICleaning(true)
    try {
      const cleanedData = [...data]
      let categoricalReplaced = 0
      let numericalReplaced = 0

      // Analyze each column
      for (const column of columns) {
        const columnData = data.map(row => row[column])
        
        // Determine if column is numerical or categorical
        const numericValues = columnData.map(v => parseFloat(v)).filter(v => !isNaN(v))
        const isNumerical = numericValues.length > columnData.length * 0.5 // More than 50% numeric
        
        if (isNumerical) {
          // Handle numerical data: replace blanks/nulls with 0
          columnData.forEach((value, index) => {
            if (value === null || value === undefined || value === "" || 
                (typeof value === 'string' && value.trim() === "")) {
              cleanedData[index][column] = 0
              numericalReplaced++
            }
          })
        } else {
          // Handle categorical data: replace blanks/nulls with "Unknown"
          columnData.forEach((value, index) => {
            if (value === null || value === undefined || value === "" || 
                (typeof value === 'string' && value.trim() === "")) {
              cleanedData[index][column] = "Unknown"
              categoricalReplaced++
            }
          })
        }
      }

      setData(cleanedData)
      calculateStats(cleanedData)
      localStorage.setItem("etl_processed_data", JSON.stringify(cleanedData))
      
      toast.success(`Smart cleaning complete: ${numericalReplaced} numerical values → 0, ${categoricalReplaced} categorical values → "Unknown"`)
    } catch (error) {
      console.error("Smart cleaning error:", error)
      toast.error("Failed to clean data")
    } finally {
      setIsAICleaning(false)
    }
  }

  const addColumn = () => {
    if (!newColumnName) {
      toast.error("Please enter a column name")
      return
    }

    try {
      let newData
      if (newColumnFormula) {
        newData = data.map((row) => {
          const newRow = { ...row }
          const formula = newColumnFormula.replace(/\{([^}]+)\}/g, (match, column) => {
            return Number.parseFloat(row[column]) || 0
          })
          newRow[newColumnName] = eval(formula)
          return newRow
        })
      } else if (newColumnData) {
        const values = newColumnData.split("\n")
        newData = data.map((row, index) => ({
          ...row,
          [newColumnName]: values[index] || "",
        }))
      } else {
        toast.error("Please provide either a formula or manual data")
        return
      }

      setData(newData)
      setColumns([...columns, newColumnName])
      setNewColumnName("")
      setNewColumnFormula("")
      setNewColumnData("")
      calculateStats(newData)
      localStorage.setItem("etl_processed_data", JSON.stringify(newData))
      toast.success("New column added and data stored successfully")
    } catch (error) {
      toast.error("Error adding new column")
    }
  }

  const removeColumn = (column: string) => {
    const newData = data.map((row) => {
      const newRow = { ...row }
      delete newRow[column]
      return newRow
    })
    setData(newData)
    setColumns(columns.filter((col) => col !== column))
    calculateStats(newData)
    localStorage.setItem("etl_processed_data", JSON.stringify(newData))
    toast.success("Column removed and data stored successfully")
  }

  const fillNullValues = (column: string, value: string) => {
    const newData = data.map((row) => ({
      ...row,
      [column]: row[column] || value,
    }))
    setData(newData)
    calculateStats(newData)
    localStorage.setItem("etl_processed_data", JSON.stringify(newData))
    toast.success("Null values filled and data stored successfully")
  }

  const removeDuplicates = () => {
    const uniqueData = _.uniqBy(data, (row) => JSON.stringify(row))
    setData(uniqueData)
    calculateStats(uniqueData)
    localStorage.setItem("etl_processed_data", JSON.stringify(uniqueData))
    toast.success(`Removed ${data.length - uniqueData.length} duplicate rows and stored data`)
  }

  const downloadFile = () => {
    if (!data.length) return

    try {
      let content: string | Blob
      let filename: string
      let mimeType: string

      if (outputFormat === "csv") {
        content = Papa.unparse(data)
        filename = "transformed_data.csv"
        mimeType = "text/csv"
      } else if (outputFormat === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
        content = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
        filename = "transformed_data.xlsx"
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      } else {
        content = JSON.stringify(data, null, 2)
        filename = "transformed_data.json"
        mimeType = "application/json"
      }

      const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success("File downloaded successfully")
    } catch (error) {
      toast.error("Error downloading file")
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    disabled: !user,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Your ETL Workspace</h1>
          <p className="mt-2 text-gray-600">
            Upload your data, apply transformations, and export in your preferred format.
          </p>
          {!user && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg flex items-center gap-3">
              <Lock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-yellow-700">Please sign in to upload files.</p>
                <a
                  href="/auth"
                  className="text-yellow-600 hover:text-yellow-800 font-medium inline-flex items-center gap-1 mt-1"
                >
                  Sign in or create an account
                  <LinkIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
          {user && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg flex items-center gap-3">
              <Lock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-green-700">Unlimited uploads are enabled for your account.</p>
              </div>
            </div>
          )}
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-500 hover:bg-gray-50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className={`mx-auto h-12 w-12 ${isDragActive ? "text-indigo-500" : "text-gray-400"}`} />
          <p className={`mt-2 text-lg ${isDragActive ? "text-indigo-600" : "text-gray-600"}`}>
            {isDragActive ? "Drop the file here" : "Drag & drop a file here, or click to select"}
          </p>
          <p className="mt-1 text-sm text-gray-500">Supports CSV and Excel files</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Import from API</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="Enter API URL"
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              disabled={!user}
            />
            <button
              onClick={fetchFromApi}
              disabled={loading || !user}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LinkIcon className="h-5 w-5" />}
              Fetch Data
            </button>
          </div>
        </div>

        {data.length > 0 && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Column Management</h2>

              <div className="mb-6 space-y-4">
                <h3 className="text-md font-medium">Add New Column</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="New Column Name"
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Formula (Optional)</label>
                      <input
                        type="text"
                        value={newColumnFormula}
                        onChange={(e) => setNewColumnFormula(e.target.value)}
                        placeholder="e.g., {column1} + {column2}"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">Use {"{columnName}"} to reference other columns</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Manual Data Input (Optional)
                      </label>
                      <textarea
                        value={newColumnData}
                        onChange={(e) => setNewColumnData(e.target.value)}
                        placeholder="Enter values (one per line)"
                        rows={4}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">Enter one value per line for each row</p>
                    </div>
                  </div>
                  <button
                    onClick={addColumn}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Add Column
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-md font-medium">Manage Columns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {columns.map((column) => (
                    <div key={column} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium">{column}</span>
                      <button
                        onClick={() => removeColumn(column)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Data Cleaning</h2>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={removeDuplicates}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Duplicate Rows
                  </button>
                  
                  <button
                    onClick={cleanZeroValuesWithAI}
                    disabled={isAICleaning || !data.length}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAICleaning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI Replacing Zeros...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Replace 0 Values with AI
                      </>
                    )}
                  </button>

                  <button
                    onClick={smartCleanData}
                    disabled={isAICleaning || !data.length}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAICleaning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Smart Cleaning...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4" />
                        Smart Clean Data
                      </>
                    )}
                  </button>
                </div>

                {columns.map((column) => (
                  <div key={column} className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                    <span className="font-medium">{column}</span>
                    <input
                      type="text"
                      placeholder="Fill null values with..."
                      className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          fillNullValues(column, e.currentTarget.value)
                          e.currentTarget.value = ""
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold">Column Statistics</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Column
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mean
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Median
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Min
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Max
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Null Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {columnStats.map((stat) => (
                      <tr key={stat.column}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.column}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.mean.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.median.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.min.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.max.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.nullCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h2 className="text-lg font-semibold">Smart Data Transformations</h2>
                    <p className="text-sm text-gray-500">
                      Apply intelligent transformations to clean and format your data
                    </p>
                  </div>
                </div>
                <button
                  onClick={addTransformation}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Add Transformation
                </button>
              </div>

              <div className="space-y-4">
                {transformations.map((transform, index) => (
                  <div key={index} className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg">
                    <select
                      value={transform.column}
                      onChange={(e) => updateTransformation(index, "column", e.target.value)}
                      className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select Column</option>
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>

                    <select
                      value={transform.operation}
                      onChange={(e) => updateTransformation(index, "operation", e.target.value)}
                      className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <optgroup label="Basic Transformations">
                        <option value="uppercase">Uppercase</option>
                        <option value="lowercase">Lowercase</option>
                        <option value="titleCase">Title Case</option>
                        <option value="trim">Trim Whitespace</option>
                        <option value="removeEmptySpaces">Remove Extra Spaces</option>
                      </optgroup>
                      <optgroup label="Text Operations">
                        <option value="replace">Replace Text</option>
                        <option value="removeSpecialChars">Remove Special Characters</option>
                        <option value="truncateText">Truncate Text</option>
                      </optgroup>
                      <optgroup label="Data Extraction">
                        <option value="extractNumbers">Extract Numbers</option>
                        <option value="extractEmails">Extract Emails</option>
                      </optgroup>
                      <optgroup label="Data Formatting">
                        <option value="formatDate">Format Date (YYYY-MM-DD)</option>
                        <option value="formatPhoneNumber">Format Phone Number</option>
                        <option value="roundNumber">Round Number</option>
                      </optgroup>
                      <optgroup label="Data Cleaning">
                        <option value="fillNull">Fill Null Values</option>
                      </optgroup>
                    </select>

                    {(transform.operation === "replace" ||
                      transform.operation === "fillNull" ||
                      transform.operation === "roundNumber" ||
                      transform.operation === "truncateText") && (
                      <input
                        type="text"
                        value={transform.value}
                        onChange={(e) => updateTransformation(index, "value", e.target.value)}
                        placeholder={
                          transform.operation === "roundNumber"
                            ? "Decimal places"
                            : transform.operation === "truncateText"
                              ? "Max length"
                              : "Value"
                        }
                        className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    )}

                    <button
                      onClick={() => removeTransformation(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {transformations.length > 0 && (
                  <button
                    onClick={applyTransformations}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Wand2 className="h-5 w-5" />
                    Apply Transformations
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <label className="font-medium">Output Format:</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel</option>
                    <option value="json">JSON</option>
                  </select>
                </div>

                <button
                  onClick={downloadFile}
                  disabled={!data.length}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download Processed Data
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Data Preview</h2>
                <p className="text-sm text-gray-500 mt-1">Showing the first 5 rows of your data</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {columns.map((column) => (
                          <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {String(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-500">Total rows: {data.length}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}