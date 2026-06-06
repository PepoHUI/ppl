import { hasUnlock } from "../core/state.js";
import { currentBiome } from "../core/progression.js";
import { chaosTier } from "../core/upgrades.js";
import { applyChaosTier } from "../juice/fx.js";
import { syncUpgradeLayers } from "../juice/forge-reveals.js";
import { getGolemPhase } from "../core/golem.js";
import { applyGolemPhase, syncGolemPhaseMeter } from "./golem-visual.js";

export const GOLEM_TOOLTIP = "Добывает блоки без усталости.";

export function syncVisualLayers(app) {
  if (!app) return;

  applyChaosTier(app, chaosTier());

  const pick = document.getElementById("bc-pick-glow");
  const golem = document.getElementById("bc-golem");
  const conveyor = document.getElementById("bc-conveyor");
  const rhythm = document.getElementById("bc-rhythm");
  const biome = document.getElementById("bc-biome");

  pick?.classList.toggle("bc-pick-glow--on", hasUnlock("pickGlow"));
  const golemOn = hasUnlock("golem");
  golem?.classList.toggle("bc-layer--active", golemOn);
  if (golem) {
    if (golemOn) {
      golem.title = GOLEM_TOOLTIP;
      golem.setAttribute("aria-label", GOLEM_TOOLTIP);
    } else {
      golem.removeAttribute("title");
      golem.removeAttribute("aria-label");
    }
  }
  if (golemOn) {
    applyGolemPhase(getGolemPhase(), false);
    syncGolemPhaseMeter();
  } else {
    applyGolemPhase("rest", false);
  }
  conveyor?.classList.toggle("bc-layer--active", hasUnlock("conveyor"));
  rhythm?.classList.toggle("bc-rhythm--boost", hasUnlock("rhythmRing"));
  app.classList.toggle("bc-app--chromatic", hasUnlock("chromatic") || hasUnlock("omega"));

  syncUpgradeLayers();

  if (biome && hasUnlock("portalBiome")) {
    const b = currentBiome();
    biome.style.setProperty("--bc-biome-hue", String(b.hue));
    biome.dataset.biome = b.id;
  }

}
