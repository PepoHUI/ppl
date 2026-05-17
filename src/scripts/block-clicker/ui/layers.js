import { hasUnlock } from "../core/state.js";
import { currentBiome } from "../core/progression.js";
import { chaosTier } from "../core/upgrades.js";
import { applyChaosTier } from "../juice/fx.js";
import { getGolemPhase } from "../core/golem.js";
import { applyGolemPhase, syncGolemPhaseMeter } from "./golem-visual.js";

export function syncVisualLayers(app) {
  if (!app) return;

  applyChaosTier(app, chaosTier());

  const pick = document.getElementById("bc-pick-glow");
  const golem = document.getElementById("bc-golem");
  const conveyor = document.getElementById("bc-conveyor");
  const beacon = document.getElementById("bc-beacon");
  const rhythm = document.getElementById("bc-rhythm");
  const biome = document.getElementById("bc-biome");
  const arena = document.getElementById("bc-arena");

  pick?.classList.toggle("bc-pick-glow--on", hasUnlock("pickGlow"));
  const golemOn = hasUnlock("golem");
  golem?.classList.toggle("bc-layer--active", golemOn);
  if (golemOn) {
    applyGolemPhase(getGolemPhase(), false);
    syncGolemPhaseMeter();
  } else {
    applyGolemPhase("rest", false);
  }
  conveyor?.classList.toggle("bc-layer--active", hasUnlock("conveyor"));
  beacon?.classList.toggle("bc-layer--active", hasUnlock("beacon"));
  rhythm?.classList.toggle("bc-rhythm--boost", hasUnlock("rhythmRing"));
  arena?.classList.toggle("bc-arena--storm", hasUnlock("stormAura"));
  arena?.classList.toggle("bc-arena--overdrive", hasUnlock("overdrive"));
  app.classList.toggle("bc-app--chromatic", hasUnlock("chromatic") || hasUnlock("omega"));

  if (biome && hasUnlock("portalBiome")) {
    const b = currentBiome();
    biome.style.setProperty("--bc-biome-hue", String(b.hue));
    biome.dataset.biome = b.id;
  }

}
