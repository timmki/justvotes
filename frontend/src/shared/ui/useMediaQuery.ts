import {useEffect, useState} from 'react';

export function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(() => readMatches(query));

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const mediaQuery = window.matchMedia(query);
        function update() {
            setMatches(mediaQuery.matches);
        }
        update();
        mediaQuery.addEventListener('change', update);
        return () => mediaQuery.removeEventListener('change', update);
    }, [query]);

    return matches;
}

function readMatches(query: string) {
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
}
