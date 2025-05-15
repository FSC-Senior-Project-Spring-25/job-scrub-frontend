import React, { useState } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, FileText } from 'lucide-react'

interface FileUploadProps {
  onFileChange: (file: File) => void
  maxSize?: number
  label: string
  description: string
  disabled?: boolean
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileChange, 
  maxSize = 5 * 1024 * 1024,
  label,
  description,
  disabled = false
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const acceptedFileTypes = {
    "application/pdf": [".pdf"],
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptedFileTypes,
    maxSize,
    maxFiles: 1,
    multiple: false,
    disabled,
    onDrop: (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0]
        setFile(selectedFile)
        onFileChange(selectedFile) // This will trigger the upload in the parent component
        setError(null)
      }
    },
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0]
      if (rejection.errors[0].code === "file-too-large") {
        setError(`File is too large. Max size is ${maxSize / 1024 / 1024}MB.`)
      } else if (rejection.errors[0].code === "file-invalid-type") {
        setError("Invalid file type. Please upload a PDF.")
      } else if (rejection.errors[0].code === "too-many-files") {
        setError("Only one file can be uploaded at a time.")
      } else {
        setError("Error uploading file. Please try again.")
      }
    },
  })

  return (
    <div className="w-full">
      {/* Label above the dropzone */}
      <div className="mb-2">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      
      {/* Dropzone */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDragActive ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-green-500">Drop the file here...</p>
        ) : (
          <div className="space-y-2">
            <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
            <p className="text-sm text-gray-500">Drag 'n' drop a PDF file here, or click to select file</p>
            <p className="text-xs text-gray-400">PDF only, max {maxSize / 1024 / 1024}MB</p>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      
      {/* Selected file info */}
      {file && (
        <div className="mt-2 text-sm flex items-center text-gray-700">
          <FileText className="h-4 w-4 mr-1 text-green-500" />
          <span>Selected: {file.name}</span>
        </div>
      )}
    </div>
  )
}

export default FileUpload
