import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-servora flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-label uppercase text-text-muted">404</p>
      <h1 className="font-display text-h3 text-ink-900">Page not found</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist in the provider dashboard.
      </p>
      <Button href="/" variant="secondary">
        Back to dashboard
      </Button>
    </div>
  );
}
