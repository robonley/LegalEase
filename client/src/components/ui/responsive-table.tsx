import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table"

interface ResponsiveTableProps {
  children: React.ReactNode
  className?: string
}

interface ResponsiveTableRowProps {
  children: React.ReactNode
  className?: string
  mobileCard?: React.ReactNode
  "data-testid"?: string
}

interface ResponsiveTableHeaderProps {
  children: React.ReactNode
  className?: string
}

interface ResponsiveTableBodyProps {
  children: React.ReactNode
  className?: string
}

const ResponsiveTable = React.forwardRef<HTMLTableElement, ResponsiveTableProps>(
  ({ className, children, ...props }, ref) => {
    const isMobile = useIsMobile()
    
    if (isMobile) {
      return (
        <div className={cn("space-y-3", className)} {...props}>
          {children}
        </div>
      )
    }
    
    return (
      <Table ref={ref} className={className} {...props}>
        {children}
      </Table>
    )
  }
)
ResponsiveTable.displayName = "ResponsiveTable"

const ResponsiveTableHeader = React.forwardRef<HTMLTableSectionElement, ResponsiveTableHeaderProps>(
  ({ className, children, ...props }, ref) => {
    const isMobile = useIsMobile()
    
    if (isMobile) {
      return null // Hide headers on mobile since we use cards
    }
    
    return (
      <TableHeader ref={ref} className={className} {...props}>
        {children}
      </TableHeader>
    )
  }
)
ResponsiveTableHeader.displayName = "ResponsiveTableHeader"

const ResponsiveTableBody = React.forwardRef<HTMLTableSectionElement, ResponsiveTableBodyProps>(
  ({ className, children, ...props }, ref) => {
    const isMobile = useIsMobile()
    
    if (isMobile) {
      return (
        <div className={cn("space-y-3", className)} {...props}>
          {children}
        </div>
      )
    }
    
    return (
      <TableBody ref={ref} className={className} {...props}>
        {children}
      </TableBody>
    )
  }
)
ResponsiveTableBody.displayName = "ResponsiveTableBody"

const ResponsiveTableRow = React.forwardRef<HTMLTableRowElement, ResponsiveTableRowProps>(
  ({ className, children, mobileCard, ...props }, ref) => {
    const isMobile = useIsMobile()
    
    if (isMobile && mobileCard) {
      return (
        <Card className={cn("p-0", className)} {...props}>
          <CardContent className="p-4">
            {mobileCard}
          </CardContent>
        </Card>
      )
    }
    
    if (isMobile) {
      // Fallback: render as card with default layout
      return (
        <Card className={cn("p-0", className)} {...props}>
          <CardContent className="p-4">
            <div className="space-y-2">
              {React.Children.map(children, (child, index) => (
                <div key={index}>
                  {child}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )
    }
    
    return (
      <TableRow ref={ref} className={className} {...props}>
        {children}
      </TableRow>
    )
  }
)
ResponsiveTableRow.displayName = "ResponsiveTableRow"

// Export the standard table components for desktop use
export {
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableRow,
  TableHead,
  TableCell
}