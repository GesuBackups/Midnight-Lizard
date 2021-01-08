import { ColorSchemeId } from "./ColorSchemes";

export enum ProcessingMode
{
    Automatic = "auto",
    Simplified = "simple",
    Complex = "complex",
    Filter = "filter"
}

export enum SystemSchedule
{
    Dark = "sys-dark",
    Light = "sys-light"
}

export enum ColorSchemeNamePrefix
{
    FromFile = "📄 ",
    Public = "☁ ",
    Unsaved = "🖉 "
}

export type ColorSchemePropertyName = Extract<keyof ColorScheme, string>;

export const excludeSettingsForExport: ColorSchemePropertyName[] = [
    "isEnabled", "location", "userColorSchemes", "userColorSchemeIds",
    "changeBrowserTheme", "restoreColorsOnCopy", "restoreColorsOnPrint"
];

export const excludeSettingsForSave: ColorSchemePropertyName[] = [
    "isEnabled", "location", "colorSchemeName", "userColorSchemes",
    "userColorSchemeIds", "changeBrowserTheme", "restoreColorsOnCopy",
    "restoreColorsOnPrint"
];

export const excludeSettingsForCompare: ColorSchemePropertyName[] = [
    "isEnabled", "location", "colorSchemeId", "colorSchemeName",
    "userColorSchemes", "userColorSchemeIds", "runOnThisSite",
    "changeBrowserTheme", "restoreColorsOnCopy", "restoreColorsOnPrint"
];


export type PartialColorScheme = { [k in keyof ColorScheme]?: ColorScheme[k] };
/**
 * ColorScheme - MidnightLizard Settings
 */
export interface ColorScheme
{
    userColorSchemes?: Array<ColorScheme>;
    userColorSchemeIds?: Array<ColorSchemeId>;
    changeBrowserTheme?: boolean;
    isEnabled?: boolean;
    location?: string;

    colorSchemeId: ColorSchemeId;
    colorSchemeName: string;
    blueFilter: number;
    mode: ProcessingMode;
    modeAutoSwitchLimit: number;

    runOnThisSite: boolean;
    useDefaultSchedule: boolean | SystemSchedule;
    scheduleStartHour: number;
    scheduleFinishHour: number
    includeMatches: string;
    excludeMatches: string;

    restoreColorsOnCopy: boolean;
    restoreColorsOnPrint: boolean;
    doNotInvertContent: boolean;

    backgroundSaturationLimit: number;
    backgroundContrast: number;
    backgroundLightnessLimit: number;
    backgroundGraySaturation: number;
    backgroundGrayHue: number;
    backgroundReplaceAllHues: boolean;
    backgroundHueGravity: number;

    buttonSaturationLimit: number;
    buttonContrast: number;
    buttonLightnessLimit: number;
    buttonGraySaturation: number;
    buttonGrayHue: number;
    buttonReplaceAllHues: boolean;
    buttonHueGravity: number;

    textSaturationLimit: number;
    textContrast: number;
    textLightnessLimit: number;
    textGraySaturation: number;
    textGrayHue: number;
    textSelectionHue: number;
    textReplaceAllHues: boolean;
    textHueGravity: number;

    linkSaturationLimit: number;
    linkContrast: number;
    linkLightnessLimit: number;
    linkDefaultSaturation: number;
    linkDefaultHue: number;
    linkVisitedHue: number;
    linkReplaceAllHues: boolean;
    linkHueGravity: number;

    borderSaturationLimit: number;
    borderContrast: number;
    borderLightnessLimit: number;
    borderGraySaturation: number;
    borderGrayHue: number;
    borderReplaceAllHues: boolean;
    borderHueGravity: number;

    imageLightnessLimit: number;
    imageSaturationLimit: number;
    useImageHoverAnimation: boolean;

    backgroundImageLightnessLimit: number;
    backgroundImageSaturationLimit: number;
    hideBigBackgroundImages: boolean;
    maxBackgroundImageSize: number;

    scrollbarSaturationLimit: number;
    scrollbarContrast: number;
    scrollbarLightnessLimit: number;
    scrollbarGrayHue: number;
    scrollbarSize: number;
    scrollbarStyle: boolean;
}