import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { toast } from "sonner";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

const searchSchema = z.object({
  token: fallback(z.string().optional(), undefined),
  error: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: zodValidator(searchSchema),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { token, error } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      toast.error(decodeURIComponent(error));
      navigate({ to: "/auth", replace: true });
      return;
    }

    if (token) {
      apiClient.auth.setSessionToken(token);
      toast.success("Welcome to LifeOS!");
      navigate({ to: "/dashboard", replace: true });
    } else {
      toast.error("No authentication token provided.");
      navigate({ to: "/auth", replace: true });
    }
  }, [token, error, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cozy-grain">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        <p className="mt-4 text-sm text-muted-foreground">Completing your sign in...</p>
      </div>
    </div>
  );
}
