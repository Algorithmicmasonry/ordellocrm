export type TokenPackId = "pack_50" | "pack_150" | "pack_500";

export const TOKEN_PACKS: Record<
  TokenPackId,
  { tokens: number; amount: number; label: string; perMin: string }
> = {
  pack_50: { tokens: 50, amount: 900000, label: "Starter", perMin: "₦180/min" },
  pack_150: { tokens: 150, amount: 2500000, label: "Standard", perMin: "₦167/min" },
  pack_500: { tokens: 500, amount: 7500000, label: "Pro", perMin: "₦150/min" },
};
