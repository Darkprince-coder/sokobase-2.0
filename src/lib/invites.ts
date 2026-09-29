import { randomInt } from "node:crypto";

// No 0/O, 1/I/L so codes are easy to read out or type from WhatsApp.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export const generateInviteCode = () => `${part()}-${part()}`;
