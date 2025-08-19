import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const GridSelect = SelectPrimitive.Root

const GridSelectGroup = SelectPrimitive.Group

const GridSelectValue = SelectPrimitive.Value

const GridSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-3 w-3 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
GridSelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const GridSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "item-aligned", ...props }, ref) => (
  <SelectPrimitive.Content
    ref={ref}
    className={cn(
      "relative z-50 min-w-[6rem] max-w-[12rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-950 shadow-lg",
      // Minimize animations to reduce shaking
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    position={position}
    side="bottom"
    align="start"
    sideOffset={2}
    collisionPadding={{ top: 10, right: 10, bottom: 10, left: 10 }}
    avoidCollisions={true}
    {...props}
  >
    <SelectPrimitive.Viewport
      className={cn(
        "p-1 max-h-[150px] overflow-auto",
        "w-full min-w-[var(--radix-select-trigger-width)]"
      )}
    >
      {children}
    </SelectPrimitive.Viewport>
  </SelectPrimitive.Content>
))
GridSelectContent.displayName = SelectPrimitive.Content.displayName

const GridSelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1 pl-6 pr-2 text-xs font-semibold", className)}
    {...props}
  />
))
GridSelectLabel.displayName = SelectPrimitive.Label.displayName

const GridSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1 pl-6 pr-2 text-xs outline-none focus:bg-gray-100 focus:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-1 flex h-3 w-3 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3 w-3" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
GridSelectItem.displayName = SelectPrimitive.Item.displayName

const GridSelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-gray-100", className)}
    {...props}
  />
))
GridSelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  GridSelect,
  GridSelectGroup,
  GridSelectValue,
  GridSelectTrigger,
  GridSelectContent,
  GridSelectLabel,
  GridSelectItem,
  GridSelectSeparator,
}