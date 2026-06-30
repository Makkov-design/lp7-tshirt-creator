import { NextResponse } from "next/server";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Submission } from "@/lib/types";
import { submissionSchema } from "@/lib/validation";

type ParticipantRow = {
  id: string;
  slug: string;
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

function mapSubmission(row: SubmissionRow, participantSlug: string): Submission {
  return {
    participantSlug,
    firstName: row.first_name,
    lastName: row.last_name,
    size: row.size,
    words: [row.word_1, row.word_2, row.word_3],
    initialsLanguage: row.initials_language ?? "RU",
    backNameAssetPath: row.back_name_asset_path ?? "",
    backNameFirstName: row.back_name_first_name ?? row.first_name,
    backNameLastName: row.back_name_last_name ?? row.last_name,
    backNameText: row.back_name_text ?? `${row.first_name} ${row.last_name}`,
    createdAt: row.created_at,
  };
}

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

function withInputPersonalization(
  submission: Submission,
  input: {
    initialsLanguage: Submission["initialsLanguage"];
    backNameAssetPath: string;
    backNameFirstName: string;
    backNameLastName: string;
    backNameText: string;
  },
) {
  return {
    ...submission,
    initialsLanguage: input.initialsLanguage,
    backNameAssetPath: input.backNameAssetPath,
    backNameFirstName: input.backNameFirstName,
    backNameLastName: input.backNameLastName,
    backNameText: input.backNameText,
  };
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const parsed = submissionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const supabase = getSupabaseServerClient();

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, slug, status")
    .eq("slug", input.participantSlug)
    .single<ParticipantRow>();

  if (participantError || !participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  let { data: existingSubmission, error: existingError } = await supabase
    .from("submissions")
    .select(personalizedSubmissionSelect)
    .eq("participant_id", participant.id)
    .maybeSingle<SubmissionRow>();

  if (existingError && isPersonalizationSchemaError(existingError)) {
    const legacyExisting = await supabase
      .from("submissions")
      .select(legacySubmissionSelect)
      .eq("participant_id", participant.id)
      .maybeSingle<SubmissionRow>();
    existingSubmission = legacyExisting.data;
    existingError = legacyExisting.error;
  }

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existingSubmission) {
    return NextResponse.json(
      {
        error: "Participant already submitted.",
        submission: mapSubmission(existingSubmission, participant.slug),
      },
      { status: 409 },
    );
  }

  const insertPayload = {
    participant_id: participant.id,
    first_name: input.firstName,
    last_name: input.lastName,
    size: input.size,
    word_1: input.words[0],
    word_2: input.words[1],
    word_3: input.words[2],
    initials_language: input.initialsLanguage,
    back_name_asset_path: input.backNameAssetPath,
    back_name_first_name: input.backNameFirstName,
    back_name_last_name: input.backNameLastName,
    back_name_text: input.backNameText,
    client_submission_id: input.clientSubmissionId,
  };

  let { data: inserted, error: insertError } = await supabase
    .from("submissions")
    .insert(insertPayload)
    .select(personalizedSubmissionSelect)
    .single<SubmissionRow>();

  if (insertError && isPersonalizationSchemaError(insertError)) {
    const legacyInsertPayload = {
      participant_id: insertPayload.participant_id,
      first_name: insertPayload.first_name,
      last_name: insertPayload.last_name,
      size: insertPayload.size,
      word_1: insertPayload.word_1,
      word_2: insertPayload.word_2,
      word_3: insertPayload.word_3,
      client_submission_id: insertPayload.client_submission_id,
    };
    const legacyInsert = await supabase
      .from("submissions")
      .insert(legacyInsertPayload)
      .select(legacySubmissionSelect)
      .single<SubmissionRow>();
    inserted = legacyInsert.data;
    insertError = legacyInsert.error;
  }

  if (insertError || !inserted) {
    const status = insertError?.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: insertError?.message ?? "Failed to save submission." }, { status });
  }

  const { error: statusError } = await supabase
    .from("participants")
    .update({ status: "submitted", updated_at: new Date().toISOString() })
    .eq("id", participant.id);

  if (statusError) {
    return NextResponse.json({ error: statusError.message }, { status: 500 });
  }

  return NextResponse.json({
    submission: withInputPersonalization(mapSubmission(inserted, participant.slug), input),
  });
}

export async function PATCH(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const parsed = submissionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const supabase = getSupabaseServerClient();

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, slug, status")
    .eq("slug", input.participantSlug)
    .single<ParticipantRow>();

  if (participantError || !participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  const updatePayload = {
    first_name: input.firstName,
    last_name: input.lastName,
    size: input.size,
    word_1: input.words[0],
    word_2: input.words[1],
    word_3: input.words[2],
    initials_language: input.initialsLanguage,
    back_name_asset_path: input.backNameAssetPath,
    back_name_first_name: input.backNameFirstName,
    back_name_last_name: input.backNameLastName,
    back_name_text: input.backNameText,
  };

  let { data: updated, error: updateError } = await supabase
    .from("submissions")
    .update(updatePayload)
    .eq("participant_id", participant.id)
    .select(personalizedSubmissionSelect)
    .single<SubmissionRow>();

  if (updateError && isPersonalizationSchemaError(updateError)) {
    const legacyUpdatePayload = {
      first_name: updatePayload.first_name,
      last_name: updatePayload.last_name,
      size: updatePayload.size,
      word_1: updatePayload.word_1,
      word_2: updatePayload.word_2,
      word_3: updatePayload.word_3,
    };
    const legacyUpdate = await supabase
      .from("submissions")
      .update(legacyUpdatePayload)
      .eq("participant_id", participant.id)
      .select(legacySubmissionSelect)
      .single<SubmissionRow>();
    updated = legacyUpdate.data;
    updateError = legacyUpdate.error;
  }

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? "Failed to update submission." }, { status: 500 });
  }

  return NextResponse.json({
    submission: withInputPersonalization(mapSubmission(updated, participant.slug), input),
  });
}
