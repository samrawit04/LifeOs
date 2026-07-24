import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { apiClient } from "@/integrations/api/client";
import { AppShell } from "@/components/app-shell";
import { NotificationProvider } from "@/lib/notification-context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await apiClient.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => (
    <NotificationProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </NotificationProvider>
  ),
});

