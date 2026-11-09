/**
 * Central directions and units of the Direction Générale de la Police Nationale, as listed by the decree
 * N° 0572/PT/PM/MSPI/2023 of 11 April 2023 (articles 24 to 42). Official source only: nothing here is invented.
 * The organisation below the directions (sub-directions, services) and the commissariats is fixed by a ministerial
 * arrêté (article 91) that has not been supplied yet, so it is not modelled here; administrators create it from the organisation screen.
 */
export const DGPN_ROOT = { code: "DGPN", name: "Direction Générale de la Police Nationale" } as const;

export type CentralDirectionDef = { code: string; abbreviation: string; name: string; article: number };

export const CENTRAL_DIRECTIONS: readonly CentralDirectionDef[] = [
  { code: "DGPN-DSP", abbreviation: "DSP", name: "Direction de la Sécurité publique", article: 25 },
  { code: "DGPN-DLGDEAM", abbreviation: "DLGDEAM", name: "Direction de lutte contre le grand banditisme, de la délinquance économique et des atteintes aux mœurs", article: 27 },
  { code: "DGPN-DPTSCI", abbreviation: "DPTSCI", name: "Direction de la police technique scientifique et de l'identité civile", article: 29 },
  { code: "DGPN-DIE", abbreviation: "DIE", name: "Direction de l'immigration et de l'émigration", article: 31 },
  { code: "DGPN-DRHM", abbreviation: "DRHM", name: "Direction des ressources humaines et du matériel", article: 33 },
  { code: "DGPN-DITT", abbreviation: "DITT", name: "Direction de l'informatique, des traces technologiques et des transmissions", article: 37 },
  { code: "DGPN-DLS", abbreviation: "DLS", name: "Direction de lutte contre les stupéfiants", article: 40 },
  { code: "DGPN-DSPSM", abbreviation: "DSPSM", name: "Direction de la santé, de la promotion des sports et de la musique", article: 42 },
  { code: "DGPN-DBCNIP", abbreviation: "DBCN-IP", name: "Direction du bureau central national Interpol", article: 39 },
  { code: "DGPN-DENP", abbreviation: "DENP", name: "Direction de l'École nationale de police", article: 35 },
  { code: "DGPN-GMIP", abbreviation: "GMIP", name: "Groupement mobile d'intervention de police", article: 24 },
  { code: "DGPN-GSR", abbreviation: "GSR", name: "Groupement de la sécurité et de la réglementation routière", article: 24 },
  { code: "DGPN-USIP", abbreviation: "USIP", name: "Unité spéciale d'intervention de police", article: 24 },
  { code: "DGPN-UNILT", abbreviation: "UNILT", name: "Unité nationale d'investigations et de lutte contre le terrorisme", article: 24 },
];
