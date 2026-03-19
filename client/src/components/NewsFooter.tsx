import { Link } from "wouter";

const footerLinks = {
  News: [
    { label: "Home", href: "/" },
    { label: "Local News", href: "/" },
    { label: "Blindspot Feed", href: "/blindspot" },
    { label: "International", href: "/" },
    { label: "Topics", href: "/" },
  ],
  "International": [
    { label: "North America", href: "/" },
    { label: "South America", href: "/" },
    { label: "Europe", href: "/" },
    { label: "Asia", href: "/" },
    { label: "Australia", href: "/" },
    { label: "Africa", href: "/" },
  ],
  Trending: [
    { label: "Israel-Hamas War", href: "/" },
    { label: "Donald Trump", href: "/" },
    { label: "Joe Biden", href: "/" },
    { label: "Ukraine War", href: "/" },
    { label: "Climate Change", href: "/" },
    { label: "Economy", href: "/" },
  ],
  Company: [
    { label: "About Us", href: "/" },
    { label: "Our Mission", href: "/" },
    { label: "Careers", href: "/" },
    { label: "Press Room", href: "/" },
    { label: "Contact Us", href: "/" },
    { label: "Bias Ratings", href: "/publishers" },
  ],
  Tools: [
    { label: "Mobile App", href: "/" },
    { label: "Browser Extension", href: "/" },
    { label: "Newsletters", href: "/" },
    { label: "RSS Feeds", href: "/" },
    { label: "API Access", href: "/" },
    { label: "Gift Cards", href: "/" },
  ],
};

export function NewsFooter() {
  return (
    <footer className="bg-zinc-900 text-zinc-300 mt-12">
      <div className="max-w-[1400px] mx-auto px-4 pt-10 pb-6">
        {/* Links grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 mb-8">
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-3">{section}</h4>
              <ul className="space-y-1.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>
                      <span className="text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer transition-colors">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Logo + copyright */}
        <div className="border-t border-zinc-800 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Big logo */}
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black tracking-[-0.05em] text-white uppercase leading-none">
                Gro<span className="text-red-500">u</span>nd
              </span>
              <span className="text-[11px] font-bold text-zinc-500 mb-0.5 tracking-widest uppercase">News</span>
            </div>

            {/* Bottom links */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
              <span className="hover:text-zinc-300 cursor-pointer">Gift</span>
              <span className="hover:text-zinc-300 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-zinc-300 cursor-pointer">Manage Cookies</span>
              <span className="hover:text-zinc-300 cursor-pointer">Privacy Preferences</span>
              <span className="hover:text-zinc-300 cursor-pointer">Terms and Conditions</span>
              <span className="flex items-center gap-1 hover:text-zinc-300 cursor-pointer">
                <span>International</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-[10px] text-zinc-600">© {new Date().getFullYear()} Snapclue Inc.</p>
            <div className="flex items-center gap-3 text-zinc-600">
              {/* App store badges */}
              <span className="text-[10px] hover:text-zinc-400 cursor-pointer">App Store</span>
              <span className="text-[10px] hover:text-zinc-400 cursor-pointer">Google Play</span>
              {/* Social */}
              {["f", "𝕏", "in"].map((s) => (
                <span key={s} className="text-[11px] w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center hover:border-zinc-500 cursor-pointer font-bold">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
