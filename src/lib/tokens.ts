import { Tiktoken } from "js-tiktoken/lite";
import o200kBase from "js-tiktoken/ranks/o200k_base";

export const TOKEN_ENCODING_NAME = "o200k_base";

const encoder = new Tiktoken(o200kBase);

export function countTokens(text: string): number {
  return encoder.encode(text).length;
}
