import Link from "next/link";

/** Quiet editorial breadcrumb trail. Pair with breadcrumbJsonLd() for schema. */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="ed-crumbs">
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.path}>
              {last ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <>
                  <Link href={item.path}>{item.name}</Link>
                  <span aria-hidden className="ed-crumbs-sep">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
