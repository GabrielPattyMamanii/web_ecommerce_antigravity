import React from 'react';
import { cn } from '../../lib/utils';

const Toggle = React.forwardRef(({ className, checked, onCheckedChange, labelLeft, labelRight, ...props }, ref) => (
    <div
        className={cn(
            "relative inline-flex h-10 w-64 items-center rounded-full bg-muted p-1 cursor-pointer transition-colors",
            className
        )}
        onClick={() => onCheckedChange(!checked)}
    >
        {/* Sliding Background */}
        <div
            className={cn(
                "absolute h-8 w-[calc(50%-4px)] rounded-full bg-background shadow-sm transition-all duration-300 ease-in-out",
                checked ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
            )}
        />

        {/* Left Label (Minorista) */}
        <div className={cn(
            "z-10 flex-1 text-center text-sm font-medium transition-colors duration-300",
            !checked ? "text-primary" : "text-muted-foreground"
        )}>
            {labelLeft}
        </div>

        {/* Right Label (Mayorista) */}
        <div className={cn(
            "z-10 flex-1 text-center text-sm font-medium transition-colors duration-300",
            checked ? "text-primary" : "text-muted-foreground"
        )}>
            {labelRight}
        </div>
    </div>
));
Toggle.displayName = "Toggle";

export { Toggle };
