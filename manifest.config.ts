import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

const pkgJson = pkg as typeof pkg & { displayName?: string }

export default defineManifest({
  manifest_version: 3,
  name: pkgJson.displayName ?? pkgJson.name,
  version: pkgJson.version,
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  icons: {
    16: 'public/icon-16.png',
    32: 'public/icon-32.png',
    48: 'public/icon-48.png',
    128: 'public/icon-128.png',
  },
  action: {
    default_icon: {
      16: 'public/icon-16.png',
      24: 'public/icon-24.png',
      32: 'public/icon-32.png',
      48: 'public/icon-48.png',
      128: 'public/icon-128.png',
    },
    default_popup: 'src/popup/index.html',
  },
  content_scripts: [
    {
      matches: [
        'https://www.x.com/*',
        'https://x.com/*',
        'https://www.twitter.com/*',
        'https://twitter.com/*',
      ],
      js: ['src/providers/x/bridge.main.ts'],
      run_at: 'document_start',
      world: 'MAIN',
    },
  ],
  permissions: ['activeTab', 'scripting', 'tabs'],
  host_permissions: [
    'http://127.0.0.1:47321/*',
    'http://localhost:47321/*',
    'https://www.reddit.com/*',
    'https://reddit.com/*',
    'https://www.x.com/*',
    'https://x.com/*',
    'https://www.twitter.com/*',
    'https://twitter.com/*',
  ],
})
