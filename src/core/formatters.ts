/**
 * Copyright 2014-present Palantir Technologies
 * @license MIT
 */

import * as d3 from "d3";
import { Dataset } from "./dataset";

// Do not use utc by default
const DEFAULT_USE_UTC = false;

/**
 * A basic formatter function that will be passed a value to format (e.g. the tick value for axes).
 * A Formatter should return the formatted string representation of the input value.
 *
 * The value will be different for each use of the formatter - check the documentation of individual
 * methods to see what will be passed into the formatter.
 */
export type Formatter = (value: any) => string;

/**
 * A formatter function that will be passed the value to format as well as the underlying datum, index, and
 * dataset that the value came from. Datum-backed visual elements that display labels, such as Bar Plot bars
 * or Pie Plot sectors, will use this formatter.
 *
 * The value will be different for each use of the formatter - check the documentation of individual
 * methods to see what will be passed into the formatter.
 */
export type DatumFormatter = (value: any, datum: any, index: number, dataset: Dataset) => string;

interface IPredicatedFormat {
  specifier: string;
  predicate: (d: Date) => boolean;
}

/**
 * Creates a formatter for currency values.
 *
 * @param {number} [precision] The number of decimal places to show (default 2).
 * @param {string} [symbol] The currency symbol to use (default "$").
 * @param {boolean} [prefix] Whether to prepend or append the currency symbol (default true).
 *
 * @returns {Formatter} A formatter for currency values.
 */
export function currency(precision = 2, symbol = "$", prefix = true) {
  const fixedFormatter = fixed(precision);
  return (d: any) => {
    let formattedValue = fixedFormatter(Math.abs(d));
    if (formattedValue !== "") {
      if (prefix) {
        formattedValue = symbol + formattedValue;
      } else {
        formattedValue += symbol;
      }

      if (d < 0) {
        formattedValue = "-" + formattedValue;
      }
    }
    return formattedValue;
  };
}

/**
 * Creates a formatter that displays exactly [precision] decimal places.
 *
 * @param {number} [precision] The number of decimal places to show (default 3).
 *
 * @returns {Formatter} A formatter that displays exactly [precision] decimal places.
 */
export function fixed(precision = 3) {
  verifyPrecision(precision);
  return (d: any) => (<number> d).toFixed(precision);
}

/**
 * Creates a formatter that formats numbers to show no more than
 * [maxNumberOfDecimalPlaces] decimal places. All other values are stringified.
 *
 * @param {number} [maxNumberOfDecimalPlaces] The number of decimal places to show (default 3).
 *
 * @returns {Formatter} A formatter for general values.
 */
export function general(maxNumberOfDecimalPlaces = 3) {
  verifyPrecision(maxNumberOfDecimalPlaces);
  return (d: any) => {
    if (typeof d === "number") {
      const multiplier = Math.pow(10, maxNumberOfDecimalPlaces);
      return String(Math.round(d * multiplier) / multiplier);
    } else {
      return String(d);
    }
  };
}

/**
 * Convert numerals inside a string into the unicode superscript equivalent, e.g.
 *   µm3 => µm³
 *
 * @param {string} [s] The input string.
 *
 * @returns {string} The output string.
 */
function unicode_superscript(s: string) {
  const superscript_dict:any = {
    0: "⁰",
    1: "¹",
    2: "²",
    3: "³",
    4: "⁴",
    5: "⁵",
    6: "⁶",
    7: "⁷",
    8: "⁸",
    9: "⁹",
    "+": "⁺",
    "-": "⁻",
    ".": "⋅",
  };
  return s.split("").map((c: string) => c in superscript_dict ? superscript_dict[c] : c).join("");
}

/**
 * Creates a formatter that formats numbers to show no more than
 * [maxNumberOfDecimalPlaces] decimal places in exponential notation.
 * Exponentials will be displayed human readably, i.e. 1.3×10³.
 *
 * @param {number} [maxNumberOfDecimalPlaces] The number of decimal places to show (default 3).
 *
 * @returns {Formatter} A formatter for general values.
 */
export function exponential(maxNumberOfDecimalPlaces = 3) {
  verifyPrecision(maxNumberOfDecimalPlaces);
  return (d: any) => {
    if (d == 0 || d === undefined || isNaN(d) || Math.abs(d) == Infinity) {
      return String(d);
    } else if (typeof d === "number") {
      const multiplier = Math.pow(10, maxNumberOfDecimalPlaces);
      const sign = d < 0 ? - 1 : 1;
      const e = Math.floor(Math.log(sign * d)/Math.log(10));
      const m = sign * d / 10 ** e;
      const m_rounded = Math.round(m * multiplier) / multiplier;
      if (e == 0) {
        return String(sign * m_rounded); // do not attach ×10⁰ == 1
      } else if (m_rounded == 1) {
        if (sign > 0) {
          return "10" + unicode_superscript(String(e));
        } else {
          return "-10" + unicode_superscript(String(e));
        }
      } else {
        return String(sign * m_rounded) + "×10" + unicode_superscript(String(e));
      }
    } else {
      return String(d);
    }
  };
}

/**
 * Creates a formatter that stringifies its input.
 *
 * @returns {Formatter} A formatter that stringifies its input.
 */
export function identity() {
  return (d: any) => String(d);
}

/**
 * Creates a formatter for percentage values.
 * Multiplies the input by 100 and appends "%".
 *
 * @param {number} [precision] The number of decimal places to show (default 0).
 *
 * @returns {Formatter} A formatter for percentage values.
 */
export function percentage(precision = 0) {
  const fixedFormatter = fixed(precision);
  return (d: any) => {
    let valToFormat = d * 100;

    // Account for float imprecision
    const valString = d.toString();
    const integerPowerTen = Math.pow(10, valString.length - (valString.indexOf(".") + 1));
    valToFormat = parseInt((valToFormat * integerPowerTen).toString(), 10) / integerPowerTen;

    return fixedFormatter(valToFormat) + "%";
  };
}

/**
 * Creates a formatter for values that displays [numberOfSignificantFigures] significant figures
 * and puts SI notation.
 *
 * @param {number} [numberOfSignificantFigures] The number of significant figures to show (default 3).
 *
 * @returns {Formatter} A formatter for SI values.
 */
export function siSuffix(numberOfSignificantFigures = 3) {
  verifyPrecision(numberOfSignificantFigures);
  return (d: any) => d3.format("." + numberOfSignificantFigures + "s")(d);
}

/**
 * Creates a formatter for values that displays abbreviated values
 * and uses standard short scale suffixes
 * - K - thousands - 10 ^ 3
 * - M - millions - 10 ^ 6
 * - B - billions - 10 ^ 9
 * - T - trillions - 10 ^ 12
 * - Q - quadrillions - 10 ^ 15
 *
 * Numbers with a magnitude outside of (10 ^ (-precision), 10 ^ 15) are shown using
 * scientific notation to avoid creating extremely long decimal strings.
 *
 * @param {number} [precision] the number of decimal places to show (default 3)
 * @returns {Formatter} A formatter with short scale formatting
 */
export function shortScale(precision = 3) {
  verifyPrecision(precision);
  const suffixes = "KMBTQ";
  const exponentFormatter = d3.format("." + precision + "e");
  const fixedFormatter = d3.format("." + precision + "f");
  const max = Math.pow(10, (3 * (suffixes.length + 1)));
  const min = Math.pow(10, -precision);
  return (num: number) => {
    const absNum = Math.abs(num);
    if ((absNum < min || absNum >= max) && absNum !== 0) {
      return exponentFormatter(num);
    }
    let idx = -1;
    while (absNum >= Math.pow(1000, idx + 2) && idx < (suffixes.length - 1)) {
      idx++;
    }
    let output = "";
    if (idx === -1) {
      output = fixedFormatter(num);
    } else {
      output = fixedFormatter(num / Math.pow(1000, idx + 1)) + suffixes[idx];
    }
    // catch rounding by the underlying d3 formatter
    if ((num > 0 && output.substr(0, 4) === "1000") || (num < 0 && output.substr(0, 5) === "-1000")) {
      if (idx < suffixes.length - 1) {
        idx++;
        output = fixedFormatter(num / Math.pow(1000, idx + 1)) + suffixes[idx];
      } else {
        output = exponentFormatter(num);
      }
    }
    return output;
  };
}
/**
 * Creates a multi time formatter that displays dates.
 *
 * @returns {Formatter} A formatter for time/date values.
 */
export function multiTime() {
  // Formatter tiers going from shortest time scale to largest - these were taken from d3
  // https://github.com/mbostock/d3/wiki/Time-Formatting#format_multi
  const candidateFormats: IPredicatedFormat[] = [
    {
      specifier: ".%L",
      predicate: (d) => d.getMilliseconds() !== 0,
    },

    {
      specifier: ":%S",
      predicate: (d) => d.getSeconds() !== 0,
    },

    {
      specifier: "%I:%M",
      predicate: (d) => d.getMinutes() !== 0,
    },

    {
      specifier: "%I %p",
      predicate: (d) => d.getHours() !== 0,
    },

    {
      specifier: "%a %d",
      predicate: (d) => d.getDay() !== 0 && d.getDate() !== 1,
    },

    {
      specifier: "%b %d",
      predicate: (d) => d.getDate() !== 1,
    },

    {
      specifier: "%b",
      predicate: (d) => d.getMonth() !== 0,
    },
  ];

  return (d: any) => {
    const acceptableFormats = candidateFormats.filter((candidate) => candidate.predicate(d));
    const specifier = acceptableFormats.length > 0
      ? acceptableFormats[0].specifier
      : "%Y";

    return d3.timeFormat(specifier)(d);
  };
}

/**
 * Creates a time formatter that displays time/date using given specifier.
 *
 * List of directives can be found on: https://github.com/mbostock/d3/wiki/Time-Formatting#format
 *
 * @param {string} [specifier] The specifier for the formatter.
 * @param {boolean} [useUTC] Displays time in UTC if true, local time if false. Defaults to false.
 *
 * @returns {Formatter} A formatter for time/date values.
 */
export function time(specifier: string, useUTC: boolean = DEFAULT_USE_UTC): Formatter {
  if (useUTC) {
    return d3.utcFormat(specifier);
  }
  return d3.timeFormat(specifier);
}

function verifyPrecision(precision: number) {
  if (precision < 0 || precision > 20) {
    throw new RangeError("Formatter precision must be between 0 and 20");
  }

  if (precision !== Math.floor(precision)) {
    throw new RangeError("Formatter precision must be an integer");
  }
}
