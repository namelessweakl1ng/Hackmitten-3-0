"use client";

export function Venue() {

  return (
    <section id="venue" className="relative py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-10">
        <div className="mb-8 md:mb-12">
          <div className="mono text-xs uppercase tracking-[0.3em] text-[#B52A32] mb-4">
            / Venue
          </div>
          <h2 className="display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[0.95]">
            FIND THE
            <br />
            <span className="text-[#A8A8A8]">EVENT HORIZON.</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-[#A8A8A8] max-w-xl">
            MAHARAJA INSTITUTE OF TECHNOLOGY THANDAVAPURA
          </p>
        </div>

        <div className="glass rounded-lg overflow-hidden border border-white/10">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15865.614589310255!2d76.66231138787947!3d12.182924746985165!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3baf68ebcaaf5815%3A0xccb790eb902050cd!2sMIT%20Thandavapura!5e0!3m2!1sen!2sin!4v1788802507801!5m2!1sen!2sin"
            width="100%"
            height="450"
            style={{ border: 0, filter: "grayscale(0.3) contrast(1.1)" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            title="Venue location — MIT Thandavapura"
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <a
            href="https://maps.app.goo.gl/6eufFDAHy1xFATp76"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#B52A32] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#B52A32] transition-all"
          >
            Open in Google Maps →
          </a>
        </div>
      </div>
    </section>
  );
}
