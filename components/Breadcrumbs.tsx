import Link from "next/link";

/** Neo-brutalist breadcrumb trail. Pair with breadcrumbJsonLd() for schema. */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-10">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-2">
              {last ? (
                <span
                  aria-current="page"
                  className="on-accent neo-border px-3 py-1.5"
                  style={{ background: "var(--yellow)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "1px", color: "var(--ink)", textTransform: "uppercase" }}
                >
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.path}
                    className="neo-border px-3 py-1.5 transition-transform hover:-translate-y-0.5"
                    style={{ background: "var(--surface)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "1px", color: "var(--ink)", textTransform: "uppercase" }}
                  >
                    {item.name}
                  </Link>
                  <span aria-hidden style={{ fontWeight: 700, color: "var(--ink)" }}>→</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
