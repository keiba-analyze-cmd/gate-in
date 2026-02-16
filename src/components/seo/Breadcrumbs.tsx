import Link from "next/link";
import JsonLd from "./JsonLd";

type BreadcrumbItem = {
  name: string;
  href?: string;
};

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: `https://gate-in.jp${item.href}` } : {}),
    })),
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <nav aria-label="パンくずリスト" className="text-xs text-gray-500 mb-3">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && <span className="mx-1">/</span>}
              {item.href ? (
                <Link href={item.href} className="text-blue-600 hover:underline">
                  {item.name}
                </Link>
              ) : (
                <span className="text-gray-700">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
