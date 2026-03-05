"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { nb } from "date-fns/locale"

interface DatePickerProps {
  date?: Date
  setDate: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ date, setDate, placeholder = "Velg dato", className }: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  // Sync input value when date changes externally
  React.useEffect(() => {
    if (date) {
      setInputValue(format(date, "dd.MM.yyyy"))
    } else {
      setInputValue("")
    }
  }, [date])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Allow clearing
    if (value === "") {
      setDate(undefined)
      return
    }

    // Try to parse dd.MM.yyyy
    const parsedDate = parse(value, "dd.MM.yyyy", new Date())
    if (isValid(parsedDate) && value.length === 10) {
      setDate(parsedDate)
    }
  }

  const handleInputBlur = () => {
    if (date) {
      setInputValue(format(date, "dd.MM.yyyy"))
    } else if (inputValue !== "") {
      // If invalid date was typed, clear it or revert? 
      // Let's clear if invalid to avoid confusion
      const parsedDate = parse(inputValue, "dd.MM.yyyy", new Date())
      if (!isValid(parsedDate)) {
        setInputValue("")
        setDate(undefined)
      }
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("relative flex items-center w-full", className)}>
        <Input 
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="dd.mm.åååå"
            className={cn("pr-10", !date && "text-muted-foreground")}
            onClick={() => setIsOpen(true)}
        />
        <PopoverTrigger asChild>
          <Button
            variant={"ghost"}
            size="icon"
            className={cn(
              "absolute right-0 h-full w-10 text-muted-foreground hover:bg-transparent",
            )}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            setDate(d)
            setIsOpen(false)
          }}
          initialFocus
          locale={nb}
        />
      </PopoverContent>
    </Popover>
  )
}
