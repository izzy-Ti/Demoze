import Link from "next/link";
import { getT } from "@/lib/locale";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="num text-sm font-medium text-accent-fg">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t.errors.notFound}</h1>
      <p className="mt-3 text-fg-muted">{t.errors.notFoundHint}</p>
      <div className="mt-8 flex justify-center gap-2">
        <Link href="/" className="btn-primary">{t.errors.goHome}</Link>
        <Link href="/companies" className="btn-secondary">{t.nav.companies}</Link>
      </div>
    </div>
  );
}
