import { NextResponse } from "next/server";
import fallbackParticipants from "../../../../data/participants.json";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Participant, Submission } from "@/lib/types";

type ParticipantRow = {
  id: string;
  slug: string;
  display_name: string;
  first_name: string;
  last_name: string;
  photo_file_name: string | null;
  status: "waiting" | "submitted";
};

type SubmissionRow = {
  created_at: string;
  participant_id: string;
  first_name: string;
  last_name: string;
  size: Submission["size"];
  word_1: string;
  word_2: string;
  word_3: string;
  initials_language?: Submission["initialsLanguage"] | null;
  back_name_asset_path?: string | null;
  back_name_first_name?: string | null;
  back_name_last_name?: string | null;
  back_name_text?: string | null;
};

const legacySubmissionSelect = "created_at, participant_id, first_name, last_name, size, word_1, word_2, word_3";
const personalizedSubmissionSelect = `${legacySubmissionSelect}, initials_language, back_name_asset_path, back_name_first_name, back_name_last_name, back_name_text`;

function isPersonalizationSchemaError(error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    text.includes("initials_language") ||
    text.includes("back_name_asset_path") ||
    text.includes("back_name_first_name") ||
    text.includes("back_name_last_name") ||
    text.includes("back_name_text")
  );
}

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({
      mode: "local",
      participants: fallbackParticipants,
      submissions: [],
    });
  }

  const supabase = getSupabaseServerClient();

  const [{ data: participantRows, error: participantsError }, submissionsResult] =
    await Promise.all([
      supabase.from("participants").select("id, slug, display_name, first_name, last_name, photo_file_name, status").order("display_name"),
      supabase
        .from("submissions")
        .select(personalizedSubmissionSelect)
        .order("created_at"),
    ]);

  let submissionRows = submissionsResult.data as SubmissionRow[] | null;
  let submissionsError = submissionsResult.error;

  if (submissionsError && isPersonalizationSchemaError(submissionsError)) {
    const legacySubmissionsResult = await supabase.from("submissions").select(legacySubmissionSelect).order("created_at");
    submissionRows = legacySubmissionsResult.data as SubmissionRow[] | null;
    submissionsError = legacySubmissionsResult.error;
  }

  if (participantsError || submissionsError) {
    return NextResponse.json(
      {
        error: participantsError?.message ?? submissionsError?.message ?? "Failed to load Supabase data.",
      },
      { status: 500 },
    );
  }

  const participants: Participant[] = (participantRows as ParticipantRow[]).map((participant) => ({
    slug: participant.slug,
    displayName: participant.display_name,
    firstName: participant.first_name,
    lastName: participant.last_name,
    photoFileName: participant.photo_file_name ?? `${participant.display_name}.jpg`,
    status: participant.status,
  }));

  const participantSlugById = new Map((participantRows as ParticipantRow[]).map((participant) => [participant.id, participant.slug]));

  const submissions: Submission[] = (submissionRows as SubmissionRow[])
    .filter((submission) => participantSlugById.has(submission.participant_id))
    .map((submission) => ({
      participantSlug: participantSlugById.get(submission.participant_id)!,
      firstName: submission.first_name,
      lastName: submission.last_name,
      size: submission.size,
      words: [submission.word_1, submission.word_2, submission.word_3],
      initialsLanguage: submission.initials_language ?? "RU",
      backNameAssetPath: submission.back_name_asset_path ?? "",
      backNameFirstName: submission.back_name_first_name ?? submission.first_name,
      backNameLastName: submission.back_name_last_name ?? submission.last_name,
      backNameText: submission.back_name_text ?? `${submission.first_name} ${submission.last_name}`,
      createdAt: submission.created_at,
    }));

  return NextResponse.json({
    mode: "supabase",
    participants,
    submissions,
  });
}
