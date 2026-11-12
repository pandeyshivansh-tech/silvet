import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "@/domain/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AuthFlowError } from "@/lib/auth/authFlow";
import { createProfileService } from "./profileService";
const service = createProfileService();
export function useProfile() {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: status === "signed-in" && user?.emailVerified === true,
    queryFn: ({ signal }) => service.load(user!.id, signal),
    retry: false,
    staleTime: 60_000,
  });
}
export function useCompleteOnboarding() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Pick<UserProfile, "displayName" | "stylePreferences"> & { skip?: boolean }) => {
      if (!user?.emailVerified) throw new AuthFlowError("Please sign in again.");
      return service.complete(user.id, input, input.skip);
    },
    onSuccess: (profile) => client.setQueryData(["profile", profile.id], profile),
  });
}
