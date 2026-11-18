# Roomly

Application mobile pour colocataires : répartition des tâches ménagères,
historique des dépenses partagées, calendrier commun, comptes et gestion
d'appartement.

> **État actuel : squelette visuel.** Toute la navigation et tous les
> écrans existent avec un design complet et des données d'exemple, mais
> aucune fonctionnalité réelle n'est encore branchée (pas de backend, pas
> de vraie authentification, rien n'est sauvegardé). Voir
> [CLAUDE.md](./CLAUDE.md) pour le détail de l'architecture et des choix
> techniques.

## Prérequis

- **Node.js** version 20 ou plus récente ([nodejs.org](https://nodejs.org))
- **npm** (installé avec Node.js)
- Un téléphone avec l'app **Expo Go** installée ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) — c'est le moyen le plus simple de tester l'app, **ou** un émulateur Android (Android Studio) — **ou** simplement un navigateur web, aucune installation supplémentaire requise.

Vérifier que Node est bien installé :

```bash
node -v
npm -v
```

## Installation

Depuis le dossier du projet :

```bash
npm install
```

## Lancer l'application

```bash
npx expo start
```

Cette commande démarre le serveur de développement (Metro) et affiche un
QR code dans le terminal, ainsi qu'un menu avec plusieurs options :

### Option 1 — Sur votre téléphone (recommandé, le plus rapide)

1. Ouvrez l'app **Expo Go** sur votre téléphone.
2. Scannez le QR code affiché dans le terminal (Android : scanner intégré
   à Expo Go ; iOS : utilisez l'appareil photo, qui proposera d'ouvrir le
   lien dans Expo Go).
3. L'application se charge directement sur votre téléphone.

Votre téléphone et votre ordinateur doivent être sur le **même réseau
Wi-Fi**.

### Option 2 — Dans un navigateur web

Dans le terminal où `npx expo start` tourne, appuyez sur la touche **`w`**,
ou lancez directement :

```bash
npx expo start --web
```

Un onglet s'ouvre sur `http://localhost:8081`. C'est le moyen le plus
rapide pour visualiser l'interface sans rien installer, mais certains
comportements natifs (gestes, notifications, etc.) ne sont pas simulés.

### Option 3 — Émulateur Android

1. Installez [Android Studio](https://developer.android.com/studio) et
   configurez un émulateur (AVD) depuis le *Device Manager*.
2. Lancez l'émulateur.
3. Dans le terminal où `npx expo start` tourne, appuyez sur la touche
   **`a`** (ou lancez `npx expo start --android`).

### Émulateur iOS

Non disponible sous Windows (Xcode est réservé à macOS). Utilisez Expo Go
sur un iPhone physique, ou le navigateur web, pour tester l'interface iOS.

## Comptes de test

Aucun compte n'est nécessaire : les écrans de connexion/inscription
n'effectuent pas de vraie vérification. Entrez n'importe quelle valeur
(ou laissez vide) et appuyez sur le bouton pour avancer dans le parcours :

```
Welcome → Create an account / Log in → Create or join an apartment → App
```

## Commandes utiles

```bash
npx expo start              # démarrer le serveur de développement
npx expo start --web        # démarrer directement en mode web
npx tsc --noEmit            # vérifier les types TypeScript
npx expo lint                # linter le code
npx expo-doctor             # diagnostiquer les problèmes de config/dépendances
```

## Structure du projet

Voir la section « Project structure » de [CLAUDE.md](./CLAUDE.md) pour le
détail dossier par dossier.

## Dépannage

- **Le QR code ne fonctionne pas / l'app ne se charge pas sur le
  téléphone** : vérifiez que le téléphone et l'ordinateur sont sur le même
  réseau Wi-Fi. Si le Wi-Fi bloque les connexions entre appareils (réseaux
  d'entreprise, certaines box), relancez avec
  `npx expo start --tunnel` (plus lent, mais passe par internet).
- **Erreurs après un `npm install`** : supprimez `node_modules` et
  relancez `npm install`.
- **Port 8081 déjà utilisé** : fermez l'instance précédente de `expo
  start`, ou lancez `npx expo start --port 8082`.
- **Vérifier que tout est correctement configuré** :
  ```bash
  npx expo-doctor
  ```
