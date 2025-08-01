import { createContext } from 'react';
import type { ThemeContextType } from '../types/context';

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);
