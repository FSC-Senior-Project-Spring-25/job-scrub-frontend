"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2 } from "lucide-react"

interface ListItemProps {
  content: string
  onDelete: () => void
  icon?: React.ReactNode
}

export function ListItem({ content, onDelete, icon }: ListItemProps) {
  return (
    <Card className="bg-gray-50 border border-gray-200">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className="text-green-600">{icon}</div>}
          <span className="text-sm">{content}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </CardContent>
    </Card>
  )
}
