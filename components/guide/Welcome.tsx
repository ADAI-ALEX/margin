"use client";
/**
 * First-visit welcome at the top of the Expeditions panel: what MARGIN is in one sentence, and the two
 * ways in (the tour on this screen, the Guide page). Inline, never an overlay. Dismissing it is remembered
 * on this device only; a script in the root layout hides it before paint on later visits (no flash).
 */
import Link from "next/link";
import { IconClose } from "@/components/ui/icons";

export const WELCOME_KEY = "margin.welcome";

export function dismissWelcome() {
  document.documentElement.dataset.welcome = "off";
  try { localStorage.setItem(WELCOME_KEY, "off"); } catch { /* storage unavailable: hidden for this visit only */ }
}

export default function Welcome({ onTour }: { onTour: () => void }) {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <h2 id="welcome-title" className="welcome-title">New to MARGIN?</h2>
      <p className="welcome-text">It shows how close NASA&rsquo;s fire tests in space come to the cabin air future crews will breathe. One minute to learn the screen.</p>
      <div className="welcome-actions">
        <button type="button" className="ui-btn welcome-go" onClick={onTour}>Take the tour</button>
        <Link className="ui-btn" href="/guide">Read the guide</Link>
      </div>
      <button type="button" className="ui-sq welcome-x" onClick={dismissWelcome} aria-label="Dismiss the welcome"><IconClose /></button>
    </section>
  );
}
