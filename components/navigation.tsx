import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/contacts", label: "Contacts" },
  { href: "/organizations", label: "Organizations" },
  { href: "/tasks", label: "Tasks" }
];

export function Navigation() {
  return (
    <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href="/" className="text-xl font-semibold tracking-tight text-ink">
            Innovation Evaluation Platform
          </Link>
          <p className="text-sm text-slate-600">
            CRM MVP for university and innovation-center pipeline management
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-tealCore hover:text-tealCore"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
