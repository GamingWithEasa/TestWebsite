"use client"

import SudokuGame from "@/components/sudoku-game"
import { useState } from "react"
import { cn } from "@/lib/utils"

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  return (
    <main
      className={cn(
        "min-h-screen p-4 transition-colors duration-300",
        isDarkMode ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-blue-50 to-indigo-100",
      )}
    >
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1
            className={cn(
              "text-4xl font-bold mb-2 transition-colors duration-300",
              isDarkMode ? "text-gray-100" : "text-gray-800",
            )}
          >
            Sudoku
          </h1>
          <p className={cn("transition-colors duration-300", isDarkMode ? "text-gray-300" : "text-gray-600")}>
            Fill the grid so each row, column, and 3×3 box contains digits 1-9
          </p>
        </div>
        <SudokuGame isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      </div>
    </main>
  )
}
