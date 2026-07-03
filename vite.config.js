import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
	base: '/exeges/',
	plugins: [
		react(),
			// gzip compression — reduces bible.json ~130K lines → ~15KB gzipped
		viteCompression({
			algorithm: 'gzip',
			ext: '.gz',
			threshold: 1024, // only compress assets > 1KB
		}),
	],
})
