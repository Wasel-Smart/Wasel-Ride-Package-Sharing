/**
 * Optimized Radix UI Imports
 * Tree-shakable imports to reduce bundle size
 */

// Instead of importing entire packages, import specific components
export { Root as AccordionRoot, Item as AccordionItem, Header as AccordionHeader, Trigger as AccordionTrigger, Content as AccordionContent } from '@radix-ui/react-accordion';
export { Root as AlertDialogRoot, Trigger as AlertDialogTrigger, Portal as AlertDialogPortal, Overlay as AlertDialogOverlay, Content as AlertDialogContent, Title as AlertDialogTitle, Description as AlertDialogDescription, Action as AlertDialogAction, Cancel as AlertDialogCancel } from '@radix-ui/react-alert-dialog';
export { Root as AspectRatioRoot } from '@radix-ui/react-aspect-ratio';
export { Root as AvatarRoot, Image as AvatarImage, Fallback as AvatarFallback } from '@radix-ui/react-avatar';
export { Root as CheckboxRoot, Indicator as CheckboxIndicator } from '@radix-ui/react-checkbox';
export { Root as CollapsibleRoot, Trigger as CollapsibleTrigger, Content as CollapsibleContent } from '@radix-ui/react-collapsible';
export { Root as ContextMenuRoot, Trigger as ContextMenuTrigger, Portal as ContextMenuPortal, Content as ContextMenuContent, Item as ContextMenuItem, CheckboxItem as ContextMenuCheckboxItem, RadioItem as ContextMenuRadioItem, Label as ContextMenuLabel, Separator as ContextMenuSeparator, Arrow as ContextMenuArrow } from '@radix-ui/react-context-menu';
export { Root as DialogRoot, Trigger as DialogTrigger, Portal as DialogPortal, Overlay as DialogOverlay, Content as DialogContent, Title as DialogTitle, Description as DialogDescription, Close as DialogClose } from '@radix-ui/react-dialog';
export { Root as DropdownMenuRoot, Trigger as DropdownMenuTrigger, Portal as DropdownMenuPortal, Content as DropdownMenuContent, Item as DropdownMenuItem, CheckboxItem as DropdownMenuCheckboxItem, RadioItem as DropdownMenuRadioItem, Label as DropdownMenuLabel, Separator as DropdownMenuSeparator, Arrow as DropdownMenuArrow } from '@radix-ui/react-dropdown-menu';
export { Root as HoverCardRoot, Trigger as HoverCardTrigger, Portal as HoverCardPortal, Content as HoverCardContent, Arrow as HoverCardArrow } from '@radix-ui/react-hover-card';
export { Root as LabelRoot } from '@radix-ui/react-label';
export { Root as MenubarRoot, Menu as MenubarMenu, Trigger as MenubarTrigger, Portal as MenubarPortal, Content as MenubarContent, Item as MenubarItem, CheckboxItem as MenubarCheckboxItem, RadioItem as MenubarRadioItem, Label as MenubarLabel, Separator as MenubarSeparator, Arrow as MenubarArrow } from '@radix-ui/react-menubar';
export { Root as NavigationMenuRoot, List as NavigationMenuList, Item as NavigationMenuItem, Trigger as NavigationMenuTrigger, Content as NavigationMenuContent, Link as NavigationMenuLink, Indicator as NavigationMenuIndicator, Viewport as NavigationMenuViewport } from '@radix-ui/react-navigation-menu';
export { Root as PopoverRoot, Trigger as PopoverTrigger, Portal as PopoverPortal, Content as PopoverContent, Arrow as PopoverArrow, Close as PopoverClose, Anchor as PopoverAnchor } from '@radix-ui/react-popover';
export { Root as ProgressRoot, Indicator as ProgressIndicator } from '@radix-ui/react-progress';
export { Root as RadioGroupRoot, Item as RadioGroupItem, Indicator as RadioGroupIndicator } from '@radix-ui/react-radio-group';
export { Root as ScrollAreaRoot, Viewport as ScrollAreaViewport, Scrollbar as ScrollAreaScrollbar, Thumb as ScrollAreaThumb, Corner as ScrollAreaCorner } from '@radix-ui/react-scroll-area';
export { Root as SelectRoot, Trigger as SelectTrigger, Portal as SelectPortal, Content as SelectContent, Viewport as SelectViewport, Item as SelectItem, ItemText as SelectItemText, ItemIndicator as SelectItemIndicator, ScrollUpButton as SelectScrollUpButton, ScrollDownButton as SelectScrollDownButton, Group as SelectGroup, Label as SelectLabel, Separator as SelectSeparator, Arrow as SelectArrow, Value as SelectValue, Icon as SelectIcon } from '@radix-ui/react-select';
export { Root as SeparatorRoot } from '@radix-ui/react-separator';
export { Root as SliderRoot, Track as SliderTrack, Range as SliderRange, Thumb as SliderThumb } from '@radix-ui/react-slider';
export { Slot } from '@radix-ui/react-slot';
export { Root as SwitchRoot, Thumb as SwitchThumb } from '@radix-ui/react-switch';
export { Root as TabsRoot, List as TabsList, Trigger as TabsTrigger, Content as TabsContent } from '@radix-ui/react-tabs';
export { Root as ToggleRoot } from '@radix-ui/react-toggle';
export { Root as ToggleGroupRoot, Item as ToggleGroupItem } from '@radix-ui/react-toggle-group';
export { Provider as TooltipProvider, Root as TooltipRoot, Trigger as TooltipTrigger, Portal as TooltipPortal, Content as TooltipContent, Arrow as TooltipArrow } from '@radix-ui/react-tooltip';