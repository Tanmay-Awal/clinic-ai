"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    React.useEffect(() => {
        // Workaround to ensure dark mode is forced on initially if next-themes fails to hydrate quickly
        if (!document.documentElement.classList.contains('dark') && !document.documentElement.classList.contains('light')) {
            document.documentElement.classList.add('dark');
        }
    }, []);

    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
