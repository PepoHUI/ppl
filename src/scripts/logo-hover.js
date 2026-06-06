import gsap from "gsap";

const reduced =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function init() {
  if (reduced) return;

  document.querySelectorAll("a.logo").forEach((logo) => {
    const mark = logo.querySelector(".logo__mark");
    const text = logo.querySelector(".logo__text");
    if (!mark || !text) return;

    gsap.set(mark, {
      transformOrigin: "50% 50%",
      force3D: true,
    });
    gsap.set(text, {
      transformOrigin: "50% 50%",
      force3D: true,
    });

    logo.addEventListener("mouseenter", () => {
      gsap.killTweensOf([mark, text]);
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(mark, {
        rotation: 360,
        scale: 1.18,
        duration: 0.72,
        ease: "back.out(1.25)",
      }).to(
        text,
        {
          x: 6,
          scale: 1.04,
          letterSpacing: "-0.02em",
          duration: 0.42,
        },
        "-=0.52",
      );
    });

    logo.addEventListener("mouseleave", () => {
      gsap.killTweensOf([mark, text]);
      gsap.to(mark, {
        rotation: 0,
        scale: 1,
        duration: 0.58,
        ease: "elastic.out(1, 0.55)",
      });
      gsap.to(text, {
        x: 0,
        scale: 1,
        letterSpacing: "-0.03em",
        duration: 0.48,
        ease: "power3.out",
      });
    });
  });

  document.querySelectorAll(".badge--faq").forEach((btn) => {
    const label = btn.querySelector(".badge-faq__label");
    const shine = btn.querySelector(".badge-faq__shine");
    const icon = btn.querySelector(".badge-faq__icon");
    if (!label) return;

    const isCurrent = btn.classList.contains("badge--current");
    const idle = isCurrent
      ? {
          color: "#a1a1aa",
          borderColor: "rgba(255, 255, 255, 0.09)",
          boxShadow: "0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 10px 28px rgba(0, 0, 0, 0.32)",
          iconColor: "#71717a",
        }
      : {
          color: "#e4e4e7",
          borderColor: "rgba(255, 255, 255, 0.055)",
          boxShadow: "0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 10px 32px rgba(0, 0, 0, 0.35)",
          iconColor: "#a1a1aa",
        };

    gsap.set(btn, { transformOrigin: "50% 50%", force3D: true });
    if (shine) {
      gsap.set(shine, { xPercent: -200, skewX: -12, opacity: 0.85 });
    }
    gsap.set(label, { letterSpacing: "0.08em", y: 0, rotate: 0 });
    const iconSvg = icon?.querySelector("svg");
    if (icon) {
      gsap.set(icon, { transformOrigin: "50% 50%", scale: 1, color: idle.iconColor, rotation: 0 });
    }
    if (iconSvg) {
      gsap.set(iconSvg, { transformOrigin: "50% 50%", rotation: 0 });
    }

    const resetShine = () => {
      if (!shine) return;
      gsap.set(shine, { xPercent: -200, skewX: -12, opacity: 0.85 });
    };

    const targets = [btn, label, shine, icon, iconSvg].filter(Boolean);

    btn.addEventListener("mouseenter", () => {
      gsap.killTweensOf(targets);
      resetShine();

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.to(
        btn,
        {
          scale: 1.05,
          y: -3,
          borderColor: "rgba(255, 255, 255, 0.12)",
          boxShadow:
            "0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 0 0 1px rgba(255, 255, 255, 0.06), 0 14px 44px rgba(0, 0, 0, 0.48)",
          color: "#fafafa",
          duration: 0.4,
          ease: "back.out(1.75)",
        },
        0,
      );

      tl.to(
        label,
        {
          letterSpacing: "0.12em",
          y: -0.5,
          duration: 0.4,
          ease: "power3.out",
        },
        0.03,
      );

      if (icon) {
        tl.to(
          icon,
          {
            keyframes: [
              {
                color: "#e4e4e7",
                scale: 1.14,
                rotation: -20,
                duration: 0.14,
                ease: "power2.out",
              },
              {
                rotation: 14,
                scale: 1.08,
                duration: 0.16,
                ease: "power2.inOut",
              },
              {
                rotation: 0,
                scale: 1.1,
                duration: 0.52,
                ease: "elastic.out(1, 0.48)",
              },
            ],
          },
          0.02,
        );
      }

      if (iconSvg) {
        tl.to(
          iconSvg,
          {
            rotation: -32,
            y: -1,
            duration: 0.16,
            ease: "power2.out",
          },
          0.05,
        );
        tl.to(
          iconSvg,
          {
            rotation: 8,
            y: 0,
            duration: 0.2,
            ease: "power2.inOut",
          },
          ">",
        );
        tl.to(
          iconSvg,
          {
            rotation: 0,
            duration: 0.62,
            ease: "elastic.out(1, 0.42)",
          },
          ">",
        );
      }

      if (shine) {
        tl.fromTo(
          shine,
          { xPercent: -150, skewX: -12 },
          {
            xPercent: 155,
            skewX: -5,
            duration: 0.68,
            ease: "power2.inOut",
          },
          0.02,
        );
      }
    });

    btn.addEventListener("mouseleave", () => {
      gsap.killTweensOf(targets);

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.to(
        btn,
        {
          scale: 1,
          y: 0,
          borderColor: idle.borderColor,
          boxShadow: idle.boxShadow,
          color: idle.color,
          duration: 0.48,
          ease: "power3.out",
        },
        0,
      );

      tl.to(
        label,
        {
          letterSpacing: "0.08em",
          y: 0,
          duration: 0.4,
          ease: "power3.out",
        },
        0,
      );

      if (icon) {
        tl.to(
          icon,
          {
            color: idle.iconColor,
            scale: 1,
            rotation: 0,
            duration: 0.42,
            ease: "power3.out",
          },
          0,
        );
      }

      if (iconSvg) {
        tl.to(
          iconSvg,
          {
            rotation: 0,
            y: 0,
            duration: 0.42,
            ease: "power3.out",
          },
          0,
        );
      }

      if (shine) {
        tl.to(shine, { opacity: 0, duration: 0.1 }, 0);
        tl.set(shine, { xPercent: -200, skewX: -12, opacity: 0.85 }, ">");
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
