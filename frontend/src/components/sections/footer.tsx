import Image from "next/image";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Gallery", href: "#gallery" },
  { label: "Crew", href: "#crew" },
];

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/mitt_cse_clusteroids?stkn=MWY2ZGUwZWM3d2Vzbg%3D%3D",
  },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/mit-t-60a058291/" },
];

const linkClassName =
  "inline-flex min-h-10 items-center text-sm text-[#D6C8C8] transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F07C84]";

export function Footer() {
  return (
    <footer
      id="footer"
      className="relative isolate overflow-hidden border-t border-[#A8333B]/30 text-white"
      style={{
        background:
          "radial-gradient(ellipse 90% 48% at 50% -10%, rgba(181, 42, 50, 0.42), transparent 75%), linear-gradient(180deg, #260709 0%, #110305 38%, #050303 72%, #000 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 23px 37px, #fff 98%, transparent), radial-gradient(1px 1px at 113px 83px, #fff 98%, transparent), radial-gradient(1px 1px at 191px 19px, #e56b73 98%, transparent)",
          backgroundSize: "263px 167px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-px w-[min(80vw,72rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#E4535D]/70 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-5 pt-12 pb-5 md:px-10 md:pt-16 md:pb-7">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12">
          <div>
            <p className="mono mb-3 text-[10px] uppercase tracking-[0.32em] text-[#E07179]">
              / Until we meet again
            </p>
            <h2 className="display text-[clamp(2.8rem,7vw,6rem)] leading-[0.94]">
              <span className="block">SEE YOU AT</span>
              <span className="block">THE EVENT</span>
              <span className="block text-[#E5535D]">HORIZON.</span>
            </h2>
            <p className="mono mt-6 text-xs uppercase tracking-[0.25em] text-[#D6C8C8] md:mt-8">
              HACKMITTEN <span className="text-[#F07C84]">3.0</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-7 pt-1 sm:gap-x-10 lg:pt-10">
            <div>
              <h3 className="mono mb-3 text-[10px] uppercase tracking-[0.27em] text-[#E07179]">
                Contact
              </h3>
              <address className="not-italic">
                <a
                  className={`${linkClassName} [overflow-wrap:anywhere]`}
                  href="mailto:hodcse@mitt.edu.in"
                >
                  hodcse@mitt.edu.in
                </a>
              </address>
            </div>

            <nav aria-label="Footer quick links">
              <h3 className="mono mb-3 text-[10px] uppercase tracking-[0.27em] text-[#E07179]">
                Quick links
              </h3>
              <ul>
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <a className={linkClassName} href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h3 className="mono mb-3 text-[10px] uppercase tracking-[0.27em] text-[#E07179]">
                Venue
              </h3>
              <p className="max-w-60 text-sm leading-relaxed text-[#D6C8C8]">
                Maharaja Institute of Technology Thandavapura
              </p>
            </div>

            <nav aria-label="Footer social links">
              <h3 className="mono mb-3 text-[10px] uppercase tracking-[0.27em] text-[#E07179]">
                Social
              </h3>
              <ul>
                {socialLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      className={linkClassName}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                      <span aria-hidden="true" className="ml-1.5 text-[#E07179]">
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-4 border-t border-white/10 pt-8 md:mt-28">
          <Image
            src="/images/branding/mitt-logo.png"
            alt="Maharaja Institute of Technology Thandavapura emblem"
            width={64}
            height={64}
            className="h-12 w-12 shrink-0 rounded-full bg-white object-contain p-1"
          />
          <p className="max-w-64 text-xs font-medium uppercase leading-relaxed tracking-[0.13em] text-[#D6C8C8]">
            Maharaja Institute of Technology Thandavapura
          </p>
        </div>

        <div className="mono mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 text-[10px] uppercase leading-relaxed tracking-[0.14em] text-[#9E898B] lg:flex-row lg:items-center lg:justify-between">
          <p>© 2026 Hackmitten 3.0 · All rights reserved</p>
          <p>Black is the universe · White is information · Red is energy</p>
        </div>
      </div>
    </footer>
  );
}
