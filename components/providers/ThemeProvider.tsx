'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createDefaultColorSettings,
  resolveColors,
  type ColorSettings,
} from '@/lib/theme/colors';
import {
  createDefaultTypographySettings,
  resolveTypography,
  type TypographySettings,
} from '@/lib/theme/typography';

interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
}

interface InitialThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  colors?: ColorSettings;
  typography: TypographySettings;
  typographyStylesheetHref?: string | null;
  themeVersion: number;
}

interface ThemeContextType {
  colors: ThemeColors;
  updateColors: (colors: ThemeColors) => void;
  /** Preset id backing the current palette, or null for a hand-picked pair. */
  colorPresetId: string | null;
  updateColorPresetId: (presetId: string | null) => void;
  /**
   * Resolved palette as hex, for the active appearance. Charting libraries need a
   * concrete colour rather than a CSS variable, so they read it from here instead
   * of hardcoding one.
   */
  palette: Record<string, string>;
  typography: TypographySettings;
  updateTypography: (typography: TypographySettings) => void;
  themeVersion: number;
  refreshTheme: () => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_VERSION_STORAGE_KEY = 'theme-settings-version';
const DEFAULT_COLOR_SETTINGS = createDefaultColorSettings();
const FALLBACK_THEME_COLORS = {
  primaryColor: DEFAULT_COLOR_SETTINGS.primaryColor,
  secondaryColor: DEFAULT_COLOR_SETTINGS.secondaryColor,
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  initialThemeConfig?: InitialThemeConfig;
}

export function ThemeProvider({ children, initialThemeConfig }: ThemeProviderProps) {
  const initialTypography = initialThemeConfig?.typography || createDefaultTypographySettings();
  const hasServerTheme = Boolean(initialThemeConfig);

  const [colors, setColors] = useState<ThemeColors>(
    initialThemeConfig
      ? {
          primaryColor: initialThemeConfig.primaryColor,
          secondaryColor: initialThemeConfig.secondaryColor,
        }
      : FALLBACK_THEME_COLORS,
  );
  const [typography, setTypography] = useState<TypographySettings>(initialTypography);
  const [colorPresetId, setColorPresetId] = useState<string | null>(
    initialThemeConfig?.colors?.presetId ?? null,
  );
  const [fontStylesheetHref, setFontStylesheetHref] = useState<string | null>(
    initialThemeConfig?.typographyStylesheetHref || null,
  );
  const [themeVersion, setThemeVersion] = useState<number>(
    initialThemeConfig?.themeVersion || 1,
  );
  const [loading, setLoading] = useState(!initialThemeConfig);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const resolvedTypography = useMemo(() => resolveTypography(typography), [typography]);
  const resolvedColors = useMemo(
    () =>
      resolveColors({
        presetId: colorPresetId,
        primaryColor: colors.primaryColor,
        secondaryColor: colors.secondaryColor,
      }),
    [colorPresetId, colors.primaryColor, colors.secondaryColor],
  );

  // Detect dark mode and fetch theme colors from API
  useEffect(() => {
    const detectDarkMode = () => {
      if (typeof window !== 'undefined') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDark);

        // Apply dark class to html element
        const html = document.documentElement;
        if (prefersDark) {
          html.classList.add('dark');
        } else {
          html.classList.remove('dark');
        }
      }
    };

    const initializeTheme = async () => {
      try {
        const response = await fetch('/api/settings/general');
        if (response.ok) {
          const settings = await response.json();
          setColors({
            primaryColor: settings.primaryColor || FALLBACK_THEME_COLORS.primaryColor,
            secondaryColor:
              settings.secondaryColor || FALLBACK_THEME_COLORS.secondaryColor,
          });
          setColorPresetId(settings.colors?.presetId ?? null);
          if (settings.typography) {
            const normalized = resolveTypography(settings.typography);
            setTypography(normalized.settings);
            setFontStylesheetHref(
              settings.typographyStylesheetHref || normalized.fontStylesheetHref || null,
            );
          }
          if (typeof settings.themeVersion === 'number') {
            setThemeVersion(settings.themeVersion);
          }
        }
      } catch (error) {
        console.error('Error fetching theme settings:', error);
      } finally {
        setLoading(false);
      }
    };

    detectDarkMode();
    // The root layout already resolved these on the server and passed them in as
    // `initialThemeConfig`, so refetching on mount only duplicates a request the
    // page has already paid for. Admin saves still land immediately: they go
    // through `refreshTheme` via the `theme-settings-updated` event below.
    if (hasServerTheme) setLoading(false);
    else initializeTheme();

    // Listen for dark mode changes
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
        const html = document.documentElement;
        if (e.matches) {
          html.classList.add('dark');
        } else {
          html.classList.remove('dark');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [hasServerTheme]);

  const refreshTheme = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/general', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      if (!response.ok) return;

      const settings = await response.json();
      setColors({
        primaryColor: settings.primaryColor || FALLBACK_THEME_COLORS.primaryColor,
        secondaryColor: settings.secondaryColor || FALLBACK_THEME_COLORS.secondaryColor,
      });
      setColorPresetId(settings.colors?.presetId ?? null);

      if (settings.typography) {
        const normalized = resolveTypography(settings.typography);
        setTypography(normalized.settings);
        setFontStylesheetHref(
          settings.typographyStylesheetHref || normalized.fontStylesheetHref || null,
        );
      }

      if (typeof settings.themeVersion === 'number') {
        setThemeVersion(settings.themeVersion);
      }
    } catch (error) {
      console.error('Error refreshing theme settings:', error);
    }
  }, []);

  useEffect(() => {
    const onThemeUpdate = () => {
      void refreshTheme();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_VERSION_STORAGE_KEY) return;
      void refreshTheme();
    };

    window.addEventListener('theme-settings-updated', onThemeUpdate as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(
        'theme-settings-updated',
        onThemeUpdate as EventListener,
      );
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshTheme]);

  // Apply the resolved semantic palette. Every token for the active appearance is
  // written to the root element, so a colour change re-themes the whole UI without
  // any component knowing a colour name.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const variables = isDarkMode ? resolvedColors.dark : resolvedColors.light;

    Object.entries(variables).forEach(([variable, value]) => {
      root.style.setProperty(variable, value);
    });
  }, [resolvedColors, isDarkMode]);


  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    Object.entries(resolvedTypography.cssVariables).forEach(([variable, value]) => {
      root.style.setProperty(variable, value);
    });

    root.style.setProperty('--theme-version', String(themeVersion));
  }, [resolvedTypography.cssVariables, themeVersion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stylesheetHref =
      fontStylesheetHref || resolvedTypography.fontStylesheetHref || null;

    let link = document.getElementById(
      'theme-font-stylesheet',
    ) as HTMLLinkElement | null;

    if (!stylesheetHref) {
      if (link) link.remove();
      return;
    }

    if (!link) {
      link = document.createElement('link');
      link.id = 'theme-font-stylesheet';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    if (link.href !== stylesheetHref) {
      link.href = stylesheetHref;
    }
  }, [fontStylesheetHref, resolvedTypography.fontStylesheetHref]);

  const updateColors = (newColors: ThemeColors) => {
    setColors(newColors);
  };

  const updateTypography = (nextTypography: TypographySettings) => {
    setTypography(resolveTypography(nextTypography).settings);
  };

  const contextValue: ThemeContextType = {
    colors,
    updateColors,
    colorPresetId,
    updateColorPresetId: setColorPresetId,
    palette: isDarkMode ? resolvedColors.darkHex : resolvedColors.lightHex,
    typography,
    updateTypography,
    themeVersion,
    refreshTheme,
    loading,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Helper function to convert hex to HSL

// Helper function to generate a complete color palette from a base color

// Helper function to convert hex to HSL values (separate h, s, l)

// Helper function to get contrast color (white or black) based on background color
