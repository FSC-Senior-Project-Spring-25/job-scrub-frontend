import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, File, X } from "lucide-react"

interface FileUploadProps {
  onFileChange: (file: File | null) => void
  acceptedFileTypes?: Record<string, string[]>
  maxSize?: number
  label?: string
  description?: string
  className?: string
}

export const FileUpload = ({
  onFileChange,
  acceptedFileTypes = { "application/pdf": [".pdf"] },
  maxSize = 5242880, // 5MB default
  label = "Upload File",
  description = "Drag & drop your file here or click to upload",
  className = "",
}: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptedFileTypes,
    maxSize,
    onDrop: (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0])
        onFileChange(acceptedFiles[0])
        setError(null)
      }
    },
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0]
      if (rejection.errors[0].code === "file-too-large") {
        setError(`File is too large. Max size is ${maxSize / 1024 / 1024}MB.`)
      } else if (rejection.errors[0].code === "file-invalid-type") {
        setError("Invalid file type. Please upload a PDF.")
      } else {
        setError("Error uploading file. Please try again.")
      }
    },
  })

  const removeFile = () => {
    setFile(null)
    onFileChange(null)
    setError(null)
  }

  return (
    <div className={`w-full ${className}`}>
      {!file ? (
        <div
          {...getRootProps()}
          className={`p-6 flex flex-col items-center justify-center border-dashed border-2 
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"} 
            rounded-lg cursor-pointer h-60 bg-white transition-colors duration-200 hover:border-blue-400 hover:bg-blue-50/50`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-12 h-12 text-gray-500 mb-2" />
          <p className="text-lg font-medium text-gray-700">{label}</p>
          <p className="text-sm text-gray-500 text-center mt-1">{description}</p>
          <p className="text-xs text-gray-400 mt-2">
            {Object.entries(acceptedFileTypes).map(([type, extensions]) => extensions.join(", ")).join(" or ")} files only
          </p>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      ) : (
        <div className="p-6 bg-white border border-gray-200 rounded-lg h-60 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-700">Uploaded File</h3>
            <button
              onClick={removeFile}
              className="text-gray-500 hover:text-red-500 transition-colors duration-200"
              aria-label="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex flex-col items-center justify-center flex-grow bg-gray-50 rounded-md p-4">
            <File className="w-12 h-12 text-blue-500 mb-3" />
            <p className="font-medium text-gray-800 break-all text-center">{file.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload