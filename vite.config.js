import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Plugin to copy Zebra scripts to dist folder
const copyZebraScripts = () => ({
  name: 'copy-zebra-scripts',
  writeBundle() {
    console.log('Copying Zebra Browser Print scripts...');

    const zebraDir = 'zebra-browser-print-js-v31250';
    const destDir = 'dist/zebra-browser-print-js-v31250';

    // Create destination directory if it doesn't exist
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    // Copy Zebra scripts
    const scripts = [
      'BrowserPrint-3.1.250.min.js',
      'BrowserPrint-Zebra-1.1.250.min.js'
    ];

    scripts.forEach(script => {
      const srcPath = `${zebraDir}/${script}`;
      const destPath = `${destDir}/${script}`;

      if (existsSync(srcPath)) {
        copyFileSync(srcPath, destPath);
        console.log(`Copied ${script} to dist`);
      } else {
        console.warn(`Warning: ${srcPath} not found`);
      }
    });
  }
});

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    copyZebraScripts(),
    {
      name: 'configure-html-plugin',
      transformIndexHtml(html) {
        // Replace absolute paths with relative paths for Zebra scripts
        return html.replace(
          /src="\/zebra-browser-print-js-v31250\//g,
          'src="./zebra-browser-print-js-v31250/'
        );
      }
    }
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress all warnings related to Zebra scripts
        if (warning.message && warning.message.includes('zebra-browser-print-js')) {
          return;
        }
        warn(warning);
      }
    }
  },
  server: {
    fs: {
      // Allow serving files from zebra-browser-print-js-v31250 directory
      allow: ['..', 'zebra-browser-print-js-v31250']
    }
  }
});
