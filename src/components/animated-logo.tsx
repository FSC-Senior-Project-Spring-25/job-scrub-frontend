"use client"

import { useEffect, useState } from "react"

export default function AnimatedLogo() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
    setProgress((prev) => {
      if (prev >= 100) return 0
      return prev + 2
    })
    }, 20)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center">
      {/* Static Logo */}
      <div className="flex items-center justify-center text-3xl font-bold mb-4">
        <span className="bg-green-700 text-white px-2 py-1 rounded mr-1">Job</span>
        <span className="text-green-700">Scrub</span>
      </div>

      {/* Loading Bar */}
      <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-700 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  )
}

