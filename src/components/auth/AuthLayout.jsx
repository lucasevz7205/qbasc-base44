import { BrandLogo } from "@/components/qb/brand/BrandLogo";
import "./ascension-auth.css";

// Full-screen card shared by the auth pages; it sets its own color tokens so it stays readable under any theme.
export function AuthLayout({ icon: Icon, title, subtitle, footer, children, ascension = false }) {
  if (ascension) {
    return (
      <main className="qb-auth-ascension">
        <div className="qb-auth-ascension__scene qb-img qb-scene-night" aria-hidden="true" />
        <div className="qb-auth-ascension__inner">
          <BrandLogo variant="q-full" size={110} />
          <section className="qb-auth-ascension__card" aria-labelledby="qb-auth-title">
            <h1 id="qb-auth-title"><Icon size={24} aria-hidden="true" />{title}</h1>
            {subtitle && <p className="qb-auth-ascension__subtitle">{subtitle}</p>}
            {children}
          </section>
          {footer && <p className="qb-auth-ascension__footer">{footer}</p>}
        </div>
      </main>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Icon className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">{children}</div>
        {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}
