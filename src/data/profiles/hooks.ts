import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import type { UserProfile } from "@/domain/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AuthFlowError } from "@/lib/auth/authFlow";
import { createProfileService } from "./profileService";
import { mutationKeys } from "@/data/queryScope";
const service = createProfileService();
export function useProfile(enabled = true) {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: enabled && status === "signed-in" && user?.emailVerified === true,
    queryFn: ({ signal }) => service.load(user!.id, signal),
    retry: false,
    staleTime: 60_000,
  });
}
export function useCompleteOnboarding() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationKey: user ? [...mutationKeys.account(user.id), "onboarding"] : ["onboarding", "signed-out"],
    mutationFn: (input: Pick<UserProfile, "displayName" | "stylePreferences"> & { skip?: boolean }) => {
      if (!user?.emailVerified) throw new AuthFlowError("Please sign in again.");
      return service.complete(user.id, input, input.skip);
    },
    onSuccess: (profile) => client.setQueryData(["profile", profile.id], profile),
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const latestUser = useRef(user?.id);
  latestUser.current = user?.id;
  const client = useQueryClient();
  return useMutation({
    mutationKey: user ? [...mutationKeys.account(user.id), "profile"] : ["profile", "signed-out"],
    mutationFn: (input: Pick<UserProfile, "displayName" | "stylePreferences">) => {
      if (!user?.emailVerified) throw new AuthFlowError("Please sign in again.");
      return service.update(user.id, input);
    },
    onSuccess: (profile) => {
      if (latestUser.current === profile.id) client.setQueryData(["profile", profile.id], profile);
    },
  });
}
