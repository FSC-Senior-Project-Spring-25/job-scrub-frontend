import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, File, X } from "lucide-react"
import { Button } from "@/components/ui/button"

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
          className={`border-2 border-dashed rounded-lg h-60 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50 ${
            isDragActive ? "border-primary bg-primary/10" : "border-border"
          }`}
        >
          <div className="flex h-full flex-col items-center justify-center p-6">
            <input {...getInputProps()} />
            <UploadCloud className="mb-2 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">{label}</p>
            <p className="mt-1 text-center text-sm text-muted-foreground">{description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {Object.entries(acceptedFileTypes)
                .map(([type, extensions]) => extensions.join(", "))
                .join(" or ")}{" "}
              files only
            </p>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="h-60 border border-border rounded-lg bg-background">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile()
                }}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove file"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center flex-grow rounded-md bg-muted p-4">
              <File className="mb-3 h-12 w-12 text-primary" />
              <p className="break-all text-center font-medium text-foreground">{file.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload

