"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Moon, Sun } from "lucide-react"

type SudokuGrid = (number | null)[][]
type SudokuCell = {
  value: number | null
  isFixed: boolean
  isValid: boolean
}

type MoveHistory = {
  grid: SudokuCell[][]
  selectedCell: { row: number; col: number } | null
}

const generateRandomSudoku = (): SudokuGrid => {
  // Create empty 9x9 grid
  const grid: SudokuGrid = Array(9)
    .fill(null)
    .map(() => Array(9).fill(null))

  // Fill the grid with a valid complete solution
  fillGrid(grid)

  // Remove numbers to create a puzzle (keeping ~30-35 numbers for medium difficulty)
  const cellsToRemove = 45 + Math.floor(Math.random() * 6) // Remove 45-50 cells
  removeCells(grid, cellsToRemove)

  return grid
}

const fillGrid = (grid: SudokuGrid): boolean => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === null) {
        // Create randomized array of numbers 1-9
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        shuffleArray(numbers)

        for (const num of numbers) {
          if (isValidPlacement(grid, row, col, num)) {
            grid[row][col] = num
            if (fillGrid(grid)) {
              return true
            }
            grid[row][col] = null
          }
        }
        return false
      }
    }
  }
  return true
}

const isValidPlacement = (grid: SudokuGrid, row: number, col: number, num: number): boolean => {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false
    }
  }

  return true
}

const shuffleArray = (array: number[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

const removeCells = (grid: SudokuGrid, count: number) => {
  const cells: Array<[number, number]> = []
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      cells.push([row, col])
    }
  }

  shuffleArray(cells as any)

  for (let i = 0; i < count && i < cells.length; i++) {
    const [row, col] = cells[i]
    grid[row][col] = null
  }
}

export default function SudokuGame({
  isDarkMode,
  setIsDarkMode,
}: {
  isDarkMode: boolean
  setIsDarkMode: (value: boolean) => void
}) {
  const [grid, setGrid] = useState<SudokuCell[][]>([])
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null)
  const [highlightedPosition, setHighlightedPosition] = useState<{ row: number; col: number } | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [moveHistory, setMoveHistory] = useState<MoveHistory[]>([])
  const [lives, setLives] = useState(3)
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [currentPuzzle, setCurrentPuzzle] = useState<SudokuGrid>([])

  const playSound = (frequency: number, duration: number, type: OscillatorType = "sine") => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = type

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    } catch (error) {
      // Silently fail if audio context is not supported
    }
  }

  const playPlaceSound = () => playSound(800, 0.1, "sine")
  const playErrorSound = () => playSound(200, 0.3, "sawtooth")
  const playSuccessSound = () => {
    // Play a success chord
    setTimeout(() => playSound(523, 0.2, "sine"), 0) // C
    setTimeout(() => playSound(659, 0.2, "sine"), 100) // E
    setTimeout(() => playSound(784, 0.2, "sine"), 200) // G
  }
  const playUndoSound = () => playSound(400, 0.15, "triangle")
  const playClickSound = () => playSound(600, 0.05, "sine")

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const num = Number.parseInt(event.key)
      if (num >= 1 && num <= 9) {
        handleNumberInput(num)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [selectedCell, grid])

  useEffect(() => {
    const randomPuzzle = generateRandomSudoku()
    setCurrentPuzzle(randomPuzzle)

    const initialGrid = randomPuzzle.map((row) =>
      row.map((cell) => ({
        value: cell,
        isFixed: cell !== null,
        isValid: true,
      })),
    )
    setGrid(initialGrid)
    setMoveHistory([{ grid: initialGrid, selectedCell: null }])
    setIsTimerRunning(true)
  }, [])

  const saveToHistory = (newGrid: SudokuCell[][], newSelectedCell: { row: number; col: number } | null) => {
    setMoveHistory((prev) => [...prev, { grid: newGrid, selectedCell: newSelectedCell }])
  }

  const handleUndo = () => {
    if (moveHistory.length <= 1) return

    playUndoSound()

    const newHistory = moveHistory.slice(0, -1)
    const previousState = newHistory[newHistory.length - 1]

    setMoveHistory(newHistory)
    setGrid(previousState.grid)
    setSelectedCell(previousState.selectedCell)
    setIsComplete(false)
  }

  const isValidMove = (grid: SudokuCell[][], row: number, col: number, num: number): boolean => {
    for (let c = 0; c < 9; c++) {
      if (c !== col && grid[row][c].value === num) return false
    }

    for (let r = 0; r < 9; r++) {
      if (r !== row && grid[r][col].value === num) return false
    }

    const boxRow = Math.floor(row / 3) * 3
    const boxCol = Math.floor(col / 3) * 3
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if ((r !== row || c !== col) && grid[r][c].value === num) return false
      }
    }

    return true
  }

  const updateValidation = (newGrid: SudokuCell[][]) => {
    const updatedGrid = newGrid.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        ...cell,
        isValid: cell.value === null || isValidMove(newGrid, rowIndex, colIndex, cell.value),
      })),
    )
    return updatedGrid
  }

  const handleNumberInput = (num: number) => {
    if (!selectedCell || grid[selectedCell.row][selectedCell.col].isFixed) return

    const currentValue = grid[selectedCell.row][selectedCell.col].value
    const newValue = currentValue === num ? null : num

    const newGrid = grid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (rowIndex === selectedCell.row && colIndex === selectedCell.col) {
          return { ...cell, value: newValue }
        }
        return cell
      }),
    )

    const validatedGrid = updateValidation(newGrid)

    if (newValue !== null && !validatedGrid[selectedCell.row][selectedCell.col].isValid) {
      playErrorSound()
      setLives((prev) => Math.max(0, prev - 1))
    } else if (newValue !== null) {
      playPlaceSound()
    }

    setGrid(validatedGrid)
    saveToHistory(validatedGrid, selectedCell)

    const isFull = validatedGrid.every((row) => row.every((cell) => cell.value !== null))
    const isValid = validatedGrid.every((row) => row.every((cell) => cell.isValid))
    if (isFull && isValid) {
      playSuccessSound()
      setIsComplete(true)
      setIsTimerRunning(false)
    }
  }

  const handleCellClick = (row: number, col: number) => {
    playClickSound()

    // Clear previous highlighting first
    setHighlightedNumber(null)
    setHighlightedPosition(null)

    const cell = grid[row][col]

    // Set new highlighting
    if (cell.value !== null) {
      setHighlightedNumber(cell.value)
      setHighlightedPosition({ row, col })
    } else {
      // For blank cells, we still set the position but no number to highlight
      setHighlightedPosition({ row, col })
    }

    if (cell.isFixed) return
    setSelectedCell({ row, col })
  }

  const shouldHighlightCell = (rowIndex: number, colIndex: number, cell: SudokuCell) => {
    if (!highlightedPosition) return false

    if (highlightedNumber && cell.value === highlightedNumber) return true

    if (rowIndex === highlightedPosition.row || colIndex === highlightedPosition.col) return true

    const clickedBoxRow = Math.floor(highlightedPosition.row / 3)
    const clickedBoxCol = Math.floor(highlightedPosition.col / 3)
    const currentBoxRow = Math.floor(rowIndex / 3)
    const currentBoxCol = Math.floor(colIndex / 3)

    if (clickedBoxRow === currentBoxRow && clickedBoxCol === currentBoxCol) return true

    return false
  }

  const handleClear = () => {
    if (!selectedCell || grid[selectedCell.row][selectedCell.col].isFixed) return

    playClickSound()

    const newGrid = grid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (rowIndex === selectedCell.row && colIndex === selectedCell.col) {
          return { ...cell, value: null }
        }
        return cell
      }),
    )

    const validatedGrid = updateValidation(newGrid)
    setGrid(validatedGrid)
    saveToHistory(validatedGrid, selectedCell)
    setIsComplete(false)
  }

  const handleReset = () => {
    playClickSound()

    const initialGrid = currentPuzzle.map((row) =>
      row.map((cell) => ({
        value: cell,
        isFixed: cell !== null,
        isValid: true,
      })),
    )
    setGrid(initialGrid)
    setSelectedCell(null)
    setHighlightedNumber(null)
    setHighlightedPosition(null)
    setIsComplete(false)
    setMoveHistory([{ grid: initialGrid, selectedCell: null }])
    setLives(3)
    setTimer(0)
    setIsTimerRunning(true)
  }

  const handleNewPuzzle = () => {
    playClickSound()

    const randomPuzzle = generateRandomSudoku()
    setCurrentPuzzle(randomPuzzle)

    const initialGrid = randomPuzzle.map((row) =>
      row.map((cell) => ({
        value: cell,
        isFixed: cell !== null,
        isValid: true,
      })),
    )
    setGrid(initialGrid)
    setSelectedCell(null)
    setHighlightedNumber(null)
    setHighlightedPosition(null)
    setIsComplete(false)
    setMoveHistory([{ grid: initialGrid, selectedCell: null }])
    setLives(3)
    setTimer(0)
    setIsTimerRunning(true)
  }

  const handlePauseTimer = () => {
    playClickSound()
    setIsTimerRunning(!isTimerRunning)
  }

  const handleResetTimer = () => {
    playClickSound()
    setTimer(0)
    setIsTimerRunning(true)
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  return (
    <Card
      className={cn(
        "p-6 shadow-xl max-w-2xl mx-auto transition-colors duration-300",
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white",
      )}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className={cn("text-lg font-semibold", isDarkMode ? "text-gray-200" : "text-gray-900")}>
            Lives:{" "}
            <span
              className={cn("font-bold transition-colors duration-300", lives <= 1 ? "text-red-400" : "text-green-400")}
            >
              {lives}
            </span>
          </div>
          <div className={cn("text-lg font-semibold", isDarkMode ? "text-gray-200" : "text-gray-900")}>
            Time: <span className="font-mono">{formatTime(timer)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDarkMode}
            className={cn(
              "transition-all duration-200 hover:scale-105",
              isDarkMode ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600" : "bg-transparent",
            )}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePauseTimer}
            className={cn(
              "transition-all duration-200 hover:scale-105",
              isDarkMode ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600" : "bg-transparent",
            )}
          >
            {isTimerRunning ? "Pause" : "Resume"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetTimer}
            className={cn(
              "transition-all duration-200 hover:scale-105",
              isDarkMode ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600" : "bg-transparent",
            )}
          >
            Reset Timer
          </Button>
        </div>
      </div>

      {isComplete && (
        <div
          className={cn(
            "text-center mb-6 p-4 rounded-lg border animate-in slide-in-from-top-4 duration-500 transform hover:scale-105 transition-transform",
            isDarkMode ? "bg-green-900 border-green-700" : "bg-green-100 border-green-300",
          )}
        >
          <h2 className={cn("text-2xl font-bold animate-pulse", isDarkMode ? "text-green-300" : "text-green-800")}>
            Congratulations!
          </h2>
          <p className={cn(isDarkMode ? "text-green-400" : "text-green-700")}>
            You solved the puzzle in {formatTime(timer)}!
          </p>
        </div>
      )}

      {lives === 0 && (
        <div
          className={cn(
            "text-center mb-6 p-4 rounded-lg border animate-in slide-in-from-top-4 duration-500 animate-pulse",
            isDarkMode ? "bg-red-900 border-red-700" : "bg-red-100 border-red-300",
          )}
        >
          <h2 className={cn("text-2xl font-bold", isDarkMode ? "text-red-300" : "text-red-800")}>Game Over!</h2>
          <p className={cn(isDarkMode ? "text-red-400" : "text-red-700")}>
            You ran out of lives. Click Reset to try again.
          </p>
        </div>
      )}

      <div className="w-fit mx-auto mb-6">
        <div
          className={cn("grid grid-cols-9 gap-0 border-2 w-fit", isDarkMode ? "border-gray-400" : "border-gray-800")}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                className={cn(
                  "w-12 h-12 border flex items-center justify-center text-lg font-semibold transition-all duration-200 transform hover:scale-110 active:scale-95",
                  isDarkMode ? "border-gray-600" : "border-gray-300",
                  colIndex % 3 === 2 &&
                    colIndex !== 8 &&
                    (isDarkMode ? "border-r-2 border-r-gray-400" : "border-r-2 border-r-gray-800"),
                  rowIndex % 3 === 2 &&
                    rowIndex !== 8 &&
                    (isDarkMode ? "border-b-2 border-b-gray-400" : "border-b-2 border-b-gray-800"),
                  cell.isFixed &&
                    (isDarkMode
                      ? "bg-gray-700 text-gray-200 cursor-pointer hover:bg-gray-600"
                      : "bg-gray-100 text-gray-800 cursor-pointer hover:bg-gray-200"),
                  !cell.isFixed &&
                    (isDarkMode
                      ? "bg-gray-800 hover:bg-blue-900 cursor-pointer hover:shadow-md text-gray-200"
                      : "bg-white hover:bg-blue-50 cursor-pointer hover:shadow-md"),
                  selectedCell?.row === rowIndex &&
                    selectedCell?.col === colIndex &&
                    !cell.isFixed &&
                    (isDarkMode
                      ? "bg-blue-800 ring-2 ring-blue-500 ring-opacity-50 animate-pulse"
                      : "bg-blue-200 ring-2 ring-blue-400 ring-opacity-50 animate-pulse"),
                  !cell.isValid &&
                    (isDarkMode ? "bg-red-900 text-red-300 animate-bounce" : "bg-red-100 text-red-600 animate-bounce"),
                  shouldHighlightCell(rowIndex, colIndex, cell) &&
                    (isDarkMode
                      ? "bg-blue-800 hover:bg-blue-700 animate-in fade-in duration-300"
                      : "bg-blue-200 hover:bg-blue-300 animate-in fade-in duration-300"),
                  highlightedPosition?.row === rowIndex &&
                    highlightedPosition?.col === colIndex &&
                    (isDarkMode
                      ? "bg-blue-600 hover:bg-blue-500 ring-4 ring-blue-400 ring-opacity-75 animate-pulse"
                      : "bg-blue-400 hover:bg-blue-500 ring-4 ring-blue-300 ring-opacity-75 animate-pulse"),
                )}
              >
                <span
                  className={cn("transition-all duration-300", cell.value && !cell.isFixed && "animate-in zoom-in-50")}
                >
                  {cell.value || ""}
                </span>
              </button>
            )),
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4 max-w-md mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num, index) => (
          <Button
            key={num}
            variant="outline"
            onClick={() => handleNumberInput(num)}
            disabled={!selectedCell || grid[selectedCell.row][selectedCell.col].isFixed || lives === 0}
            className={cn(
              "h-12 text-lg font-semibold transition-all duration-200 transform hover:scale-110 hover:shadow-lg active:scale-95",
              `animate-in slide-in-from-bottom-4 duration-300`,
              isDarkMode ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600" : "",
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {num}
          </Button>
        ))}
      </div>

      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          onClick={handleUndo}
          disabled={moveHistory.length <= 1}
          className={cn(
            "transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 disabled:hover:scale-100",
            isDarkMode ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600" : "bg-transparent",
          )}
        >
          Undo
        </Button>
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={!selectedCell || grid[selectedCell.row][selectedCell.col].isFixed || lives === 0}
          className={cn(
            "transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 disabled:hover:scale-100",
            isDarkMode ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600" : "bg-transparent",
          )}
        >
          Clear
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className={cn(
            "transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95",
            isDarkMode ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600" : "bg-transparent",
          )}
        >
          Reset
        </Button>
        <Button
          variant="outline"
          onClick={handleNewPuzzle}
          className={cn(
            "transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95",
            isDarkMode ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600" : "bg-transparent",
          )}
        >
          New Puzzle
        </Button>
      </div>

      {selectedCell && (
        <p className={cn("text-center text-sm mt-4", isDarkMode ? "text-gray-400" : "text-gray-600")}>
          Selected: Row {selectedCell.row + 1}, Column {selectedCell.col + 1}
          <span className={cn("block text-xs mt-1", isDarkMode ? "text-gray-500" : "text-gray-500")}>
            Press number keys 1-9 to input
          </span>
        </p>
      )}

      {highlightedPosition && (
        <p className={cn("text-center text-sm mt-2", isDarkMode ? "text-blue-400" : "text-blue-700")}>
          {highlightedNumber
            ? `Highlighting number ${highlightedNumber} and its constraints (row, column, and 3×3 box)`
            : "Highlighting constraints for selected cell (row, column, and 3×3 box)"}
        </p>
      )}
    </Card>
  )
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}
