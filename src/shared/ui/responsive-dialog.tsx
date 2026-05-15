import * as React from "react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer"
import { useMediaQuery } from "@/shared/utils/use-media-query"
import { cn } from "@/shared/utils/utils"

/**
 * ResponsiveDialog
 *
 * A drop-in replacement for shadcn's Dialog primitive that:
 *   - Renders a centered Dialog on screens >= 640px
 *   - Renders a bottom-sheet Drawer (Vaul) on screens < 640px
 *
 * The exported sub-components mirror Dialog's API so existing modals can be
 * migrated by changing the import path and component names only.
 */

const DESKTOP_MEDIA_QUERY = "(min-width: 640px)"

type Mode = "dialog" | "drawer"

const ResponsiveContext = React.createContext<{ mode: Mode }>({
  mode: "dialog",
})

function useResponsiveMode(): Mode {
  return React.useContext(ResponsiveContext).mode
}

/* -------------------------------------------------------------------------- */
/* Root                                                                        */
/* -------------------------------------------------------------------------- */

type RootProps = React.ComponentProps<typeof Dialog> & {
  /** Force a specific mode regardless of viewport (mostly for testing). */
  mode?: Mode
}

function ResponsiveDialog({ mode: forcedMode, children, ...props }: RootProps) {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY)
  const mode: Mode = forcedMode ?? (isDesktop ? "dialog" : "drawer")
  const Root = mode === "dialog" ? Dialog : Drawer

  return (
    <ResponsiveContext.Provider value={{ mode }}>
      {/* Both roots accept open/onOpenChange/etc. */}
      <Root {...props}>{children}</Root>
    </ResponsiveContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/* Trigger                                                                     */
/* -------------------------------------------------------------------------- */

function ResponsiveDialogTrigger(
  props: React.ComponentProps<typeof DialogTrigger>
) {
  const mode = useResponsiveMode()
  const Comp = mode === "dialog" ? DialogTrigger : DrawerTrigger
  // Both triggers share the asChild/onClick shape.
  return <Comp {...props} />
}

/* -------------------------------------------------------------------------- */
/* Close                                                                       */
/* -------------------------------------------------------------------------- */

function ResponsiveDialogClose(
  props: React.ComponentProps<typeof DialogClose>
) {
  const mode = useResponsiveMode()
  const Comp = mode === "dialog" ? DialogClose : DrawerClose
  // Both closes share the asChild/onClick shape.
  return <Comp {...props} />
}

/* -------------------------------------------------------------------------- */
/* Content                                                                     */
/* -------------------------------------------------------------------------- */

type ContentProps = React.ComponentProps<typeof DialogContent> & {
  /** Class applied only when rendered as a Drawer (mobile). */
  drawerClassName?: string
}

function ResponsiveDialogContent({
  className,
  drawerClassName,
  children,
  ...props
}: ContentProps) {
  const mode = useResponsiveMode()

  if (mode === "dialog") {
    return (
      <DialogContent className={className} {...props}>
        {children}
      </DialogContent>
    )
  }

  return (
    <DrawerContent className={cn(drawerClassName)}>
      <DrawerBody className="flex flex-col gap-4 py-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
        {children}
      </DrawerBody>
    </DrawerContent>
  )
}

/* -------------------------------------------------------------------------- */
/* Header / Footer                                                             */
/* -------------------------------------------------------------------------- */

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const mode = useResponsiveMode()
  if (mode === "dialog") {
    return <DialogHeader className={className} {...props} />
  }
  // Drawer body already provides horizontal padding, so DrawerHeader's px-6
  // would double-pad. Use a lightweight div instead.
  return (
    <div
      data-slot="responsive-dialog-header"
      className={cn("flex flex-col gap-1 text-left", className)}
      {...props}
    />
  )
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const mode = useResponsiveMode()
  if (mode === "dialog") {
    return <DialogFooter className={className} {...props} />
  }
  // Mobile: full-width buttons stacked, primary on top.
  return (
    <div
      data-slot="responsive-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 [&_button]:w-full sm:flex-row sm:justify-end sm:[&_button]:w-auto",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Title / Description                                                         */
/* -------------------------------------------------------------------------- */

function ResponsiveDialogTitle(
  props: React.ComponentProps<typeof DialogTitle>
) {
  const mode = useResponsiveMode()
  const Comp = mode === "dialog" ? DialogTitle : DrawerTitle
  // Both titles share the children/className shape.
  return <Comp {...props} />
}

function ResponsiveDialogDescription(
  props: React.ComponentProps<typeof DialogDescription>
) {
  const mode = useResponsiveMode()
  const Comp = mode === "dialog" ? DialogDescription : DrawerDescription
  // Both descriptions share the children/className shape.
  return <Comp {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  useResponsiveMode,
}
