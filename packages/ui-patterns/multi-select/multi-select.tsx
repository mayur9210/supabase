'use client'

import React from 'react'
import { ChevronsUpDown, X as RemoveIcon } from 'lucide-react'

import { SIZE_VARIANTS, SIZE_VARIANTS_DEFAULT } from 'ui/src/lib/constants'
import { VariantProps, cva } from 'class-variance-authority'

import { Command as CommandPrimitive } from 'cmdk'
import { cn, Badge, Checkbox_Shadcn_ as Checkbox, Dialog, DialogContent } from 'ui'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from 'ui/src/components/shadcn/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from 'ui/src/components/shadcn/ui/popover'

interface MultiSelectContextProps {
  values: string[]
  onValuesChange: React.Dispatch<React.SetStateAction<string[]>>
  toggleValue: (values: string) => void
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  inputValue: string
  setInputValue: React.Dispatch<React.SetStateAction<string>>
  activeIndex: number
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>
  size: MultiSelectorProps['size']
  disabled?: boolean
}

const MultiSelectContext = React.createContext<MultiSelectContextProps | null>(null)

function useMultiSelect() {
  const context = React.useContext(MultiSelectContext)
  if (!context) {
    throw new Error('useMultiSelect must be used within a MultiSelectProvider')
  }
  return context
}

const MultiSelectorVariants = cva('', {
  variants: {
    size: {
      ...SIZE_VARIANTS,
    },
  },
  defaultVariants: {
    size: SIZE_VARIANTS_DEFAULT,
  },
})

type MultiSelectorMode = 'combobox' | 'inline-combobox'

type MultiSelectorProps = {
  mode?: MultiSelectorMode
  values: string[]
  onValuesChange: React.Dispatch<React.SetStateAction<string[]>>
  loop?: boolean
  disabled?: boolean
  dir?: 'rtl' | 'ltr'
} & React.ComponentPropsWithoutRef<typeof Command> &
  VariantProps<typeof MultiSelectorVariants>

function MultiSelector({
  values = [],
  onValuesChange,
  className,
  loop = false,
  dir,
  size = 'small',
  disabled,
  children,
  ...props
}: MultiSelectorProps) {
  const [open, setOpen] = React.useState<boolean>(false)
  const [inputValue, setInputValue] = React.useState<string>('')
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)

  const toggleValue = React.useCallback(
    (value: string) => {
      onValuesChange((prevValues: string[]) => {
        const isSelected = prevValues.includes(value)
        if (isSelected) {
          return prevValues.filter((currValue) => currValue !== value)
        } else {
          return [...prevValues, value]
        }
      })
    },
    [onValuesChange]
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const moveNext = () => {
        const nextIndex = activeIndex + 1
        setActiveIndex(nextIndex > values.length - 1 ? (loop ? 0 : -1) : nextIndex)
      }

      const movePrev = () => {
        const prevIndex = activeIndex - 1
        setActiveIndex(prevIndex < 0 ? values.length - 1 : prevIndex)
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && values.length > 0) {
        if (inputValue.length === 0) {
          if (activeIndex !== -1 && activeIndex < values.length) {
            onValuesChange(values.filter((item) => item !== values[activeIndex]))
            const newIndex = activeIndex - 1 < 0 ? 0 : activeIndex - 1
            setActiveIndex(newIndex)
          } else {
            onValuesChange(values.filter((item) => item !== values[values.length - 1]))
          }
        }
      } else if (e.key === 'Enter') {
        if (open) {
          inputValue.length !== 0 && setInputValue('')
        } else {
          setOpen(true)
        }
      } else if (e.key === 'Escape') {
        if (activeIndex !== -1) {
          setActiveIndex(-1)
        } else {
          setOpen(false)
        }
      } else if (dir === 'rtl') {
        if (e.key === 'ArrowRight') {
          movePrev()
        } else if (e.key === 'ArrowLeft' && (activeIndex !== -1 || loop)) {
          moveNext()
        }
      } else {
        if (e.key === 'ArrowLeft') {
          movePrev()
        } else if (e.key === 'ArrowRight' && (activeIndex !== -1 || loop)) {
          moveNext()
        }
      }
    },
    [values, inputValue, activeIndex, loop]
  )

  return (
    <MultiSelectContext.Provider
      value={{
        values,
        toggleValue,
        onValuesChange,
        open,
        setOpen,
        inputValue,
        setInputValue,
        activeIndex,
        setActiveIndex,
        size: size || 'small',
        disabled,
      }}
    >
      {/* <Popover open={open} onOpenChange={setOpen} {...props}>
        <Command onKeyDown={handleKeyDown} dir={dir} className="w-auto bg-transparent">
          {children}
        </Command>
      </Popover> */}
      <CommandPrimitive
        onKeyDown={handleKeyDown}
        className={cn('relative overflow-visible bg-transparent flex flex-col', className)}
        dir={dir}
        {...props}
      >
        {children}
      </CommandPrimitive>
    </MultiSelectContext.Provider>
  )
}

const MultiSelectorTrigger = React.forwardRef<
  HTMLButtonElement,
  {
    label?: string
    persistLabel?: boolean
    className?: string
    badgeLimit?: number | 'auto' | 'wrap'
    deletableBadge?: boolean
    showIcon?: boolean
    mode?: MultiSelectorMode
  } & React.ComponentProps<typeof PopoverTrigger>
>(
  (
    {
      label,
      persistLabel = false,
      className,
      deletableBadge = true,
      badgeLimit = 9999,
      showIcon = true,
      mode = 'combobox',
      children,
      ...props
    },
    ref
  ) => {
    const { activeIndex, values, setInputValue, toggleValue, open, setOpen } = useMultiSelect()

    const inputRef = React.useRef<HTMLButtonElement>(null)
    const inlineInputRef = React.useRef<HTMLInputElement>(null)
    const badgesRef = React.useRef<HTMLDivElement>(null)

    const [visibleBadges, setVisibleBadges] = React.useState<string[]>([])
    const [extraBadgesCount, setExtraBadgesCount] = React.useState(0)
    const [isDeleteHovered, setIsDeleteHovered] = React.useState(false)

    const IS_BADGE_LIMIT_AUTO = badgeLimit === 'auto'
    const IS_BADGE_LIMIT_WRAP = badgeLimit === 'wrap'
    const IS_INLINE_MODE = mode === 'inline-combobox'

    const calculateVisibleBadges = React.useCallback(() => {
      if (!inputRef.current || !badgesRef.current) return

      const inputWidth = inputRef.current.offsetWidth
      const badgesContainer = badgesRef.current
      const badges = Array.from(badgesContainer.children) as HTMLElement[]
      let totalWidth = 0
      let visibleCount = 0

      const availableWidth = inputWidth - (showIcon ? 40 : 80)
      for (let i = 0; i < values.length; i++) {
        if (i < badges.length) {
          totalWidth += badges[i].offsetWidth + 8 // 8px for gap
        } else {
          // Estimate width for badges not yet rendered
          totalWidth += 0 // Approximate width of a badge
        }
        if (totalWidth > availableWidth) {
          break
        }
        visibleCount++
      }
      setVisibleBadges(values.slice(0, visibleCount))
      setExtraBadgesCount(Math.max(0, values.length - visibleCount))
    }, [values])

    React.useEffect(() => {
      if (!inputRef.current || !badgesRef.current) return

      if (IS_BADGE_LIMIT_AUTO) {
        calculateVisibleBadges()
        window.addEventListener('resize', calculateVisibleBadges)
      } else if (IS_BADGE_LIMIT_WRAP) {
        setVisibleBadges(values)
        setExtraBadgesCount(0)
      } else {
        setVisibleBadges(values.slice(0, badgeLimit))
        setExtraBadgesCount(Math.max(0, values.length - badgeLimit))
      }

      return () => window.removeEventListener('resize', calculateVisibleBadges)
    }, [values, badgeLimit])

    const badgeClasses = 'rounded shrink-0 px-1.5'

    const handleTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDeleteHovered) {
        event.stopPropagation()
        event.preventDefault()
      }

      if (IS_INLINE_MODE) {
        event.stopPropagation()
        event.preventDefault()
        setOpen(true)

        setTimeout(() => {
          inlineInputRef.current?.focus()
        }, 100)
      }
    }

    return (
      // <PopoverTrigger asChild ref={ref}>
      <button
        ref={inputRef}
        onClick={handleTriggerClick}
        role="combobox"
        className={cn(
          'flex w-full min-w-[200px] min-h-[40px] items-center justify-between rounded-md border',
          'border-alternative bg-foreground/[.026] px-3 py-2 text-sm',
          'ring-offset-background placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'hover:border-primary transition-colors duration-200',
          className
        )}
        {...props}
      >
        <div
          ref={badgesRef}
          className={cn(
            'flex gap-1 -ml-1 overflow-hidden flex-1',
            IS_BADGE_LIMIT_WRAP && 'flex-wrap',
            !IS_BADGE_LIMIT_WRAP &&
              'overflow-x-scroll scrollbar-thin scrollbar-track-transparent transition-colors scrollbar-thumb-muted-foreground dark:scrollbar-thumb-muted scrollbar-thumb-rounded-lg'
          )}
        >
          {visibleBadges.map((value) => (
            <Badge key={value} className={badgeClasses}>
              {value}
              {deletableBadge && (
                <div
                  onMouseEnter={() => setIsDeleteHovered(true)}
                  onMouseLeave={() => setIsDeleteHovered(false)}
                  onClick={() => {
                    toggleValue(value)
                    setIsDeleteHovered(false)
                  }}
                  className="ml-1 text-foreground-lighter hover:text-foreground-light transition-colors pointer-events-auto"
                >
                  <RemoveIcon size={12} />
                </div>
              )}
            </Badge>
          ))}
          {extraBadgesCount > 0 && <Badge className={badgeClasses}>+{extraBadgesCount}</Badge>}
          {!IS_INLINE_MODE && (persistLabel || values.length === 0) && (
            <span className="text-foreground-muted whitespace-nowrap leading-[1.375rem] ml-1">
              {label}
            </span>
          )}
          {IS_INLINE_MODE && (
            <MultiSelectorInput
              ref={inlineInputRef}
              tabIndex={0}
              showSearchIcon={false}
              onValueChange={activeIndex === -1 ? setInputValue : undefined}
              placeholder={label}
              wrapperClassName={cn(
                'px-0 flex-1 border-none truncate',
                IS_BADGE_LIMIT_WRAP && 'min-w-[85px]'
              )}
              className="py-0 px-1 truncate"
            />
          )}
        </div>

        {showIcon && (
          <ChevronsUpDown
            size={16}
            strokeWidth={2}
            className="text-foreground-lighter shrink-0 ml-1.5"
          />
        )}
      </button>
      // </PopoverTrigger>
    )
  }
)

MultiSelectorTrigger.displayName = 'MultiSelectorTrigger'

const MultiSelectorInputVariants = cva('bg-control border', {
  variants: {
    size: {
      ...SIZE_VARIANTS,
    },
  },
  defaultVariants: {
    size: SIZE_VARIANTS_DEFAULT,
  },
})

const MultiSelectorInput = React.forwardRef<
  React.ElementRef<
    typeof CommandInput & {
      showCloseIcon?: boolean
      showSearchIcon?: boolean
      wrapperClassName?: string
    }
  >,
  React.ComponentPropsWithoutRef<typeof CommandInput>
>(({ className, wrapperClassName, showCloseIcon, showSearchIcon, ...props }, ref) => {
  const { setOpen, inputValue, setInputValue, activeIndex, setActiveIndex, size, disabled } =
    useMultiSelect()

  const handleFocus = () => setOpen(true)
  const handleClick = () => setActiveIndex(-1)
  const handleClose = () => setInputValue('')

  return (
    <CommandInput
      {...props}
      ref={ref}
      value={inputValue}
      onValueChange={activeIndex === -1 ? setInputValue : undefined}
      onFocus={handleFocus}
      onClick={handleClick}
      disabled={disabled}
      showCloseIcon={showCloseIcon}
      showSearchIcon={showSearchIcon}
      handleClose={handleClose}
      wrapperClassName={wrapperClassName}
      className={cn(
        MultiSelectorInputVariants({ size }),
        'text-sm bg-transparent h-full flex-grow border-none outline-none placeholder:text-foreground-muted flex-1',
        activeIndex !== -1 && 'caret-transparent',
        className
      )}
    />
  )
})

MultiSelectorInput.displayName = 'MultiSelectorInput'

const MultiSelectorContent = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren<
    {
      className?: string
    } & React.ComponentProps<any>
  >
>(({ children, className, ...props }, ref) => {
  const { open } = useMultiSelect()

  return (
    // <PopoverContent ref={ref} className={cn('w-full p-0', className)} {...props}>
    //   {children}
    // </PopoverContent>
    // <Dialog ref={ref} className={cn('w-full p-0', className)} {...props}>
    //   <DialogContent>{children}</DialogContent>
    // </Dialog>
    <div ref={ref} className={cn('relative', className)} {...props}>
      {open && children}
    </div>
  )
})

MultiSelectorContent.displayName = 'MultiSelectorContent'

const MultiSelectorList = React.forwardRef<
  React.ElementRef<typeof CommandList>,
  React.ComponentPropsWithoutRef<typeof CommandList>
>(({ className, children }, ref) => {
  return (
    <CommandList
      ref={ref}
      className={cn(
        'p-2 flex flex-col gap-2 rounded-md scrollbar-thin scrollbar-track-transparent transition-colors scrollbar-thumb-muted-foreground dark:scrollbar-thumb-muted scrollbar-thumb-rounded-lg w-full',
        'max-h-[300px] overflow-y-auto',
        className
      )}
    >
      {children}
      <CommandEmpty>
        <span className="text-foreground-muted">No results found</span>
      </CommandEmpty>
    </CommandList>
  )
})

MultiSelectorList.displayName = 'MultiSelectorList'

const MultiSelectorItem = React.forwardRef<
  HTMLDivElement,
  { value: string } & React.ComponentPropsWithoutRef<typeof CommandItem>
>(({ className, value, children }, ref) => {
  const id = React.useId()
  const { values: selectedValues, toggleValue, open } = useMultiSelect()
  const isSelected = selectedValues.includes(value)

  return (
    <CommandItem
      ref={ref}
      tabIndex={open ? 0 : -1}
      role="option"
      onSelect={() => toggleValue(value)}
      className={cn(
        'relative',
        'text-foreground-lighter text-left',
        'px-2 py-1.5 rounded',
        'hover:text-foreground hover:!bg-overlay-hover',
        'w-full flex items-center space-x-2',
        'peer-data-[Value=true]:bg-overlay-hover peer-data-[Value=true]:text-strong',
        className
      )}
    >
      <Checkbox
        id={`${id}-checkbox-${value}`}
        checked={isSelected}
        tabIndex={-1}
        className="pointer-events-none"
      />
      <label
        htmlFor={`${id}-checkbox-${value}`}
        className="text-xs flex-grow leading-none pointer-events-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:pointer-events-none peer-disabled:opacity-50"
        tabIndex={-1}
      >
        {children}
      </label>
    </CommandItem>
  )
})

MultiSelectorItem.displayName = 'MultiSelectorItem'

export {
  MultiSelector,
  MultiSelectorContent,
  MultiSelectorInput,
  MultiSelectorItem,
  MultiSelectorList,
  MultiSelectorTrigger,
}
