import gsap from "gsap";
import { whenPageLoaded } from "./page-loader.js";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function collectTargets(root) {
  const list = [];
  const push = (el) => {
    if (el) list.push(el);
  };

  push(root.querySelector(".back-link"));
  push(root.querySelector(".legal-page__title"));
  push(root.querySelector(".legal-page__updated"));

  const doc = root.querySelector(".faq-doc") || root.querySelector(".legal-doc");
  if (!doc) return list;

  if (doc.classList.contains("faq-doc")) {
    doc.querySelectorAll(".faq-block").forEach((el) => list.push(el));
  } else {
    doc.querySelectorAll(":scope > p, :scope > h2").forEach((el) => list.push(el));
  }

  return list;
}

function init() {
  const root = document.querySelector(".legal-page");
  if (!root) return;

  if (reduced) return;

  const targets = collectTargets(root);
  if (!targets.length) return;

  gsap.set(targets, { opacity: 0, y: 28 });

  whenPageLoaded.then(() => {
    const intro = targets.slice(0, 3);
    const body = targets.slice(3);

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.to(intro, {
      opacity: 1,
      y: 0,
      duration: 0.52,
      stagger: 0.1,
    });

    if (body.length) {
      tl.to(
        body,
        {
          opacity: 1,
          y: 0,
          duration: 0.46,
          stagger: 0.05,
          ease: "power2.out",
        },
        "-=0.32",
      );
    }
  });
}

init();
