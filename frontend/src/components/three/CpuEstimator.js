// CpuEstimator.js

export async function measureCpuUsage(duration = 1000) {
  const start = performance.now();

  return new Promise(resolve => {
    let lastTime = start;
    let lag = 0;
    let frames = 0;

    function loop() {
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;
      frames++;

      // Ha egy frame lassabb, mint 17ms (kb 60fps), az terhelésnek számít
      if (dt > 17) {
        lag += (dt - 17);
      }

      if (now - start < duration) {
        requestAnimationFrame(loop);
      } else {
        // Kiszámoljuk, az idő hány százalékában "akadt" a gép
        // Szorzóval kicsit felerősítjük, hogy látványosabb legyen a grafikonon
        const load = Math.min(100, (lag / duration) * 100 * 1.5);

        // Ha nagyon kicsi a terhelés, akkor is írjunk be legalább 1-et,
        // hogy lásd az adatbázisban, hogy nem nulla!
        resolve(Math.max(1, Math.round(load)));
      }
    }

    requestAnimationFrame(loop);
  });
}