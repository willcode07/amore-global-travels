import type { TravelProposal } from "@/lib/types";
import { isUsableImageUrl } from "@/lib/quote-media";

type MoneyUnknownReason = "blank" | "placeholder" | "invalid";

type ParsedMoney = {
  value: number | null;
  currency: string | null;
  reason?: MoneyUnknownReason;
  raw: string;
};

const PLACEHOLDER_MONEY =
  /^(?:tbd|tba|n\/?a|na|unknown|pending|quoted?\s+on\s+request|on\s+request|to\s+be\s+(?:determined|confirmed|quoted)|contact\s+(?:us|for\s+(?:a\s+)?quote))$/i;
const PLACEHOLDER_TEXT =
  /^(?:tbd|tba|n\/?a|na|unknown|none|not\s+(?:set|available)|to\s+be\s+(?:confirmed|determined)|your\s+(?:destination|trip)|destination|dates?|travelers?)$/i;
const CURRENCY_CODES = "USD|CAD|AUD|EUR|GBP|MXN|JPY|NZD";
const MONEY_PATTERN = new RegExp(
  `^([+-]?)\\s*(?:(${CURRENCY_CODES})\\s*)?([$€£¥])?\\s*(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.(\\d{1,2}))?\\s*(?:(${CURRENCY_CODES}))?\\s*(?:total)?$`,
  "i",
);

export type QuoteQualityField =
  | "occasionTitle"
  | "destinationLabel"
  | "dates"
  | "nights"
  | "travelersLabel"
  | "route"
  | "resortName"
  | "resortImageUrl"
  | "roomType"
  | "roomDetails"
  | "amenities"
  | "investmentLines"
  | "investmentTotal"
  | "cancellation"
  | "flyerUrl"
  | "flightRoute"
  | "flightTiers"
  | "recommendedFlightId"
  | "recommendedFlightTotal"
  | "enhancements"
  | "protectionProvider"
  | "protectionTiers"
  | "protectionUpgrade"
  | "notes"
  | "thankYou"
  | "researchEvidence"
  | `researchEvidence.${string}`;

export type QuoteQualityIssue = {
  code: string;
  field: QuoteQualityField;
  message: string;
  relatedFields?: QuoteQualityField[];
};

export type QuoteQualityAutoFix = {
  id: "recalculate-investment-total";
  field: "investmentTotal";
  label: string;
  patch: Pick<TravelProposal, "investmentTotal">;
};

export type QuoteQualityResult = {
  errors: QuoteQualityIssue[];
  warnings: QuoteQualityIssue[];
  autoFixes: QuoteQualityAutoFix[];
  canPublish: boolean;
  isFullQuote: boolean;
};

function parseMoneyDetails(input: unknown): ParsedMoney {
  if (typeof input === "number") {
    return Number.isFinite(input)
      ? { value: input, currency: null, raw: String(input) }
      : { value: null, currency: null, reason: "invalid", raw: String(input) };
  }

  if (typeof input !== "string") {
    return { value: null, currency: null, reason: "invalid", raw: "" };
  }

  const raw = input.replace(/\u00a0/g, " ").trim();
  if (!raw) return { value: null, currency: null, reason: "blank", raw };
  if (PLACEHOLDER_MONEY.test(raw)) {
    return { value: null, currency: null, reason: "placeholder", raw };
  }

  const match = raw.match(MONEY_PATTERN);
  if (!match) return { value: null, currency: null, reason: "invalid", raw };

  const [, sign, leadingCode, symbol, whole, decimal, trailingCode] = match;
  const value = Number(`${sign}${whole.replace(/,/g, "")}.${decimal ?? "0"}`);
  if (!Number.isFinite(value)) {
    return { value: null, currency: null, reason: "invalid", raw };
  }

  const currencyCode = (leadingCode || trailingCode)?.toUpperCase();
  const currency =
    currencyCode ??
    (symbol === "$"
      ? "USD"
      : symbol === "€"
        ? "EUR"
        : symbol === "£"
          ? "GBP"
          : symbol === "¥"
            ? "JPY"
            : null);

  return { value, currency, raw };
}

/**
 * Parses a common money string. A `null` result means the value is unknown,
 * intentionally deferred, blank, or not a numeric amount.
 */
export function parseMoney(input: unknown): number | null {
  return parseMoneyDetails(input).value;
}

function hasText(value: string | undefined | null) {
  return Boolean(value?.trim());
}

function hasRequiredText(value: string | undefined | null) {
  const text = value?.trim() ?? "";
  return Boolean(text) && !PLACEHOLDER_TEXT.test(text);
}

function issue(
  code: string,
  field: QuoteQualityField,
  message: string,
  relatedFields?: QuoteQualityField[],
): QuoteQualityIssue {
  return {
    code,
    field,
    message,
    ...(relatedFields?.length ? { relatedFields } : {}),
  };
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function hasMixedCurrencies(values: ParsedMoney[]) {
  const currencies = new Set(
    values.flatMap((value) => (value.value === null || !value.currency ? [] : [value.currency])),
  );
  return currencies.size > 1;
}

function formatCalculatedTotal(cents: number, examples: string[]) {
  const formatted = (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const source = examples.find(hasText) ?? "";
  const code = source.match(new RegExp(`\\b(${CURRENCY_CODES})\\b`, "i"))?.[1]?.toUpperCase();

  if (code) return `${code} ${formatted}`;
  if (source.includes("€")) return `€${formatted}`;
  if (source.includes("£")) return `£${formatted}`;
  if (source.includes("¥")) return `¥${formatted}`;
  return `$${formatted}`;
}

function hasEmbeddedPrice(value: string) {
  if (parseMoney(value) !== null) return true;

  const candidates =
    value.match(
      new RegExp(
        `(?:[+-]?\\s*(?:${CURRENCY_CODES})?\\s*[$€£¥]?\\s*(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?\\s*(?:${CURRENCY_CODES})?)`,
        "gi",
      ),
    ) ?? [];

  return candidates.some((candidate) => parseMoney(candidate.trim()) !== null);
}

function hasFlightDetails(features: string[] | undefined) {
  return (features ?? []).some((feature) => {
    const value = feature.trim();
    return hasRequiredText(value) && !/\b(?:tbd|tba|to be confirmed|unknown)\b/i.test(value);
  });
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function researchField(id: string, field?: string): QuoteQualityField {
  return `researchEvidence.${id}${field ? `.${field}` : ""}`;
}

export function calculatedStayTotal(quote: TravelProposal) {
  const rows = (quote.investmentLines ?? []).filter(
    (line) => hasText(line.label) || hasText(line.amount),
  );
  if (rows.length === 0) return null;
  const parsed = rows.map((line) => parseMoneyDetails(line.amount));
  if (parsed.some((item) => item.value === null)) return null;
  if (hasMixedCurrencies(parsed)) return null;
  const cents = parsed.reduce((total, line) => total + toCents(line.value ?? 0), 0);
  return formatCalculatedTotal(
    cents,
    parsed.map((line) => line.raw),
  );
}

/**
 * Evaluates a proposal without changing it. `autoFixes` only contains a
 * calculated investment-total patch when every visible investment line is known.
 */
export function evaluateQuoteQuality(quote: TravelProposal): QuoteQualityResult {
  const errors: QuoteQualityIssue[] = [];
  const warnings: QuoteQualityIssue[] = [];
  const autoFixes: QuoteQualityAutoFix[] = [];
  const flyerUrl = quote.flyerUrl?.trim() ?? "";
  const pdfUrl = quote.pdfUrl?.trim() ?? "";
  const hasMedia = Boolean(flyerUrl || pdfUrl);
  const hasProperty = hasRequiredText(quote.resortName);
  const isMediaQuote = quote.quoteKind === "media" || (hasMedia && !hasProperty);
  const isFullQuote = !isMediaQuote;
  const evidence = quote.researchEvidence ?? [];

  const requiredBasics: Array<[QuoteQualityField, string, string]> = [
    ["occasionTitle", quote.occasionTitle, "Add a quote headline."],
    ["destinationLabel", quote.destinationLabel, "Add the destination shown to the traveler."],
    ["dates", quote.dates, "Add the travel dates."],
    ["travelersLabel", quote.travelersLabel, "Add the traveler or party label."],
  ];

  requiredBasics.forEach(([field, value, message]) => {
    if (!hasRequiredText(value)) errors.push(issue(`${field}-required`, field, message));
  });

  if (!hasProperty && !hasMedia) {
    errors.push(
      issue(
        isMediaQuote ? "flyer-required" : "property-or-flyer-required",
        isMediaQuote ? "flyerUrl" : "resortName",
        isMediaQuote
          ? "Attach a Canva, PDF, or image flyer before sending."
          : "Add a property or ship, or attach a media/flyer quote.",
        isMediaQuote ? ["flyerUrl"] : ["flyerUrl"],
      ),
    );
  }

  const approvedEvidence = evidence.filter((item) => item.status === "approved");
  const recordResearch = Boolean(quote.recordResearch);
  if (recordResearch) {
    evidence.forEach((item, index) => {
    const prefix = researchField(item.id);
    if (!hasRequiredText(item.supplier)) {
      errors.push(
        issue(
          "research-supplier-required",
          researchField(item.id, "supplier"),
          `Research entry ${index + 1} needs a supplier, property, or airline.`,
          [prefix],
        ),
      );
    }
    if (!hasRequiredText(item.description)) {
      errors.push(
        issue(
          "research-description-required",
          researchField(item.id, "description"),
          `Research entry ${index + 1} needs the option details.`,
          [prefix],
        ),
      );
    }
    if (parseMoney(item.amount) === null) {
      errors.push(
        issue(
          "research-amount-required",
          researchField(item.id, "amount"),
          `Research entry ${index + 1} needs a known observed amount.`,
          [prefix],
        ),
      );
    }
    if (!hasRequiredText(item.currency)) {
      errors.push(
        issue(
          "research-currency-required",
          researchField(item.id, "currency"),
          `Research entry ${index + 1} needs a currency.`,
          [prefix],
        ),
      );
    }
    if (!hasRequiredText(item.priceBasis)) {
      errors.push(
        issue(
          "research-price-basis-required",
          researchField(item.id, "priceBasis"),
          `Research entry ${index + 1} needs a party or unit price basis.`,
          [prefix],
        ),
      );
    }
    if (!isHttpUrl(item.sourceUrl.trim())) {
      errors.push(
        issue(
          "research-source-required",
          researchField(item.id, "sourceUrl"),
          `Research entry ${index + 1} needs an http(s) source URL.`,
          [prefix],
        ),
      );
    }
    if (!isIsoDate(item.observedAt.trim())) {
      errors.push(
        issue(
          "research-observed-date-required",
          researchField(item.id, "observedAt"),
          `Research entry ${index + 1} needs the date it was observed.`,
          [prefix],
        ),
      );
    }
    if (!hasRequiredText(item.terms)) {
      errors.push(
        issue(
          "research-terms-required",
          researchField(item.id, "terms"),
          `Research entry ${index + 1} needs relevant terms or availability notes.`,
          [prefix],
        ),
      );
    }
    if (item.status !== "approved") {
      errors.push(
        issue(
          "research-approval-required",
          prefix,
          `Research entry ${index + 1} is preliminary until an agent verifies it.`,
        ),
      );
    }
  });

  if (isFullQuote && !approvedEvidence.some((item) => item.kind === "stay" || item.kind === "cruise")) {
    errors.push(
      issue(
        "stay-research-required",
        "researchEvidence",
        "Add approved stay or cruise research before sending a full quote.",
      ),
    );
  }
  if (quote.includeFlights && !approvedEvidence.some((item) => item.kind === "flight")) {
    errors.push(
      issue(
        "flight-research-required",
        "researchEvidence",
        "Add approved flight research for the included flight option.",
        ["flightTiers"],
      ),
    );
  }
  if (
    quote.enhancements.some(
      (item) => hasRequiredText(item.name) && /rental\s*car/i.test(item.name),
    ) &&
    !approvedEvidence.some((item) => item.kind === "rental_car")
  ) {
    errors.push(
      issue(
        "rental-research-required",
        "researchEvidence",
        "Add approved rental-car research for the named rental option.",
        ["enhancements"],
      ),
    );
  }
  }

  const investmentLines = quote.investmentLines ?? [];
  const investmentRows = investmentLines.filter(
    (line) => hasText(line.label) || hasText(line.amount),
  );
  const investmentTotal = parseMoneyDetails(quote.investmentTotal);

  if (isFullQuote) {
    if (investmentRows.length === 0) {
      errors.push(
        issue(
          "investment-lines-required",
          "investmentLines",
          "Add at least one priced investment line for a full quote.",
        ),
      );
    }

    const parsedInvestmentLines: ParsedMoney[] = [];
    let allInvestmentLinesKnown = investmentRows.length > 0;

    investmentRows.forEach((line, index) => {
      const hasLabel = hasRequiredText(line.label);
      const amount = parseMoneyDetails(line.amount);

      if (!hasLabel) {
        errors.push(
          issue(
            "investment-line-label-required",
            "investmentLines",
            `Investment line ${index + 1} needs a label.`,
          ),
        );
        allInvestmentLinesKnown = false;
      }
      if (amount.value === null) {
        errors.push(
          issue(
            "investment-line-amount-required",
            "investmentLines",
            `Investment line ${index + 1} needs a known amount.`,
          ),
        );
        allInvestmentLinesKnown = false;
      } else {
        parsedInvestmentLines.push(amount);
      }
    });

    if (investmentTotal.value === null) {
      errors.push(
        issue(
          "investment-total-required",
          "investmentTotal",
          "Add a known total stay cost for this full quote.",
        ),
      );
    }

    const investmentValuesForVerification =
      investmentTotal.value === null
        ? parsedInvestmentLines
        : [...parsedInvestmentLines, investmentTotal];

    if (allInvestmentLinesKnown && !hasMixedCurrencies(investmentValuesForVerification)) {
      const calculatedCents = parsedInvestmentLines.reduce(
        (total, line) => total + toCents(line.value ?? 0),
        0,
      );
      const totalMatches =
        investmentTotal.value !== null && toCents(investmentTotal.value) === calculatedCents;

      if (!totalMatches) {
        if (investmentTotal.value !== null) {
          errors.push(
            issue(
              "investment-total-mismatch",
              "investmentTotal",
              "The total stay cost does not equal the sum of the investment lines.",
              ["investmentLines"],
            ),
          );
        }

        const calculatedTotal = formatCalculatedTotal(
          calculatedCents,
          parsedInvestmentLines.map((line) => line.raw),
        );
        autoFixes.push({
          id: "recalculate-investment-total",
          field: "investmentTotal",
          label: `Set total stay cost to ${calculatedTotal}`,
          patch: { investmentTotal: calculatedTotal },
        });
      }
    } else if (allInvestmentLinesKnown && hasMixedCurrencies(investmentValuesForVerification)) {
      errors.push(
        issue(
          "investment-currency-mismatch",
          "investmentTotal",
          "Investment lines and total use different currencies, so the total cannot be verified.",
          ["investmentLines"],
        ),
      );
    }
  } else if (investmentTotal.value === null) {
    errors.push(
      issue(
        "flyer-total-required",
        "investmentTotal",
        "Enter the known total shown in the attached media before sending it.",
        ["flyerUrl"],
      ),
    );
  }

  if (quote.includeFlights) {
    if (!hasRequiredText(quote.flightRoute)) {
      errors.push(issue("flight-route-required", "flightRoute", "Add the flight route."));
    }

    const flightTiers = quote.flightTiers ?? [];
    const populatedFlightTiers = flightTiers.filter(
      (tier) =>
        hasText(tier.name) ||
        hasText(tier.price) ||
        (tier.features ?? []).some((feature) => hasText(feature)),
    );

    if (populatedFlightTiers.length === 0) {
      errors.push(
        issue("flight-tier-required", "flightTiers", "Add at least one priced flight option."),
      );
    }

    populatedFlightTiers.forEach((tier, index) => {
      if (!hasRequiredText(tier.name)) {
        errors.push(
          issue(
            "flight-tier-name-required",
            "flightTiers",
            `Flight option ${index + 1} needs a name.`,
          ),
        );
      }
      if (parseMoney(tier.price) === null) {
        errors.push(
          issue(
            "flight-tier-price-required",
            "flightTiers",
            `Flight option ${index + 1} needs a known price.`,
          ),
        );
      }
      if (!hasFlightDetails(tier.features)) {
        errors.push(
          issue(
            "flight-tier-details-required",
            "flightTiers",
            `Flight option ${index + 1} needs airline, timing, or fare details.`,
          ),
        );
      }
    });

    const recommendedTier = flightTiers.find((tier) => tier.id === quote.recommendedFlightId);
    if (!hasText(quote.recommendedFlightId) || !recommendedTier) {
      errors.push(
        issue(
          "recommended-flight-required",
          "recommendedFlightId",
          "Choose the flight option recommended for this party.",
          ["flightTiers"],
        ),
      );
    }

    const recommendedTotal = parseMoneyDetails(quote.recommendedFlightTotal);
    if (recommendedTotal.value === null) {
      errors.push(
        issue(
          "recommended-flight-total-required",
          "recommendedFlightTotal",
          "Add the recommended flight total.",
        ),
      );
    }

    if (recommendedTier && recommendedTotal.value !== null) {
      const selectedPrice = parseMoneyDetails(recommendedTier.price);
      if (selectedPrice.value !== null && hasMixedCurrencies([selectedPrice, recommendedTotal])) {
        errors.push(
          issue(
            "recommended-flight-currency-mismatch",
            "recommendedFlightTotal",
            "The recommended flight total uses a different currency than the selected option.",
            ["recommendedFlightId", "flightTiers"],
          ),
        );
      } else if (
        selectedPrice.value !== null &&
        toCents(selectedPrice.value) !== toCents(recommendedTotal.value)
      ) {
        errors.push(
          issue(
            "recommended-flight-total-mismatch",
            "recommendedFlightTotal",
            "The recommended flight total does not match the selected flight option.",
            ["recommendedFlightId", "flightTiers"],
          ),
        );
      }
    }

  }

  const enhancements = quote.enhancements ?? [];
  enhancements.forEach((enhancement, index) => {
    if (hasText(enhancement.name) && parseMoney(enhancement.price) === null) {
      errors.push(
        issue(
          "enhancement-price-required",
          "enhancements",
          `Enhancement ${index + 1} is named but has no known price.`,
        ),
      );
    } else if (!hasText(enhancement.name) && hasText(enhancement.price)) {
      warnings.push(
        issue(
          "enhancement-name-missing",
          "enhancements",
          `Enhancement ${index + 1} has a price but no name.`,
        ),
      );
    }
  });

  if (quote.includeProtection) {
    const protectionTiers = quote.protectionTiers ?? [];
    const populatedProtectionTiers = protectionTiers.filter(
      (tier) =>
        hasText(tier.name) ||
        hasText(tier.price) ||
        (tier.features ?? []).some((feature) => hasText(feature)),
    );

    if (populatedProtectionTiers.length === 0) {
      errors.push(
        issue(
          "protection-tier-required",
          "protectionTiers",
          "Add at least one priced travel-protection option.",
        ),
      );
    }

    populatedProtectionTiers.forEach((tier, index) => {
      if (!hasRequiredText(tier.name)) {
        errors.push(
          issue(
            "protection-tier-name-required",
            "protectionTiers",
            `Protection option ${index + 1} needs a name.`,
          ),
        );
      }
      if (parseMoney(tier.price) === null) {
        errors.push(
          issue(
            "protection-tier-price-required",
            "protectionTiers",
            `Protection option ${index + 1} needs a known price.`,
          ),
        );
      }
    });

    if (hasText(quote.protectionUpgrade) && !hasEmbeddedPrice(quote.protectionUpgrade)) {
      errors.push(
        issue(
          "protection-upgrade-price-required",
          "protectionUpgrade",
          "The named protection upgrade needs a known price.",
        ),
      );
    }

    if (!hasRequiredText(quote.protectionProvider)) {
      warnings.push(
        issue(
          "protection-provider-missing",
          "protectionProvider",
          "Add the protection provider so the traveler knows who offers the coverage.",
        ),
      );
    }
  }

  if (isFullQuote && !hasRequiredText(quote.nights)) {
    warnings.push(issue("nights-required", "nights", "Add the number of nights if you know them."));
  }
  if (isFullQuote && !hasRequiredText(quote.route)) {
    warnings.push(issue("route-required", "route", "Add the route or departure city if you know it."));
  }
  if (isFullQuote && !hasRequiredText(quote.roomType)) {
    errors.push(issue("room-type-required", "roomType", "Add the room or cabin type."));
  }
  if (isFullQuote && !hasRequiredText(quote.roomDetails)) {
    warnings.push(
      issue("room-details-missing", "roomDetails", "A few room or cabin details help the traveler."),
    );
  }
  if (hasText(quote.resortImageUrl) && !isUsableImageUrl(quote.resortImageUrl)) {
    errors.push(
      issue(
        "property-image-invalid",
        "resortImageUrl",
        "That photo URL does not look like an image. Use a https:// link that ends in .jpg, .png, or .webp — or leave it blank.",
      ),
    );
  }
  if (isFullQuote && !hasMedia && !hasText(quote.resortImageUrl)) {
    warnings.push(
      issue(
        "property-image-missing",
        "resortImageUrl",
        "Add a property photo URL, or send without a photo.",
        ["flyerUrl"],
      ),
    );
  }
  if ((quote.amenities ?? []).filter((amenity) => hasText(amenity)).length === 0) {
    warnings.push(issue("amenities-missing", "amenities", "Add a few stay amenities or highlights."));
  }
  if (isFullQuote && !hasRequiredText(quote.cancellation)) {
    errors.push(
      issue(
        "cancellation-required",
        "cancellation",
        "Add cancellation or refund guidance.",
      ),
    );
  }
  if ((quote.notes ?? []).filter((note) => hasRequiredText(note)).length === 0) {
    errors.push(issue("notes-required", "notes", "Add an important traveler-facing note."));
  }
  if (!hasRequiredText(quote.thankYou)) {
    errors.push(issue("thank-you-required", "thankYou", "Add a closing message for the traveler."));
  }

  return {
    errors,
    warnings,
    autoFixes,
    canPublish: errors.length === 0,
    isFullQuote,
  };
}
