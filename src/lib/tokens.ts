export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function roundedThousands(value: number): number {
  return Math.round((value / 1000) * 2) / 2;
}

/** Prefix before the token count: `<` when under 1k (same role as ≈ for rounded k display). */
export function tokenCountPrefixSymbol(value: number): "≈" | "<" {
  return roundedThousands(value) < 1 ? "<" : "≈";
}

export function formatTokenCount(value: number): string {
  const k = roundedThousands(value);

  if (k < 1) {
    return "1k";
  }

  return `${k.toFixed(k % 1 === 0 ? 0 : 1)}k`;
}
