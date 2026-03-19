export const TOKEN_ENCODING_NAME = "o200k_base";

export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatTokenCount(value: number): string {
  const roundedThousands = Math.round((value / 1000) * 2) / 2;

  if (roundedThousands < 1) {
    return "< 1k";
  }

  return `${roundedThousands.toFixed(roundedThousands % 1 === 0 ? 0 : 1)}k`;
}
