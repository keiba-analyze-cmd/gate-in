import BackLink from "@/components/ui/BackLink";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileEditForm from "@/components/mypage/ProfileEditForm";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, avatar_url, avatar_emoji")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <BackLink href="/mypage" label="マイページ" />
      <h1 className="text-xl font-bold">✏️ プロフィール編集</h1>
      <ProfileEditForm
        initialName={profile.display_name}
        initialBio={profile.bio ?? ""}
        avatarUrl={profile.avatar_url}
        avatarEmoji={profile.avatar_emoji}
      />
    </div>
  );
}
