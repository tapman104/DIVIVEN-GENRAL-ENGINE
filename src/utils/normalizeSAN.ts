/**
 * Normalizes a SAN string to a standard format.
 * Fixes common typos like 0-0 instead of O-O, removes e.p.,
 * and cleans up annotations leaving over + and #.
 */
export function normalizeSAN(san: string): string {
    return san
        .replace(/0-0-0/g, "O-O-O")
        .replace(/0-0/g, "O-O")
        .replace(/e\.p\./g, "")
        .replace(/[!?+#]+$/g, match => match.replace(/[!?]/g, '')) // keep +# only
        .trim();
}
