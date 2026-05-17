import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { pplRoutesPlugin } from "./scripts/vite-ppl-routes.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/ppl/",
  plugins: [pplRoutesPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        itemIds: resolve(__dirname, "tools/item-ids/index.html"),
        blockPaletteMixer: resolve(__dirname, "tools/block-palette-mixer/index.html"),
        img2display: resolve(__dirname, "tools/img2display/index.html"),
        gradients: resolve(__dirname, "tools/gradients/index.html"),
        calculator: resolve(__dirname, "tools/calculator/index.html"),
        obhod: resolve(__dirname, "tools/obhod/index.html"),
        jarChecker: resolve(__dirname, "tools/jar-checker/index.html"),
        dependencyChecker: resolve(__dirname, "tools/dependency-checker/index.html"),
        mrUnpacker: resolve(__dirname, "tools/mr-unpacker/index.html"),
        tetris: resolve(__dirname, "tools/tetris/index.html"),
        blockClicker: resolve(__dirname, "tools/block-clicker/index.html"),
        game2048: resolve(__dirname, "tools/game-2048/index.html"),
        privacy: resolve(__dirname, "privacy-policy/index.html"),
        faq: resolve(__dirname, "faq/index.html"),
      },
    },
  },
});
