import { Link } from "wouter";

const footerLinks = {
  News: [
    { label: "Home", href: "/" },
    { label: "Blindspot Feed", href: "/blindspot" },
    { label: "My Bias Profile", href: "/my-bias" },
    { label: "Reading History", href: "/history" },
    { label: "Publishers", href: "/publishers" },
    { label: "Factuality Index", href: "/factuality" },
  ],
  "Editions": [
    { label: "🌍 World", href: "/" },
    { label: "🇺🇸 United States", href: "/" },
    { label: "🇬🇧 United Kingdom", href: "/" },
    { label: "🇮🇳 India", href: "/" },
    { label: "🇦🇺 Australia", href: "/" },
    { label: "🇨🇦 Canada", href: "/" },
    { label: "🇩🇪 Germany", href: "/" },
    { label: "🇫🇷 France", href: "/" },
    { label: "🇯🇵 Japan", href: "/" },
  ],
  Factuality: [
    { label: "Source Ratings", href: "/publishers" },
    { label: "Factuality Index", href: "/factuality" },
    { label: "Bias Methodology", href: "/" },
    { label: "Coverage Gaps", href: "/blindspot" },
    { label: "Correction Log", href: "/" },
  ],
  Company: [
    { label: "About Us", href: "/" },
    { label: "Our Mission", href: "/" },
    { label: "Careers", href: "/" },
    { label: "Press Room", href: "/" },
    { label: "Contact Us", href: "/" },
  ],
  Tools: [
    { label: "Mobile App", href: "/" },
    { label: "Browser Extension", href: "/" },
    { label: "Newsletters", href: "/" },
    { label: "RSS Feeds", href: "/" },
    { label: "API Access", href: "/" },
  ],
};

const SOCIAL_LINKS = [
  { label: "Twitter", href: "https://twitter.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "Instagram", href: "https://instagram.com" },
];

export function NewsFooter() {
  return (
    <footer className="bg-black text-white mt-20 border-t border-[var(--hairline)]">
      <div className="max-w-[1400px] mx-auto px-6 pt-16 pb-12">

        {/* Newsletter CTA strip */}
        <div className="border border-dashed border-[var(--hairline-dashed)] p-6 mb-14 flex flex-col md:flex-row items-center justify-between gap-6 bg-[#0a0a0a]">
          <div>
            <h3 className="text-white font-newsreader font-bold text-xl mb-1 italic">The Balanced Brief.</h3>
            <p className="text-white/60 font-public-sans text-sm">Daily bias-balanced intelligence in your inbox. Free, always.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <input
              type="email"
              placeholder="EMAIL ADDRESS"
              className="flex-1 md:w-64 h-10 px-4 font-plex-mono text-xs bg-transparent border-b border-dashed border-white/40 text-white placeholder-white/40 focus:outline-none focus:border-white rounded-none"
            />
            <button className="px-5 py-2.5 bg-white text-black font-plex-mono text-[11px] font-bold uppercase tracking-widest hover:bg-[#e5e5e5] transition-colors whitespace-nowrap">
              SUBSCRIBE
            </button>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="font-plex-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 mb-5 border-b border-dashed border-white/20 pb-2">{section}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>
                      <span className="font-public-sans text-[13px] font-medium text-white/80 hover:text-white cursor-pointer transition-colors">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Logo + copyright */}
        <div className="border-t border-dashed border-white/20 pt-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-newsreader font-black tracking-tight text-white leading-none">
                The Lens <span className="font-plex-mono uppercase text-sm tracking-[.2em] font-normal text-white/60 ml-2">Dispatch</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-plex-mono text-[10px] text-white/50 uppercase tracking-widest">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer transition-colors">Cookie Settings</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer transition-colors">Accessibility</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between mt-10 pt-6 border-t border-dashed border-white/10 gap-4">
            <p className="font-public-sans text-[12px] text-white/40">
              © {new Date().getFullYear()} The Lens Dispatch.
            </p>
            <div className="flex items-center gap-5">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-plex-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
