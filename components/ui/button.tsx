import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "",
        link: "text-primary underline-offset-4",
        // Google Flights custom variants
        "google-blue": "bg-[#8ab4f8] text-black hover:bg-[#7aa3f0] transition-colors",
        "google-blue-outline": "bg-transparent border border-slate-400 text-[#8ab4f8] hover:bg-[#25272D] transition-colors",
        "google-navbar": "bg-transparent text-[#BDC1C6] hover:bg-[#3E3E41] border-0 rounded-t-md rounded-b-none focus:bg-[#4D5767] active:bg-[#4D5767]",
        "google-filter-toggle": "bg-transparent hover:bg-[#4D4E52] rounded-full p-2 border-0 h-auto w-auto",
        "google-calendar": "bg-[#8AB4F8] text-custom-gray-700 hover:bg-[#8AB4F8]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        // Google Flights custom sizes
        "rounded-full": "px-6 py-2 rounded-full",
        "rounded-full-sm": "px-4 py-1 rounded-full",
        "filter-toggle": "w-5 h-5 p-0",
        "navbar": "w-32 gap-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
