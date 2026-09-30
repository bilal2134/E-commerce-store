import type { Locale } from "../config";
import { en, type Dictionary } from "./en";
import { ur } from "./ur";

/**
 * Both dictionaries are small (a few KB), so client components import them
 * directly and pick by locale; functions in a dictionary can't cross the
 * server→client boundary as props.
 */
const DICTIONARIES: Record<Locale, Dictionary> = { en, ur };

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
