import React from "react";

export default function DesignTest() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <h1 className="text-hero-headline mb-8">Phase 1: Tokens & Typography</h1>
      <p className="text-dek mb-8 max-w-2xl">
        This is a blank page created to visually confirm the base design tokens, typography, and dark mode toggle before proceeding to Phase 2. The background and foreground colors you see are mapped directly to <code>--paper</code> and <code>--ink</code> (or <code>--darkroom</code> and the dark mode <code>--ink</code>).
      </p>

      <section className="mb-12">
        <h2 className="text-headline mb-4">Typography Settings</h2>
        <div className="space-y-4 p-6 border-border border-dashed rounded-none border-[1.5px]">
          <div>
            <div className="text-eyebrow text-muted-foreground mb-1">Display (Newsreader)</div>
            <div className="font-serif text-3xl">The Lens Dispatch</div>
          </div>
          <div>
            <div className="text-eyebrow text-muted-foreground mb-1">Body (Public Sans)</div>
            <div className="font-sans text-base">See every side of every story. Free, always.</div>
          </div>
          <div>
            <div className="text-eyebrow text-muted-foreground mb-1">Data / Mono (IBM Plex Mono)</div>
            <div className="font-mono text-sm tracking-widest uppercase">IN — 06 JUL, 14:32 IST</div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-headline mb-4">Color Palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch name="Paper" token="bg-background" text="text-foreground" />
          <ColorSwatch name="Card Surface" token="bg-card" text="text-card-foreground" />
          <ColorSwatch name="Ink" token="bg-foreground" text="text-background" />
          <ColorSwatch name="Ink Muted" token="bg-muted-foreground" text="text-background" />
          
          <ColorSwatch name="Signal Yellow" token="bg-accent" text="text-accent-foreground" />
          <ColorSwatch name="Lens Cyan" token="bg-[var(--lens-cyan)]" text="text-white" />
          <ColorSwatch name="Wire Red" token="bg-destructive" text="text-destructive-foreground" />
          <ColorSwatch name="Wire Blue" token="bg-[var(--wire-blue)]" text="text-white" />
        </div>
      </section>

      <section>
        <h2 className="text-headline mb-4">Shape & Borders</h2>
        <div className="flex gap-4">
          <div className="p-6 border-border border flex-1 bg-card">
            <p className="text-eyebrow">Solid Border (var(--hairline))</p>
            <p className="text-sm mt-2">Sharp corners (radius: 0) by default.</p>
          </div>
          <div className="p-6 border-[1.5px] border-dashed flex-1 bg-card" style={{ borderColor: 'var(--hairline-dashed)' }}>
            <p className="text-eyebrow">Dashed Border (var(--hairline-dashed))</p>
            <p className="text-sm mt-2">Used for tear-off slips or clippings.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ColorSwatch({ name, token, text }: { name: string, token: string, text: string }) {
  return (
    <div className={`p-4 border border-border flex flex-col justify-between h-24 ${token} ${text}`}>
      <div className="font-sans font-medium text-sm">{name}</div>
      <div className="font-mono text-xs opacity-70">{token.replace('bg-', '')}</div>
    </div>
  );
}
