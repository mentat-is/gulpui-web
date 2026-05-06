let didLoadThemes = false;

declare const require: {
    context: (path: string, deep?: boolean, filter?: RegExp) => {
        keys: () => string[];
        <T = unknown>(id: string): T;
    };
};

const themeContext = () =>
    require.context('./', false, /^\.\/.+\.css$/);

function readThemeNamesFromStyleSheets(): string[] {
    if (typeof document === 'undefined') {
        return [];
    }

    const themeNames = new Set<string>();
    const themeSelectorPattern = /^:root\[data-theme=(['"]?)([^'"\]]+)\1\]$/;

    Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
            Array.from(styleSheet.cssRules).forEach((rule) => {
                if (!(rule instanceof CSSStyleRule)) {
                    return;
                }

                const match = rule.selectorText.match(themeSelectorPattern);
                if (match?.[2]) {
                    themeNames.add(match[2]);
                }
            });
        } catch {
            // Ignore stylesheets whose rules are not readable.
        }
    });

    return Array.from(themeNames).sort();
}

/** Returns theme names derived from loaded CSS data-theme selectors, sorted alphabetically. */
export function getThemeNames(): string[] {
    loadThemesFromDirectory();
    return readThemeNamesFromStyleSheets();
}

/** Loads all theme CSS files from this directory once at runtime. */
export function loadThemesFromDirectory(): void {
    if (didLoadThemes) {
        return;
    }

    const context = themeContext();
    context.keys().forEach((file: string) => {
        context(file);
    });

    didLoadThemes = true;
}
