import { useEffect, type RefObject } from 'react';

/**
 * Hace aparecer suavemente las secciones al desplazarse.
 * - Anima automáticamente cada <section> de `root` y cualquier elemento con [data-reveal].
 * - Lo que ya está en pantalla al cargar no se anima (evita parpadeos arriba de la página).
 * - Los elementos que entran juntos (p. ej. tarjetas de una grilla) aparecen escalonados.
 * - Observa cambios del DOM, así que cubre vistas que cargan datos después.
 */
export function useScrollReveal(root: RefObject<HTMLElement | null>, resetKey: unknown) {
  useEffect(() => {
    const container = root.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entrando = entries.filter((e) => e.isIntersecting);
        entrando.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          el.style.setProperty('--cl-reveal-delay', `${Math.min(i * 70, 350)}ms`);
          el.classList.add('is-visible');
          observer.unobserve(el);
          // Al terminar se limpian las clases para no interferir con hover ni transforms propios
          window.setTimeout(() => {
            el.classList.remove('cl-reveal', 'is-visible');
            el.style.removeProperty('--cl-reveal-delay');
          }, 1200);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    const procesar = () => {
      container.querySelectorAll<HTMLElement>('section, [data-reveal]').forEach((el) => {
        if (el.dataset.revealListo) return;
        el.dataset.revealListo = '1';
        // Una sección dentro de otra ya animada no se anima dos veces
        if (!el.hasAttribute('data-reveal') && el.parentElement?.closest('.cl-reveal')) return;
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
        el.classList.add('cl-reveal');
        observer.observe(el);
      });
    };

    let raf = 0;
    const programar = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(procesar);
    };
    programar();
    const mutations = new MutationObserver(programar);
    mutations.observe(container, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      mutations.disconnect();
      observer.disconnect();
      // Si se desmonta a mitad de animación, nada queda invisible
      container.querySelectorAll<HTMLElement>('.cl-reveal').forEach((el) => el.classList.remove('cl-reveal', 'is-visible'));
    };
  }, [root, resetKey]);
}
