import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/domain/types";
import { profileInputSchema } from "@/domain/profileSchema";
import type { Database, ProfileRow } from "@/lib/supabase/database.types";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AuthFlowError, authError } from "@/lib/auth/authFlow";

function toProfile(row: ProfileRow): UserProfile {
  return { id: row.id, displayName: row.display_name, stylePreferences: row.style_preferences, onboardingCompletedAt: row.onboarding_completed_at };
}
export function createProfileService(getClient: () => SupabaseClient<Database> = getSupabaseClient) {
  async function verified(id: string) {
    const client = getClient();
    const { data, error } = await client.auth.getUser();
    if (error) throw authError(error);
    if (!data.user?.email_confirmed_at || data.user.id !== id) throw new AuthFlowError("A verified account is required. Please sign in again.");
    return { client, user: data.user };
  }
  return {
    async update(id: string, input: Pick<UserProfile, "displayName" | "stylePreferences">): Promise<UserProfile> {
      const parsed = profileInputSchema.parse(input);
      const { client } = await verified(id);
      const result = await client.from("profiles").update({
        display_name: parsed.displayName, style_preferences: parsed.stylePreferences,
      }).eq("id", id).select("*").single();
      if (result.error || !result.data) throw new AuthFlowError("Your profile wasn’t saved. Please try again.");
      // Recheck before returning results that may have settled after account switching.
      await verified(id);
      return toProfile(result.data);
    },
    async load(id: string, signal: AbortSignal): Promise<UserProfile> {
      const { client } = await verified(id);
      signal.throwIfAborted();
      const first = await client.from("profiles").select("*").eq("id", id).abortSignal(signal).maybeSingle();
      if (first.error) throw new AuthFlowError("We couldn’t load your profile. Please try again.");
      if (first.data) return toProfile(first.data);
      signal.throwIfAborted();
      // ON CONFLICT DO NOTHING: concurrent logins never reset existing preferences.
      const { user } = await verified(id);
      const metadataName = profileInputSchema.shape.displayName.safeParse(user.user_metadata?.display_name);
      const inserted = await client.from("profiles").upsert({
        id,
        display_name: metadataName.success ? metadataName.data : null,
      }, { onConflict: "id", ignoreDuplicates: true }).abortSignal(signal);
      if (inserted.error) throw new AuthFlowError("Your account is signed in, but we couldn’t prepare your profile. Please retry.");
      const result = await client.from("profiles").select("*").eq("id", id).abortSignal(signal).single();
      if (result.error || !result.data) throw new AuthFlowError("We couldn’t retrieve your profile. Please retry.");
      return toProfile(result.data);
    },
    async complete(id: string, input: Pick<UserProfile, "displayName" | "stylePreferences">, skip = false): Promise<UserProfile> {
      const { client } = await verified(id);
      const parsed = skip ? null : profileInputSchema.parse(input);
      const values = { ...(parsed ? { display_name: parsed.displayName, style_preferences: parsed.stylePreferences } : {}), onboarding_completed_at: new Date().toISOString() };
      const result = await client.from("profiles").update(values).eq("id", id).select("*").single();
      if (result.error || !result.data) throw new AuthFlowError("Your preferences weren’t saved. Please try again.");
      return toProfile(result.data);
    },
  };
}
