import { ArgumentedEventDispatcher } from "../Events/EventDispatcher";
import { HandledPromiseResult, handlePromise } from "../Utils/Promise";
import { ArgumentedEvent } from "../Events/Event";
import { HtmlEvent } from "../Events/HtmlEvent";
import { PseudoElement, PseudoClass } from "./Pseudos";
import { injectable } from "../Utils/DI";
import { IBaseSettingsManager } from "../Settings/BaseSettingsManager";
import { IApplicationSettings } from "../Settings/IApplicationSettings";
import { hashCode } from "../Utils/String";
import { firstSetIncludesAllElementsOfSecondSet, sliceIntoChunks } from "../Utils/Array";
import { getEnumValues } from "../Utils/Enum";
import { CssStyleKeys, CssStyle } from "./CssStyle";
import * as x from "../Utils/RegExp";
import { FetchExternalCss, LocalMessageToContent, MessageType } from '../Settings/Messages';
import { IContentMessageBus } from './IContentMessageBus';

type CssPromise = Promise<HandledPromiseResult<void>>;
type ArgEvent<TArgs> = ArgumentedEvent<TArgs>;
const dom = HtmlEvent;

enum Var
{
    id,
    tagName,
    className,
    notThisTagId,
    notThisClassNames
}

export abstract class IStyleSheetProcessor
{
    abstract processDocumentStyleSheets(document: Document): void;
    abstract getElementMatchedSelectors(tag: Element | PseudoElement): string;
    abstract getPreFilteredSelectors(tag: Element): string[];
    abstract canHavePseudoClass(tag: Element, preFilteredSelectors: string[], pseudoClass: PseudoClass): boolean;
    abstract getSelectorsCount(doc: Document): number;
    abstract getSelectorsQuality(doc: Document): number | undefined;
    abstract getCssPromises(doc: Document): CssPromise[];
    abstract get onElementsForUserActionObservationFound(): ArgEvent<[PseudoClass, NodeListOf<Element>]>;
}

@injectable(IStyleSheetProcessor)
class StyleSheetProcessor implements IStyleSheetProcessor
{
    private _storageIsAvailable = true;
    private readonly _selectorsStorageKey = "ml-selectors";
    private readonly _styleRefsStorageKey = "ml-style-refs";
    protected readonly _stylesLimit = 500;
    protected readonly _trimmedStylesLimit = 500;
    private _lastSelectorsCache = { selectors: 0, styles: 0 };
    protected readonly _css: CssStyleKeys;
    private readonly _passedTransitionSelectors = new Set<string>();
    protected readonly _transitionForbiddenProperties: Set<string>;
    protected readonly _styleProps =
        [
            { prop: "background-color", priority: 1 },
            { prop: "color", priority: 1 },
            { prop: "fill", priority: 2 },
            { prop: "border-color", priority: 2 },
            { prop: "stroke", priority: 2 },
            { prop: "background-image", priority: 3 },
            { prop: "background-position", priority: 3 },
            { prop: "background-size", priority: 4 },
            { prop: "text-shadow", priority: 4 }
        ];
    private readonly _passedPseudoSelectors = new Set<string>();
    protected readonly _mediaQueries = new Map<string, boolean>();

    protected readonly _externalCssPromises = new Map<string, CssPromise>();
    protected readonly _externalCssResolvers = new Map<string, (url: string) => void>();
    protected readonly _externalCssRejectors = new Map<string, (url: string) => void>();
    getCssPromises(doc: Document)
    {
        return Array.from(this._externalCssPromises.values());
    }

    protected _selectors = new Array<string>();
    public getSelectorsCount(doc: Document) { return this._selectors.length; }

    protected _selectorsQuality?: number = undefined;
    public getSelectorsQuality(doc: Document) { return this._selectorsQuality; }

    protected _preFilteredSelectors = new Map<string, string[]>();
    protected readonly _preFilteredSelectorsCache = new Map<string, string[]>();
    protected _styleRefs = new Set<string>();
    protected readonly _styleRefsCache = new Set<string>();

    // protected readonly _excludeStylesRegExp: string;
    protected readonly _includeStylesRegExp: string;

    protected _onElementsForUserActionObservationFound = new ArgumentedEventDispatcher<[PseudoClass, NodeListOf<Element>]>();
    public get onElementsForUserActionObservationFound()
    {
        return this._onElementsForUserActionObservationFound.event;
    }

    /** StyleSheetProcessor constructor
     * @param _app - application settings
     */
    constructor(css: CssStyle,
        settingsManager: IBaseSettingsManager,
        private readonly _doc: Document,
        private readonly _app: IApplicationSettings,
        private readonly _msgBus: IContentMessageBus
    )
    {
        this._css = css as any;
        this._transitionForbiddenProperties = new Set<string>(
            [
                this._css.all,
                this._css.background,
                this._css.backgroundColor,
                this._css.backgroundImage,
                this._css.color,
                this._css.border,
                this._css.borderBottom,
                this._css.borderBottomColor,
                this._css.borderColor,
                this._css.borderLeft,
                this._css.borderLeftColor,
                this._css.borderRight,
                this._css.borderRightColor,
                this._css.borderTop,
                this._css.borderTopColor,
                this._css.textShadow,
                this._css.filter
            ]);

        //  this._excludeStylesRegExp = this.compileExcludeStylesRegExp();
        this._includeStylesRegExp = this.compileIncludeStylesRegExp();
        _msgBus.onMessage.addListener(this.onMessageFromBackgroundPage, this);
        window.setInterval(() =>
        {
            if (this._storageIsAvailable)
            {
                try
                {
                    if (this._preFilteredSelectors.size && this._styleRefs.size &&
                        this._lastSelectorsCache.selectors !== this._preFilteredSelectors.size &&
                        this._lastSelectorsCache.styles !== this._styleRefs.size)
                    {
                        sessionStorage.setItem(this._selectorsStorageKey,
                            JSON.stringify(Array.from(this._preFilteredSelectors)));

                        sessionStorage.setItem(this._styleRefsStorageKey,
                            JSON.stringify(Array.from(this._styleRefs)));

                        this._lastSelectorsCache = {
                            selectors: this._preFilteredSelectors.size,
                            styles: this._styleRefs.size
                        };
                    }
                }
                catch (ex)
                {
                    _app.isDebug && console.error(ex);
                }
            }
        }, 15000);

        try
        {
            const selectorsJsonData = sessionStorage.getItem(this._selectorsStorageKey);
            if (selectorsJsonData)
            {
                const selArray = JSON.parse(selectorsJsonData) as [string, string[]][];
                this._preFilteredSelectorsCache = new Map(selArray);
            }
            const styleRefsJsonData = sessionStorage.getItem(this._styleRefsStorageKey);
            if (styleRefsJsonData)
            {
                const refsArray = JSON.parse(styleRefsJsonData) as string[];
                this._styleRefsCache = new Set(refsArray);
            }
        }
        catch (ex)
        {
            this._storageIsAvailable = false;
            _app.isDebug && console.error(ex);
        }

        settingsManager.onSettingsChanged
            .addListener(() => this._passedPseudoSelectors.clear(), this);
    }

    protected compileExcludeStylesRegExp(): string
    {
        x.resetCapturingGroups();
        return x.completely(x.sometime(x.forget(
            x.sometime(x.forget(
                // beginning of the current selector
                x.succeededBy(x.Next(),
                    x.BeginningOfLine, x.any(x.outOfSet(x.Comma)), x.WhiteSpace,
                    x.OR,
                    x.Comma, x.any(x.outOfSet(x.Comma)), x.WhiteSpace,
                    x.OR,
                    x.BeginningOfLine
                ),
                x.succeededBy(x.Next(),
                    // anything before a dot
                    x.neverOrOnce(x.succeededBy(x.Next(), x.any(x.outOfSet(x.Dot, x.Comma, x.EndOfLine)))), x.Dot,
                    // followed by another className
                    x.$var(Var[Var.notThisClassNames]), x.some(x.Literal),
                    x.Or,
                    // another tagName
                    x.notFollowedBy(x.$var(Var[Var.tagName]), x.WordBoundary), x.some(x.Word),
                    x.Or,
                    // any tagName followed by another id
                    x.any(x.Word), x.Hash, x.$var(Var[Var.notThisTagId]), x.some(x.Literal), x.WordBoundary, x.notFollowedBy(x.Minus),
                    x.Or,
                    // any pseudo element
                    x.neverOrOnce(x.succeededBy(x.Next(), x.any(x.outOfSet(x.Colon, x.Comma, x.EndOfLine)))), x.exactly(2, x.Colon)
                ),
                // end of the current selector
                x.any(x.outOfSet(x.Comma, x.WhiteSpace, x.EndOfLine)),
                x.followedBy(x.Comma, x.Or, x.EndOfLine)
            ))
        )));
    }

    protected compileIncludeStylesRegExp()
    {
        return x.forget(
            x.forget(x.BeginningOfLine, x.Or, x.WhiteSpace),
            x.forget(
                x.neverOrOnce(x.forget( // tagName
                    x.$var(Var[Var.tagName])
                )),
                x.neverOrOnce(x.forget( // #id
                    x.Hash, x.$var(Var[Var.id])
                )),
                x.anytime(x.forget( // .className1.className2
                    x.Dot, x.$var(Var[Var.className])
                )),
                x.WordBoundary, x.notFollowedBy( // end of literal
                    x.Minus
                ),
                x.Or,
                x.neverOrOnce(x.forget( // "any tag name"
                    x.Asterisk
                ))
            ),
            x.notFollowedBy( // exclude another tag names, ids and classes
                x.some(x.Word)
            ),
            x.notFollowedBy( // exclude pseudo elements
                x.exactly(2, x.Colon)
            ),
            x.any( // any attribute filters or pseudo classes
                x.outOfSet(x.Comma, x.Dot, x.Hash, x.WhiteSpace, x.EndOfLine)
            ),
            // end of current selector or line
            x.followedBy(x.Comma, x.Or, x.EndOfLine)
        );
    }

    protected checkPropertyIsValuable(style: CSSStyleDeclaration, propName: string)
    {
        let propVal = style.getPropertyValue(propName);
        return propVal !== "" && propVal != "initial" && propVal != "inherited";
    }

    public processDocumentStyleSheets(doc: Document): void
    {
        const styleRefs = new Set<string>(), transitionSelectors = new Set<string>();
        let styleRefIsDone = false;
        let styleRefCssText = "";

        let styleRules = new Array<CSSStyleRule>();
        let styleSheets = Array.from(doc.styleSheets) as (CSSStyleSheet | CSSMediaRule)[];
        let cssRules: CSSRuleList | undefined;
        for (let sheet of styleSheets)
        {
            if (sheet)
            {
                try { cssRules = sheet.cssRules; }
                catch{ cssRules = undefined; }
                if (cssRules)
                {
                    if (cssRules.length > 0 && (sheet instanceof CSSMediaRule || !sheet.ownerNode || !(sheet.ownerNode as Element).mlIgnore))
                    {
                        if (sheet instanceof CSSStyleSheet && (
                            sheet.href || sheet.mlExternal ||
                            sheet.ownerNode instanceof HTMLElement && sheet.ownerNode.hasAttribute("ml-external")))
                        {
                            styleRefs.add(sheet.href || sheet.mlExternal ||
                                (sheet.ownerNode as HTMLElement).getAttribute("ml-external")!);
                            styleRefIsDone = true;
                        }
                        else
                        {
                            styleRefIsDone = false;
                        }
                        styleRefCssText = "";
                        for (let rule of Array.from(cssRules))
                        {
                            if (rule instanceof CSSStyleRule)
                            {
                                let style = rule.style;
                                if (this._styleProps.some(p => !!style.getPropertyValue(p.prop)))
                                {
                                    styleRules.push(rule);
                                    if (!styleRefIsDone)
                                    {
                                        styleRefCssText += rule.cssText;
                                    }
                                }
                                const transitionDuration = style.getPropertyValue(this._css.transitionDuration);
                                if (transitionDuration && transitionDuration !== this._css._0s)
                                {
                                    if (style.getPropertyValue(this._css.transitionProperty)
                                        .split(", ")
                                        .find(p => this._transitionForbiddenProperties.has(p)))
                                    {
                                        transitionSelectors.add(rule.selectorText);
                                    }
                                }
                            }
                            else if (rule instanceof CSSImportRule)
                            {
                                styleSheets.push(rule.styleSheet);
                            }
                            else if (rule instanceof CSSMediaRule)
                            {
                                if (this.validateMediaQuery(doc, rule.conditionText))
                                {
                                    styleSheets.push(rule);
                                }
                            }
                        }
                        if (styleRefCssText)
                        {
                            styleRefs.add(hashCode(styleRefCssText).toString());
                        }
                    }
                }
                // external css
                else if (sheet instanceof CSSStyleSheet && sheet.href &&
                        /* excluding fonts */ !/font/.test(sheet.href))
                {
                    if (!this._externalCssPromises!.has(sheet.href))
                    {
                        let cssPromise = fetch(sheet.href).then(resp => resp.text()).catch(ex =>
                        {
                            const url = ((sheet as CSSStyleSheet).href!);
                            if (this._app.isDebug)
                            {
                                console.error(`Error during css file download: ${url}\nDetails: ${ex.message || ex}`);
                            }
                            this._msgBus.postMessage(new FetchExternalCss(url));
                            return new Promise<string>((res, rej) =>
                            {
                                this._externalCssResolvers.set(url, res);
                                this._externalCssRejectors.set(url, rej);
                            });
                        });
                        this._externalCssPromises.set(sheet.href, handlePromise(
                            Promise.all([cssPromise, sheet.href])
                                .then(([css, href]) => this.insertExternalCss(css, href))));
                    }
                }
            }
        }

        let maxPriority = 1;
        let filteredStyleRules = styleRules;
        if (transitionSelectors.size)
        {
            this.findElementsWithTransition(doc, transitionSelectors);
        }
        this.findElementsForUserActionObservation(doc, styleRules);
        this._styleProps.forEach(p => maxPriority = p.priority > maxPriority ? p.priority : maxPriority);
        let styleProps = this._styleProps;
        let selectorsQuality = maxPriority;
        while (maxPriority-- > 1 && filteredStyleRules.length > this._stylesLimit)
        {
            selectorsQuality--;
            styleProps = styleProps.filter(p => p.priority <= maxPriority);
            filteredStyleRules = filteredStyleRules.filter(r => styleProps.some(p => !!r.style.getPropertyValue(p.prop)));
        }

        if (filteredStyleRules.length > this._stylesLimit)
        {
            selectorsQuality = 0;
            let trimmer = (x: CSSStyleRule) =>
                /active|hover|disable|check|visit|link|focus|select|enable/gi.test(x.selectorText);
            let trimmedStyleRules = styleRules.filter(trimmer);
            if (trimmedStyleRules.length > this._trimmedStylesLimit)
            {
                filteredStyleRules = filteredStyleRules.filter(trimmer);
            }
            else
            {
                filteredStyleRules = trimmedStyleRules;
            }
        }

        this._selectorsQuality = selectorsQuality;
        this._selectors = filteredStyleRules.map(sr => sr.selectorText);
        if (firstSetIncludesAllElementsOfSecondSet(this._styleRefsCache, styleRefs))
        {
            this._styleRefs = this._styleRefsCache;
            this._preFilteredSelectors = this._preFilteredSelectorsCache;
        }
        else
        {
            this._styleRefs = styleRefs;
            this._preFilteredSelectors.clear();
        }
    }

    private onMessageFromBackgroundPage(message?: LocalMessageToContent)
    {
        if (message)
        {
            switch (message.type)
            {
                case MessageType.ExternalCssFetchCompleted:
                    this._externalCssResolvers.get(message.url)?.(message.cssText);
                    break;
                case MessageType.ExternalCssFetchFailed:
                    this._externalCssRejectors.get(message.url)?.(message.error);
                case MessageType.ErrorMessage:
                    this._app.isDebug && console.error(message);
                default:
                    break;
            }
        }
    }

    private insertExternalCss(cssText: string, url: string)
    {
        let style = this._doc.createElement('style');
        style.setAttribute("ml-external", url);
        style.innerText = cssText;
        (style as any).disabled = true;
        (this._doc.head || this._doc.documentElement!).appendChild(style);
        if (style.sheet)
        {
            style.sheet.disabled = true;
        }
    }

    private findElementsWithTransition(doc: Document, transitionSelectors: Set<string>)
    {
        for (const selector of sliceIntoChunks(Array
            .from(transitionSelectors), 50)
            .map(x => x.join(",")))
        {
            if (selector && !this._passedTransitionSelectors.has(selector))
            {
                try
                {
                    this._passedTransitionSelectors.add(selector);
                    doc.body.querySelectorAll(selector).forEach(tag =>
                        tag.hasTransition = true);
                }
                catch (ex)
                {
                    this._app.isDebug && console.error(ex);
                }
            }
        }
    }

    public findElementsForUserActionObservation(doc: Document, rules: Array<CSSStyleRule>)
    {
        for (const pseudoClass of getEnumValues<PseudoClass>(PseudoClass))
        {
            const pseudoClassRegExp = this.getPseudoClassRegExp(pseudoClass);
            for (const selector of sliceIntoChunks(Array.from(new Set(rules
                .filter(rule => rule.selectorText.search(pseudoClassRegExp) !== -1)
                .map(rule => rule.selectorText.replace(pseudoClassRegExp, "$1")))), 50)
                .map(x => x.join(",")))
            {
                if (selector && !this._passedPseudoSelectors.has(selector))
                {
                    try
                    {
                        this._passedPseudoSelectors.add(selector);
                        const elements = doc.body.querySelectorAll(selector);
                        if (elements.length > 0)
                        {
                            this._onElementsForUserActionObservationFound.raise([pseudoClass, elements]);
                        }
                    }
                    catch (ex)
                    {
                        this._app.isDebug && console.error(ex);
                    }
                }
            }
        }
    }

    public getElementMatchedSelectors(tag: Element | PseudoElement): string
    {
        if (tag instanceof PseudoElement)
        {
            return tag.selectors;
        }
        else
        {
            let preFilteredSelectors = this.getPreFilteredSelectors(tag);
            let wrongSelectors = new Array<string>();
            let result = preFilteredSelectors.filter((selector) =>
            {
                try
                {
                    return tag.matches(selector);
                }
                catch (ex)
                {
                    wrongSelectors.push(selector);
                    this._app.isDebug && console.error(ex);
                    return false;
                }
            });
            wrongSelectors.forEach(w => preFilteredSelectors!.splice(preFilteredSelectors!.indexOf(w), 1))
            return result.join("\n");
        }
    }

    public getPreFilteredSelectors(tag: Element): string[]
    {
        let key = `${tag.tagName}#${tag.id}.${tag.classList.toString()}`;
        let preFilteredSelectors = this._preFilteredSelectors.get(key);
        if (preFilteredSelectors === undefined)
        {
            let notThisClassNames = "", className = "";
            if (tag.classList && tag.classList.length > 0)
            {
                // let classNameRegExp = (Array.prototype.map.call(tag.classList, (c: string) => x.escape(c)) as string[]).join(
                //     x.WordBoundary + x.notFollowedBy(x.Minus) + x.Or) +
                //     x.WordBoundary + x.notFollowedBy(x.Minus);
                // notThisClassNames = x.notFollowedBy(classNameRegExp);
                className = x.forget((Array.prototype.map.call(tag.classList, (c: string) => x.escape(c)) as string[]).join(x.Or));
            }
            let vars = new Map<string, string>();
            vars.set(Var[Var.id], x.escape(tag.id));
            vars.set(Var[Var.tagName], tag.tagName);
            vars.set(Var[Var.className], className);
            //vars.set(Var[Var.notThisTagId], tag.id ? x.notFollowedBy(tag.id + x.WordBoundary) : "");
            //vars.set(Var[Var.notThisClassNames], notThisClassNames);

            //let excludeRegExpText = x.applyVars(this._excludeStylesRegExp, vars);
            let includeRegExpText = x.applyVars(this._includeStylesRegExp, vars);

            //let excludeRegExp = new RegExp(excludeRegExpText, "i");
            let includeRegExp = new RegExp(includeRegExpText, "gi");
            //preFilteredSelectors = this._selectors.get(tag.ownerDocument)!.filter(selector => !excludeRegExp.test(selector));
            preFilteredSelectors = this._selectors.filter(selector => selector.search(includeRegExp) !== -1);
            this._preFilteredSelectors.set(key, preFilteredSelectors);
        }
        return preFilteredSelectors;
    }

    /**
     * Checks whether there are some rules in the style sheets with the specified {pseudoClass}
     * which might be valid for the specified {tag} at some time.
     **/
    public canHavePseudoClass(tag: Element, preFilteredSelectors: string[], pseudoClass: PseudoClass): boolean
    {
        let pseudoRegExp = this.getPseudoClassRegExp(pseudoClass);
        return preFilteredSelectors.some(s => s.search(pseudoRegExp) !== -1 &&
            tag.matches(s.replace(pseudoRegExp, "$1")));
    }

    private getPseudoClassRegExp(pseudoClass: PseudoClass)
    {
        return new RegExp(x.remember(x.outOfSet(x.LeftParenthesis, x.WhiteSpace)) +
            x.Colon + PseudoClass[pseudoClass] + x.WordBoundary + x.notFollowedBy(x.Minus), "gi");
    }

    protected validateMediaQuery(doc: Document, mediaQuery: string)
    {
        let mediaResult = this._mediaQueries.get(mediaQuery);
        if (mediaResult === undefined)
        {
            mediaResult = doc.defaultView!.matchMedia(mediaQuery).matches;
            this._mediaQueries.set(mediaQuery, mediaResult);
        }
        return mediaResult;
    }
}