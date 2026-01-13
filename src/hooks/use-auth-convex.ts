"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { useCallback, useState } from "react";

/**
 * Hook to get current authenticated user
 */
export function useCurrentUser() {
  return useQuery(api.auth.currentUser);
}

/**
 * Hook to get current family member context
 */
export function useCurrentMember(familyId?: string) {
  const args = familyId ? { familyId: familyId as any } : {};
  return useQuery(api.auth.currentMember, Object.keys(args).length > 0 ? args : "skip");
}

/**
 * Hook to get user with all families
 */
export function useUserWithFamilies() {
  return useQuery(api.auth.getUserWithFamilies);
}

/**
 * Hook for authentication actions
 */
export function useAuth() {
  const { signIn, signOut } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await signIn("password", { email, password, flow: "signIn" });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "登录失败");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [signIn]
  );

  const handleSignUp = useCallback(
    async (email: string, password: string, name?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await signIn("password", { email, password, name, flow: "signUp" });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "注册失败");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [signIn]
  );

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signOut();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "登出失败");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [signOut]);

  return {
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const user = useCurrentUser();
  return {
    isAuthenticated: user !== undefined && user !== null,
    isLoading: user === undefined,
    user,
  };
}

/**
 * Hook for profile updates
 */
export function useUpdateProfile() {
  return useMutation(api.auth.updateProfile);
}

/**
 * Hook for account deletion
 */
export function useDeleteAccount() {
  return useMutation(api.auth.deleteAccount);
}
