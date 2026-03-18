import { Link } from "wouter";

export function NewsFooter() {
  return (
    <footer className="border-t bg-foreground text-background mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div>
            <h4 className="text-xs font-bold text-background/50 uppercase tracking-widest mb-3">News</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link href="/"><span className="hover:text-background cursor-pointer">Home Page</span></Link></li>
              <li><Link href="/"><span className="hover:text-background cursor-pointer">News Feed</span></Link></li>
              <li><Link href="/blindspot"><span className="hover:text-background cursor-pointer">Blindspot Feed</span></Link></li>
              <li><Link href="/bookmarks"><span className="hover:text-background cursor-pointer">Bookmarks</span></Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-background/50 uppercase tracking-widest mb-3">Categories</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><span className="hover:text-background cursor-pointer">Politics</span></li>
              <li><span className="hover:text-background cursor-pointer">Business</span></li>
              <li><span className="hover:text-background cursor-pointer">Technology</span></li>
              <li><span className="hover:text-background cursor-pointer">World</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-background/50 uppercase tracking-widest mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><span className="hover:text-background cursor-pointer">About</span></li>
              <li><span className="hover:text-background cursor-pointer">Mission</span></li>
              <li><span className="hover:text-background cursor-pointer">Blog</span></li>
              <li><span className="hover:text-background cursor-pointer">Careers</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-background/50 uppercase tracking-widest mb-3">Help</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><span className="hover:text-background cursor-pointer">Help Center</span></li>
              <li><span className="hover:text-background cursor-pointer">FAQ</span></li>
              <li><span className="hover:text-background cursor-pointer">Contact Us</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-background/50 uppercase tracking-widest mb-3">Tools</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><span className="hover:text-background cursor-pointer">Browser Extension</span></li>
              <li><span className="hover:text-background cursor-pointer">Newsletter</span></li>
              <li><span className="hover:text-background cursor-pointer">RSS Feed</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-background/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg">
              <span className="text-primary">G</span>ROUND NEWS
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-background/50">
            <span className="hover:text-background cursor-pointer">Privacy Policy</span>
            <span className="hover:text-background cursor-pointer">Terms</span>
            <span className="hover:text-background cursor-pointer">Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
