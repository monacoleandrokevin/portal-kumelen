export async function warmup(API, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 8000);
      await fetch(`${API}/health`, { signal: ctl.signal });
      clearTimeout(t);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return false;
}
