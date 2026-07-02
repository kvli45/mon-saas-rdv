// État de contrôle partagé, piloté depuis le dashboard.
export const state = {
  scrapeOn: false, // session de scraping en cours (démarrée/arrêtée par l'utilisateur)
  paused: false,   // (réservé) pause globale
};
export const setScrape = (v) => { state.scrapeOn = !!v; };
export const scrapeOn = () => state.scrapeOn;
