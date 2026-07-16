/* ══════════════════════════════════════════════════════════════════════════
 * SERVICE WORKER — EVG Victor
 * Rend le jeu JOUABLE HORS CONNEXION (ex. dans l'avion).
 *
 * Principe : au premier chargement AVEC Internet, on met en cache la page,
 * toutes les images et tous les sons. Ensuite, hors connexion, tout est servi
 * depuis ce cache. Les DONNÉES du jeu (Google Sheet) sont, elles, mises en
 * cache côté page dans localStorage (voir index.html).
 *
 * IMPORTANT : ce fichier doit rester à la RACINE du site (même dossier que
 * index.html) pour couvrir tout le jeu. Bump la version du cache à chaque
 * changement d'assets pour forcer une remise en cache.
 * ════════════════════════════════════════════════════════════════════════ */
const CACHE = "evg-victor-v1";

// Base des assets telle que le jeu les demande (cf. BASE dans index.html).
const RAW = "https://raw.githubusercontent.com/pierrerugier/evg-victor/main/";

// Page + manifeste (même origine que le site hébergé).
const CORE = ["./", "./index.html", "./manifest.webmanifest"];

// Tous les fichiers images/sons du jeu (générés depuis le dépôt).
const ASSET_PATHS = [
  "ecrans/Antoine.jpg",
  "ecrans/Baptiste.jpg",
  "ecrans/Charles.jpg",
  "ecrans/Louis.jpg",
  "ecrans/Oscar.jpg",
  "ecrans/Paul.jpg",
  "ecrans/Victors-laoding.jpg",
  "ecrans/arthur.jpg",
  "ecrans/beugnon.jpg",
  "ecrans/drag.jpg",
  "ecrans/fin-faro.jpg",
  "ecrans/finkie.jpg",
  "ecrans/hall.jpg",
  "ecrans/intro1.jpg",
  "ecrans/inventaire.png",
  "ecrans/iphone.png",
  "ecrans/jeffrey.jpg",
  "ecrans/kupi.jpg",
  "ecrans/lambert.jpg",
  "ecrans/magazine1.jpg",
  "ecrans/magazine10.jpg",
  "ecrans/magazine11.jpg",
  "ecrans/magazine2.jpg",
  "ecrans/magazine3.jpg",
  "ecrans/magazine4.jpg",
  "ecrans/magazine5.jpg",
  "ecrans/magazine6.jpg",
  "ecrans/magazine7.jpg",
  "ecrans/magazine8.jpg",
  "ecrans/magazine9.jpg",
  "ecrans/magazinecover.jpg",
  "ecrans/match.png",
  "ecrans/montreschoix.jpg",
  "ecrans/oscarbis.jpg",
  "ecrans/pierre.jpg",
  "ecrans/praud.jpg",
  "ecrans/pubkorpus.jpg",
  "ecrans/pullupbase.jpg",
  "ecrans/restroom-choice.jpg",
  "ecrans/rolex.jpg",
  "ecrans/tindergirl1.png",
  "ecrans/tindergirl2.png",
  "ecrans/tindergirl3.png",
  "ecrans/tindergirl4.png",
  "ecrans/tindergirl5.png",
  "ecrans/tindergirl6.png",
  "ecrans/toilette-50K.jpg",
  "ecrans/toilette-shortbernardini.jpg",
  "ecrans/victor-bodypullup.jpg",
  "ecrans/victor-bodypullup.png",
  "ecrans/victordetendu.jpg",
  "icons/50Kdollars.png",
  "icons/GMT.png",
  "icons/app-icon.png",
  "icons/avion.png",
  "icons/chargement.png",
  "icons/daytona.png",
  "icons/inventaire-icon.png",
  "icons/inventaire.png",
  "icons/meuge.png",
  "icons/milgauss.png",
  "icons/passeport.png",
  "icons/photolaura.png",
  "icons/putter.png",
  "icons/rolex.png",
  "icons/shortbernardini.png",
  "icons/ticket.png",
  "icons/tshirt.png",
  "icons/valise.png",
  "son/ambiance-hall.mp3",
  "son/ambiancecharles.mp3",
  "son/antoine.mp3",
  "son/arthur.mp3",
  "son/baptiste.mp3",
  "son/cess.mp3",
  "son/charles.mp3",
  "son/culte.mp3",
  "son/doorclose.mp3",
  "son/dooropen.mp3",
  "son/exterieur.mp3",
  "son/finjeu.mp3",
  "son/intro.mp3",
  "son/kupi.mp3",
  "son/lambert.mp3",
  "son/launch.mp3",
  "son/louis.mp3",
  "son/match.mp3",
  "son/oscar.mp3",
  "son/page.mp3",
  "son/paul.mp3",
  "son/paul1.mp3",
  "son/paul2.mp3",
  "son/paul3.mp3",
  "son/pierre.mp3",
  "son/rolex.mp3",
  "son/shortpet.mp3"
];
const ASSETS = ASSET_PATHS.map(p => RAW + p);

// — Installation : on précharge tout, de façon résiliente (un fichier qui échoue
//   ne bloque pas les autres). skipWaiting pour activer la nouvelle version vite.
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(CORE.map((u) => cache.add(u).catch(() => {})));
    await Promise.allSettled(ASSETS.map(async (u) => {
      try {
        // fetch par défaut = mode "cors" ; raw.githubusercontent renvoie les
        // en-têtes CORS, donc la réponse est complète (non opaque) et réutilisable
        // (y compris par Web Audio pour les sons à réverb).
        let res = await fetch(u, { cache: "no-cache" });
        if (!res || (res.status !== 200 && res.status !== 0)) {
          // repli en no-cors (réponse opaque, suffisante pour <img>/<audio>).
          res = await fetch(new Request(u, { mode: "no-cors" }));
        }
        if (res && (res.status === 200 || res.status === 0)) await cache.put(u, res.clone());
      } catch (_) {}
    }));
  })());
});

// — Activation : purge des anciens caches + prise de contrôle immédiate.
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// — Interception des requêtes.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // On NE touche PAS au Google Apps Script : la page gère elle-même son repli
  // hors-ligne via localStorage (sinon le "?v=timestamp" casserait le cache).
  if (url.hostname.includes("script.google") || url.hostname.includes("googleusercontent.com")) return;

  // Navigation (ouverture de la page) → réseau, puis repli sur l'index en cache.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("./index.html", net.clone()).catch(() => {});
        return net;
      } catch (_) {
        const cache = await caches.open(CACHE);
        return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
      }
    })());
    return;
  }

  // Autres GET (images, sons, police, icône…) : cache d'abord, sinon réseau
  // (et on met en cache au passage). Le cache.match par URL ignore l'en-tête
  // Range, donc un <audio> qui demande une plage reçoit la réponse complète
  // mise en cache — ce que les navigateurs acceptent.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreVary: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      // On ne met en cache que les réponses complètes (200) ou opaques (0),
      // jamais les 206 partielles (que le Cache API refuse).
      if (res && (res.status === 200 || res.status === 0)) cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (_) {
      // Dernier recours : tenter une correspondance en ignorant la query (?v=…).
      const alt = await cache.match(url.origin + url.pathname, { ignoreVary: true });
      return alt || Response.error();
    }
  })());
});
