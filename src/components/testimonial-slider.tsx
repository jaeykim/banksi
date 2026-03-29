'use client';

import { useState, useEffect, useCallback } from 'react';

interface Testimonial {
  q: string;
  name: string;
  role: string;
}

const accents = [
  'border-accent/30', 'border-primary/30', 'border-success/30',
  'border-warning/30', 'border-accent/30', 'border-primary/30',
  'border-success/30', 'border-warning/30', 'border-accent/30', 'border-primary/30',
];

export function TestimonialSlider({ testimonials }: { testimonials: Testimonial[] }) {
  const [idx, setIdx] = useState(0);
  const visible = 3; // show 3 at a time on desktop
  const maxIdx = Math.max(0, testimonials.length - visible);

  const next = useCallback(() => setIdx((i) => (i >= maxIdx ? 0 : i + 1)), [maxIdx]);

  // Auto-slide every 4s
  useEffect(() => {
    const iv = setInterval(next, 4000);
    return () => clearInterval(iv);
  }, [next]);

  return (
    <div className="relative">
      {/* Cards container */}
      <div className="overflow-hidden">
        <div
          className="flex gap-4 transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${idx * (100 / visible)}%)` }}
        >
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`flex-shrink-0 w-full sm:w-[calc(33.333%-11px)] rounded-2xl border-2 ${accents[i % accents.length]} bg-surface p-6 flex flex-col`}
            >
              <svg className="h-6 w-6 text-muted/20 mb-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10H0z" /></svg>
              <p className="text-sm leading-relaxed text-foreground flex-1">&ldquo;{t.q}&rdquo;</p>
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-6">
        {Array.from({ length: maxIdx + 1 }, (_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`}
          />
        ))}
      </div>
    </div>
  );
}
