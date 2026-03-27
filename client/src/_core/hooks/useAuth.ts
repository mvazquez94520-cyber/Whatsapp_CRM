import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

// Mode développement local : utilisateur fictif
const DEV_USER = {
  id: 1,
  openId: "dev-user",
  email: "dev@localhost",
  name: "Dev User",
  loginMethod: "local",
  role: "admin" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  // En mode développement local (sans OAuth), utiliser un utilisateur fictif
  const isDev = !import.meta.env.VITE_OAUTH_PORTAL_URL;

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !isDev, // Ne pas faire la requête en mode dev
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      if (!isDev) {
        await logoutMutation.mutateAsync();
      }
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils, isDev]);

  const state = useMemo(() => {
    const userData = isDev ? DEV_USER : meQuery.data;
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(userData)
    );
    return {
      user: userData ?? null,
      loading: isDev ? false : meQuery.isLoading || logoutMutation.isPending,
      error: isDev ? null : meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(userData),
    };
  }, [
    isDev,
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (isDev) return; // En mode dev, pas de redirection
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
    isDev,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
