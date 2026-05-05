export type StickerCycle = 0 | 1 | 2 | 3;

export type TeamDef = {
  name: string;
  code: string;
};

export type GroupDef = {
  name: string;
  teams: TeamDef[];
};

export const specialSections = [
  { title: "FWC Especiais", codes: ["FWC1", "FWC2", "FWC3", "FWC4", "FWC5"] },
  { title: "FWC Bola e Paises", codes: ["FWC6", "FWC7", "FWC8", "FWC9"] },
  {
    title: "FWC Historia",
    codes: ["FWC10", "FWC11", "FWC12", "FWC13", "FWC14", "FWC15", "FWC16", "FWC17", "FWC18", "FWC19", "FWC20"],
  },
] as const;

export const groups: GroupDef[] = [
  { name: "Grupo A", teams: [{ name: "Mexico", code: "MEX" }, { name: "Africa do Sul", code: "RSA" }, { name: "Coreia do Sul", code: "KOR" }, { name: "Tchequia", code: "CZE" }] },
  { name: "Grupo B", teams: [{ name: "Canada", code: "CAN" }, { name: "Bosnia e Herzegovina", code: "BIH" }, { name: "Catar", code: "QAT" }, { name: "Suica", code: "SUI" }] },
  { name: "Grupo C", teams: [{ name: "Brasil", code: "BRA" }, { name: "Marrocos", code: "MAR" }, { name: "Haiti", code: "HAI" }, { name: "Escocia", code: "SCO" }] },
  { name: "Grupo D", teams: [{ name: "Estados Unidos", code: "USA" }, { name: "Paraguai", code: "PAR" }, { name: "Australia", code: "AUS" }, { name: "Turquia", code: "TUR" }] },
  { name: "Grupo E", teams: [{ name: "Alemanha", code: "GER" }, { name: "Curacao", code: "CUW" }, { name: "Costa do Marfim", code: "CIV" }, { name: "Equador", code: "ECU" }] },
  { name: "Grupo F", teams: [{ name: "Holanda", code: "NED" }, { name: "Japao", code: "JPN" }, { name: "Suecia", code: "SWE" }, { name: "Tunisia", code: "TUN" }] },
  { name: "Grupo G", teams: [{ name: "Belgica", code: "BEL" }, { name: "Egito", code: "EGY" }, { name: "Ira", code: "IRN" }, { name: "Nova Zelandia", code: "NZL" }] },
  { name: "Grupo H", teams: [{ name: "Espanha", code: "ESP" }, { name: "Cabo Verde", code: "CPV" }, { name: "Arabia Saudita", code: "KSA" }, { name: "Uruguai", code: "URU" }] },
  { name: "Grupo I", teams: [{ name: "Franca", code: "FRA" }, { name: "Senegal", code: "SEN" }, { name: "Iraque", code: "IRQ" }, { name: "Noruega", code: "NOR" }] },
  { name: "Grupo J", teams: [{ name: "Argentina", code: "ARG" }, { name: "Argelia", code: "ALG" }, { name: "Austria", code: "AUT" }, { name: "Jordania", code: "JOR" }] },
  { name: "Grupo K", teams: [{ name: "Portugal", code: "POR" }, { name: "Congo DR", code: "COD" }, { name: "Uzbequistao", code: "UZB" }, { name: "Colombia", code: "COL" }] },
  { name: "Grupo L", teams: [{ name: "Inglaterra", code: "ENG" }, { name: "Croacia", code: "CRO" }, { name: "Gana", code: "GHA" }, { name: "Panama", code: "PAN" }] },
];
