import {createContext, type ReactNode, useContext, useEffect, useState} from 'react';
import {browserStorage} from '../shared/storage';

export type Theme = 'light' | 'dark';

const themeStorageKey = 'justvotes-theme';
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

function storedTheme(): Theme {
    return browserStorage()?.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({children}: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(storedTheme);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        browserStorage()?.setItem(themeStorageKey, theme);
    }, [theme]);

    return (
        <ThemeContext value={{theme, toggleTheme: () => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}}>
            {children}
        </ThemeContext>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used inside ThemeProvider');
    return context;
}
