import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function preloadBuiltCssPlugin(): Plugin {
  return {
    name: 'preload-built-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_, context) {
        const bundle = context.bundle
        if (!bundle) {
          return []
        }

        const cssFiles = Object.values(bundle)
          .filter((chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.css'))
          .map((asset) => asset.fileName)

        return cssFiles.map((href) => ({
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'style',
            href: `/${href}`,
          },
          injectTo: 'head',
        }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadBuiltCssPlugin()],
})
