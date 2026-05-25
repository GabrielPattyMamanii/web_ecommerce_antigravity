import React from 'react';
import { cn } from '../../lib/utils';

const Toggle = React.forwardRef(({ className, checked, onCheckedChange, labelLeft, labelRight, activeClass = "bg-background", inactiveClass = "bg-background", ...props }, ref) => (
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
                "absolute h-8 w-[calc(50%-4px)] rounded-full shadow-sm transition-all duration-300 ease-in-out",
                checked ? `translate-x-[calc(100%+4px)] ${activeClass}` : `translate-x-0 ${inactiveClass}`
            )}
        />

        {/* Left Label */}
        <div className={cn(
            "z-10 flex-1 text-center text-sm font-medium transition-colors duration-300",
            !checked ? "text-white" : "text-muted-foreground"
        )}>
            {labelLeft}
        </div>

        {/* Right Label */}
        <div className={cn(
            "z-10 flex-1 text-center text-sm font-medium transition-colors duration-300",
            checked ? "text-white" : "text-muted-foreground"
        )}>
            {labelRight}
        </div>
    </div>
));
Toggle.displayName = "Toggle";

export { Toggle };
