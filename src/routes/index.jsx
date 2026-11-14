import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QBAsc" },
      { name: "description", content: "Aplicativo pronto para começar do zero." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">QBAsc</h1>
        <p className="text-sm text-muted-foreground">
          O aplicativo foi zerado e está pronto para começar do zero.
        </p>
      </div>
    </div>
  );
}