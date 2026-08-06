"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // Toast warna sesuai aksi — pastel selaras token desa (Design §1.3).
          "--success-bg": "var(--color-status-normal-bg)",
          "--success-border": "var(--color-status-normal-fg)",
          "--success-text": "var(--color-status-normal-fg)",
          "--error-bg": "var(--color-status-rejected-bg)",
          "--error-border": "var(--color-status-rejected-fg)",
          "--error-text": "var(--color-status-rejected-fg)",
          "--warning-bg": "var(--color-status-revision-bg)",
          "--warning-border": "var(--color-status-revision-fg)",
          "--warning-text": "var(--color-status-revision-fg)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
