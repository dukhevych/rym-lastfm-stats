# RYM Last.fm Stats

## Install

<a href="https://addons.mozilla.org/en-US/firefox/addon/rym-last-fm-stats/" target="_blank">Mozilla Firefox</a> | <a href="https://chromewebstore.google.com/detail/rym-lastfm-stats/bckjjmcflcmmcnlogmgogofcmldpcgpk" target="_blank">Google Chrome</a>

## Description

RYM Last.fm Stats is a browser extension that enhances your experience on RateYourMusic by integrating Last.fm statistics. This extension allows you to:

- Display Last.fm stats on RateYourMusic artist and release pages
- See your top albums from Last.fm on your RateYourMusic profile
- View your recent tracks on your RateYourMusic profile
- View recent tracks of other users on their RateYourMusic profile (requires Last.fm user link to be added into profile)

## Development

### Prerequisites

- Node.js
- npm

### Setup

1. Clone the repository
2. Run `npm install` to install dependencies

### Build

- For Chrome: `npm run build:chrome`
- For Firefox: `npm run build:firefox`

### Development with watch mode

- For Chrome: `npm run dev:chrome`
- For Firefox: `npm run dev:firefox`
- Default (Firefox): `npm run dev`

### Linting and Formatting

- Lint: `npm run lint`
- Fix linting issues: `npm run lint:fix`
- Format code: `npm run format`

## Technologies Used

- Vue.js
- Webpack
- Tailwind CSS
- ESLint
- Prettier

## Version

Current version: 1.3.0
