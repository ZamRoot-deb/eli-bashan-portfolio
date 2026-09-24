import { defineConfig, type Plugin } from 'vite'
import { renderHead, renderPage } from './src/render/page'

// Pre-render every zone into index.html at build time: the page is readable (and indexable)
// before any script runs; src/main.ts only enhances it.
function prerender(): Plugin {
  return {
    name: 'ezb-prerender',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace('<!--ssg:head-->', renderHead()).replace('<!--ssg:page-->', renderPage())
      },
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [prerender()],
  build: { target: 'es2022', assetsInlineLimit: 0, cssCodeSplit: true, modulePreload: { polyfill: false } },
})
