// Cytoplasmic
// Copyright (c) 2022 Niels Sonnich Poulsen (http://nielssp.dk)
// Licensed under the MIT license. See the LICENSE file or
// http://opensource.org/licenses/MIT for more information.

import { Cell, constant, zipWith } from "./cell";
import { Observable } from './emitter';

export type ParameterValue = string | number | Cell<string> | Cell<number>;

export type TranslationParameters = Partial<Record<string, string | number>>;

/**
 * Translation provider interface. Implement this to provide translations for
 * {@link _} and {@link _n}.
 */
export interface TranslationProvider {
    /**
     * When triggered all previously translated strings will be retranslated. 
     */
    readonly onLanguageChange: Observable<void>;

    /**
     * Translate a string for use with {@link _}.
     *
     * @param msgid - Translation key
     * @param parameters - Translation parameter object
     */
    translate(
        msgid: string,
        parameters: TranslationParameters,
    ): string;

    /**
     * Translate a string for use with  {@link _n}.
     *
     * @param msgid - Translation key
     * @param msgidPlural - Translation key, plural
     * @param parameters - Translation parameter object
     */
    translateNumeric(
        msgid: string,
        msgidPlural: string,
        parameters: {n: number} & TranslationParameters,
    ): string;
}

/**
 * A translation provider that doesn't translate strings but does implement
 * parameter interpolation via braces (e.g. `_('Hello, {name}!', {name: 'World'})`).
 *
 * When used with {@link _n} it will also use the plural string when `n` is not
 * equal to 1 or -1.
 *
 * This class can be extended to implement a simple translation provider with
 * the above mentioned features. Simply override the {@link getMessage} method.
 */
export class DummyTranslationProvider implements TranslationProvider {
    readonly onLanguageChange: Observable<void> = constant(undefined);

    /**
     * Override this method in a subclass to provide actual translations. Simply
     * return the translated string or undefined if the string doesn't exist.
     *
     * @param _msgid - The translation key, translation source, or default translation
     * @param _parameters - The translation parameter object, this can be used
     * to apply more advanced pluralization rules.
     * @returns The translated string or `undefined` if not found.
     */
    protected getMessage(_msgid: string, _parameters: TranslationParameters): string | undefined {
        return undefined;
    }

    translate(msgid: string, parameters: TranslationParameters): string {
        let msg = this.getMessage(msgid, parameters) ?? msgid;
        for (let key in parameters) {
            msg = msg.replace(`{${key}}`, '' + parameters[key]);
        }
        return msg;
    }
    translateNumeric(msgid: string, msgidPlural: string, parameters: { n: number; } & TranslationParameters): string {
        let msg = this.getMessage(msgid, parameters);
        if (!msg) {
            if (parameters.n == 1 || parameters.n === -1) {
                msg = msgid;
            } else {
                msg = msgidPlural;
            }
        }
        for (let key in parameters) {
            msg = msg.replace(`{${key}}`, '' + parameters[key]);
        }
        return msg;
    }
}

let globalTranslationProvider: TranslationProvider = new DummyTranslationProvider;
let globalLanguageChangeCell: Cell<void> = constant(undefined);

/**
 * Register a global translation provider that will be used to translate strings
 * when using {@link _} and {@link _n}. By default {@link DummyTranslationProvider}
 * is used as the translation provider. It doesn't actually translate string,
 * but does interpolate parameters and it can be used as a base class for
 * implementing other providers.
 *
 * @param provider - The translation provider object.
 * @returns The previous translation provider.
 */
export function registerTranslationProvider(provider: TranslationProvider): TranslationProvider {
    const previous = globalTranslationProvider;
    globalTranslationProvider = provider;
    globalLanguageChangeCell = Cell.from(provider.onLanguageChange, undefined);
    return previous;
}

/**
 * Reactively translate a string with optional parameters.
 * A global translation provider must be registered with {@link registerTranslationProvider}
 * before any actual translation can happen.
 *
 * @param msgid - Translation key or default translation depending on how the
 * translation provider is set up.
 * @param parameters - An optional object containing parameters for use in the
 * translation string. Values may be cells.
 * @returns A cell containing the translated string. The cell updates if
 * any cell parameters change or a language change event is emitted by the
 * translation provider.
 */
export function _(msgid: string, parameters: Record<string, ParameterValue> = {}): Cell <string> {
    const sources = Object.values(parameters).filter(source => source instanceof Cell) as Cell<any>[];
    sources.push(globalLanguageChangeCell);
    return zipWith(sources, (..._) => {
        const providerParameters: TranslationParameters = {};
        for (let key in parameters) {
            const value = parameters[key];
            if (value instanceof Cell) {
                providerParameters[key] = value.value;
            } else {
                providerParameters[key] = value;
            }
        }
        return globalTranslationProvider.translate(msgid, providerParameters);
    });
}

/**
 * Similar to {@link _} but may switch between different translations based on a
 * numeric parameter `n`. This function is designed to be used with a
 * gettext-style translation provider where translation keys are used as source
 * translation strings. More complex rules can be implemented by the translation
 * provider registered with {@link registerTranslationProvider}.
 *
 * @param msgid - Translation key or default translation depending on how the
 * translation provider is set up.
 * @param msgidPlural - A second translation key that can be used as default
 * fallback when `n` is not 1 or -1. More complex rules can be implemented by
 * the translation provider.
 * @param parameters - An optional object containing parameters for use in the
 * translation string. Values may be cells.
 * @returns A cell containing the translated string. The cell updates if
 * any cell parameters change or a language change event is emitted by the
 * translation provider.
 */
export function _n(
    msgid: string,
    msgidPlural: string,
    parameters: Record<string, ParameterValue> & {n: number|Cell<number>},
): Cell<string> {
    const sources = Object.values(parameters).filter(source => source instanceof Cell) as Cell<any>[];
    sources.push(globalLanguageChangeCell);
    return zipWith(sources, (..._) => {
        const providerParameters: {n: number} & TranslationParameters = {
            n: parameters.n instanceof Cell ? parameters.n.value : parameters.n,
        };
        for (let key in parameters) {
            const value = parameters[key];
            if (value instanceof Cell) {
                providerParameters[key] = value.value;
            } else {
                providerParameters[key] = value;
            }
        }
        return globalTranslationProvider.translateNumeric(msgid, msgidPlural, providerParameters);
    });
}
