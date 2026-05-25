import React from "react";
import { BackgroundBeamsWithCollision } from "./ui/background-beams-with-collision";
import { cn } from "../lib/utils";

export function AdminPanelBackground({
    className = "",
    showText = true,
    children,
    from = "from-purple-500",
    via = "via-violet-500",
    to = "to-pink-500"
}) {
    return (
        <BackgroundBeamsWithCollision className={className}>
            {showText && (
                <h2 className="text-2xl relative z-20 md:text-4xl lg:text-7xl font-bold text-center text-black dark:text-white font-sans tracking-tight">
                    Panel del{" "}
                    <div className="relative mx-auto inline-block w-max [filter:drop-shadow(0px_1px_3px_rgba(27,_37,_80,_0.14))]">
                        <div className={cn(
                            "absolute left-0 top-[1px] bg-clip-text bg-no-repeat text-transparent bg-gradient-to-r py-4 [text-shadow:0_0_rgba(0,0,0,0.1)]",
                            from, via, to
                        )}>
                            <span>Administrador</span>
                        </div>
                        <div className={cn(
                            "relative bg-clip-text text-transparent bg-no-repeat bg-gradient-to-r py-4",
                            from, via, to
                        )}>
                            <span>Administrador</span>
                        </div>
                    </div>
                </h2>
            )}
            {children}
        </BackgroundBeamsWithCollision>
    );
}

export function AdminPanelBackgroundWithSubtitle({
    title = "Panel del",
    highlight = "Administrador",
    subtitle = "Gestiona tu negocio desde un solo lugar"
}) {
    return (
        <BackgroundBeamsWithCollision>
            <div className="text-center">
                <h2 className="text-2xl md:text-4xl lg:text-7xl font-bold text-black dark:text-white">
                    {title}{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500">
                        {highlight}
                    </span>
                </h2>
                <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg">
                    {subtitle}
                </p>
            </div>
        </BackgroundBeamsWithCollision>
    );
}
