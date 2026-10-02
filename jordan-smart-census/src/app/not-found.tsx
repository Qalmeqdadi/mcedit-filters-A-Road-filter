import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="font-mono text-[12px] text-ink-400">404</div>
      <h1 className="text-[20px] font-semibold">Page not found · الصفحة غير موجودة</h1>
      <Link href="/" className="text-[13px] font-medium text-navy-600 hover:underline">UFUQ home · الصفحة الرئيسية لأفق →</Link>
    </div>
  );
}
