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
    <footer className="bg-zinc-950 text-zinc-400 mt-20 border-t-8 border-double border-zinc-800">
      <div className="max-w-[1400px] mx-auto px-6 pt-16 pb-12">

        {/* Newsletter CTA strip */}
        <div className="border border-zinc-800 rounded-sm p-6 mb-14 flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-900/50">
          <div>
            <h3 className="text-white font-display font-bold text-xl mb-1">The Balanced Brief.</h3>
            <p className="text-zinc-400 text-sm">Daily bias-balanced intelligence in your inbox. Free, always.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <input
              type="email"
              placeholder="Email address"
              className="flex-1 md:w-56 h-10 px-4 text-xs bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-accent-editorial rounded-sm"
            />
            <button className="px-5 py-2.5 bg-accent-editorial text-white text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all whitespace-nowrap rounded-sm">
              Subscribe →
            </button>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-100 mb-5 border-b border-zinc-800 pb-2">{section}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>
                      <span className="text-[13px] font-medium hover:text-white cursor-pointer transition-colors tracking-tight">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Logo + copyright */}
        <div className="border-t border-zinc-800 pt-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-4xl font-display font-black tracking-[-0.03em] text-white leading-none">
                The Lens <span className="text-accent-editorial uppercase text-sm tracking-[.3em] font-black ml-2">Dispatch</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] font-serif text-zinc-500 uppercase tracking-widest">
              <span className="hover:text-zinc-300 cursor-pointer transition-colors">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-zinc-300 cursor-pointer transition-colors">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-zinc-300 cursor-pointer transition-colors">Cookie Settings</span>
              <span>•</span>
              <span className="hover:text-zinc-300 cursor-pointer transition-colors">Accessibility</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between mt-10 pt-6 border-t border-zinc-900 gap-4">
            <p className="text-[12px] font-serif text-zinc-600 italic">
              © {new Date().getFullYear()} The Lens Dispatch. Committed to balanced journalism. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-serif uppercase tracking-widest text-zinc-600 hover:text-zinc-300 transition-colors"
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
