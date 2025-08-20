import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface NativeSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  placeholder?: string
  className?: string
}

interface NativeSelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const NativeSelect = React.forwardRef<HTMLDivElement, NativeSelectProps>(
  ({ value, onValueChange, children, placeholder, className }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [selectedValue, setSelectedValue] = React.useState(value || "")
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const contentRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value)
      }
    }, [value])

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          triggerRef.current &&
          contentRef.current &&
          !triggerRef.current.contains(event.target as Node) &&
          !contentRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false)
        }
      }

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
      }
    }, [isOpen])

    const handleSelect = (newValue: string) => {
      setSelectedValue(newValue)
      onValueChange?.(newValue)
      setIsOpen(false)
    }

    // Extract options from children
    const options = React.Children.toArray(children).filter(
      (child): child is React.ReactElement<NativeSelectItemProps> =>
        React.isValidElement(child) && child.type === NativeSelectItem
    )

    const selectedOption = options.find(option => option.props.value === selectedValue)

    return (
      <div ref={ref} className={cn("relative", className)}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={cn("block truncate", !selectedValue && "text-gray-500")}>
            {selectedOption ? selectedOption.props.children : placeholder}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>

        {isOpen && (
          <div
            ref={contentRef}
            className="absolute z-[9999] mt-1 w-full min-w-[6rem] max-w-[12rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-950 shadow-lg"
            style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              right: '0'
            }}
          >
            <div className="p-1 max-h-[150px] overflow-auto">
              {options.map((option) => (
                <button
                  key={option.props.value}
                  type="button"
                  onClick={() => handleSelect(option.props.value)}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1 pl-6 pr-2 text-xs outline-none hover:bg-gray-100 focus:bg-gray-100",
                    selectedValue === option.props.value && "bg-gray-100",
                    option.props.className
                  )}
                >
                  {selectedValue === option.props.value && (
                    <span className="absolute left-1 flex h-3 w-3 items-center justify-center">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <span className="block truncate">{option.props.children}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
)

NativeSelect.displayName = "NativeSelect"

const NativeSelectItem = React.forwardRef<
  HTMLDivElement,
  NativeSelectItemProps
>(({ value, children, className }, ref) => {
  // This component is just used for type checking and children extraction
  // The actual rendering is handled in NativeSelect
  return null
})

NativeSelectItem.displayName = "NativeSelectItem"

export { NativeSelect, NativeSelectItem }