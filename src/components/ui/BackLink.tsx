import Link from "next/link";

type Props = {
  href: string;
  label?: string;
};

export default function BackLink({ href, label = "戻る" }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-green-600 transition-colors mb-4"
    >
      <span className="text-xs">←</span>
      <span>{label}</span>
    </Link>
  );
}
