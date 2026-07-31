export function PageLoadingSpinner() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-cozy-grain text-foreground p-4">
      <div className="relative flex flex-col items-center gap-5">
        {/* Ambient glow */}
        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl animate-pulse" />

        {/* Logo and spinning ring */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
          <img
            src="/logo.png"
            alt="LifePulse"
            className="h-10 w-10 rounded-xl object-cover shadow-soft"
          />
        </div>

        {/* Brand label & pulse text */}
        <div className="flex flex-col items-center gap-1.5 leading-none">
          <span className="font-display text-base font-semibold text-gradient-primary">
            LifePulse
          </span>
          <span className="text-xs text-muted-foreground animate-pulse font-medium">
            Loading workspace…
          </span>
        </div>
      </div>
    </div>
  );
}
