import {createContext, type ReactNode, useContext, useEffect, useLayoutEffect, useState} from 'react';
import {browserStorage} from '../shared/storage';
import type {TranslationKey} from '../shared/i18n/translations';

export type Theme = 'light' | 'dark' | 'claude' | 'openai';
export type ThemeOption = { value: Theme; labelKey: TranslationKey };

export const themeOptions: readonly ThemeOption[] = [
    {value: 'light', labelKey: 'common.lightThemeName'},
    {value: 'dark', labelKey: 'common.darkThemeName'},
    {value: 'claude', labelKey: 'common.claudeThemeName'},
    {value: 'openai', labelKey: 'common.openaiThemeName'},
];

const themeStorageKey = 'justvotes-theme';
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

function themeFromValue(value: string | null): Theme {
    if (value === 'dark' || value === 'claude' || value === 'openai') return value;
    return 'light';
}

function storedTheme(): Theme {
    try {
        return themeFromValue(browserStorage()?.getItem(themeStorageKey) ?? null);
    } catch {
        return 'light';
    }
}

function persistTheme(theme: Theme) {
    try {
        browserStorage()?.setItem(themeStorageKey, theme);
    } catch {
        // Theme changes remain available for the current session when storage is blocked.
    }
}

export function ThemeProvider({children}: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(storedTheme);

    useLayoutEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    useEffect(() => {
        persistTheme(theme);
    }, [theme]);

    useEffect(() => {
        function handleStorage(event: StorageEvent) {
            if (event.key !== themeStorageKey && event.key !== null) return;
            setTheme(themeFromValue(event.key === null ? null : event.newValue));
        }

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    return (
        <ThemeContext value={{theme, setTheme}}>
            {children}
        </ThemeContext>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used inside ThemeProvider');
    return context;
}
