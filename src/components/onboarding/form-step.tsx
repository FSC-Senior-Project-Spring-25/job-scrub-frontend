import type { ReactNode } from "react"

interface FormStepProps {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  isActive: boolean
}

export function FormStep({ title, description, icon, children, isActive }: FormStepProps) {
  if (!isActive) return null

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-4">
        {icon && <div className="text-green-600">{icon}</div>}
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}
