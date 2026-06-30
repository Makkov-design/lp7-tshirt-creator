"use client";

import avatarsManifest from "../../assets/avatars/avatars-manifest.json";
import backNameVariants from "../../data/back-name-variants.json";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Info,
  RotateCcw,
  Search,
} from "lucide-react";
import { searchParticipants } from "@/lib/name-matching";
import {
  clearAppSession,
  readCurrentSubmissionSlug,
  readStoredSubmissions,
  writeCurrentSubmissionSlug,
  writeStoredSubmissions,
} from "@/lib/storage";
import type { BackNameDraft, CreatorStep, InitialsLanguage, Participant, ShirtSize, Submission } from "@/lib/types";
import { initialsLanguages } from "@/lib/validation";

const sizes: ShirtSize[] = ["XS", "S", "M", "L", "XL", "XXL"];
const languages: InitialsLanguage[] = [...initialsLanguages];
const emptyWords = ["", "", ""];
const steps = [1, 2, 3, 4, 5];
const emptyBackNameDrafts: Record<InitialsLanguage, BackNameDraft> = {
  RU: { firstName: "", lastName: "" },
  UA: { firstName: "", lastName: "" },
  EN: { firstName: "", lastName: "" },
};
const maleCongratsGifs = [1, 2, 3, 8];
const femaleCongratsGifs = [4, 5, 6, 7];
const femaleParticipantSlugs = new Set([
  "alona-deynichenko",
  "alona-savosh",
  "valeriya-merzlikina",
  "valeriya-fomenko",
  "violetta-arkhipova",
  "darina-pluzhnikova",
  "elizaveta-konovalova",
  "katerina-mazur",
  "mariya-bogatchenko",
  "mariya-kosyakova",
  "ruslana-kozakova",
  "ella-vodopyanova",
]);
const backNameVariantBySlug = backNameVariants as Record<string, Partial<Record<InitialsLanguage, string>>>;

const avatarFileByName = new Map(
  (avatarsManifest as { tableName: string; file: string | null }[])
    .filter((item) => item.file)
    .map((item) => [item.tableName, item.file!]),
);

function getAvatarFile(participant: Participant) {
  return avatarFileByName.get(participant.displayName);
}

function hashString(value: string) {
  return value.split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

function orderParticipants(participants: Participant[]) {
  return participants
    .map((participant) => ({ participant, sort: hashString(participant.slug) }))
    .sort((left, right) => left.sort - right.sort)
    .map((item) => item.participant);
}

function shuffleParticipants(participants: Participant[]) {
  return participants
    .map((participant) => ({ participant, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map((item) => item.participant);
}

type CreatorAppProps = {
  participants: Participant[];
};

export function CreatorApp({ participants }: CreatorAppProps) {
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>(participants);
  const [step, setStep] = useState<CreatorStep>("splash");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Participant | null>(null);
  const [size, setSize] = useState<ShirtSize | null>(null);
  const [words, setWords] = useState<string[]>(emptyWords);
  const [initialsLanguage, setInitialsLanguage] = useState<InitialsLanguage>("RU");
  const [backNameDrafts, setBackNameDrafts] = useState<Record<InitialsLanguage, BackNameDraft>>(emptyBackNameDrafts);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentSubmissionSlug, setCurrentSubmissionSlug] = useState<string | null>(null);
  const [blockedParticipant, setBlockedParticipant] = useState<Participant | null>(null);
  const [dataMode, setDataMode] = useState<"local" | "supabase">("local");
  const [hydrated, setHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessConfetti, setShowSuccessConfetti] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") !== "1") {
      return;
    }

    clearAppSession();
    window.history.replaceState(null, "", window.location.pathname);

    const timeoutId = window.setTimeout(() => {
      setStep("splash");
      setQuery("");
      setSelected(null);
      setSize(null);
      setWords(emptyWords);
      setInitialsLanguage("RU");
      setBackNameDrafts(emptyBackNameDrafts);
      setSubmissions([]);
      setCurrentSubmissionSlug(null);
      setBlockedParticipant(null);
      setErrorMessage("");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const stored = readStoredSubmissions();
      const currentSlug = readCurrentSubmissionSlug();
      const restoredSlug = currentSlug ?? stored.at(-1)?.participantSlug;
      setSubmissions(stored);
      setCurrentSubmissionSlug(restoredSlug ?? null);

      if (restoredSlug) {
        const participant = participants.find((item) => item.slug === restoredSlug);
        const submission = stored.find((item) => item.participantSlug === restoredSlug);

        if (participant) {
          setSelected(participant);
          setBlockedParticipant(participant);
          hydrateFromSubmission(submission, participant);
        }
      }

      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [participants]);

  useEffect(() => {
    let isActive = true;

    async function loadBootstrap() {
      try {
        const response = await fetch("/api/bootstrap", { cache: "no-store" });
        const payload = (await response.json()) as {
          mode: "local" | "supabase";
          participants: Participant[];
          submissions: Submission[];
          error?: string;
        };

        if (!isActive || !response.ok) {
          return;
        }

        setDataMode(payload.mode);
        setAvailableParticipants(payload.participants);
        setSubmissions(payload.submissions);

        const currentSlug = readCurrentSubmissionSlug();
        setCurrentSubmissionSlug(currentSlug);
        const currentParticipant = currentSlug
          ? payload.participants.find((participant) => participant.slug === currentSlug)
          : null;
        const currentSubmission = currentSlug
          ? payload.submissions.find((submission) => submission.participantSlug === currentSlug)
          : null;

        if (currentParticipant && currentSubmission) {
          setSelected(currentParticipant);
          setBlockedParticipant(currentParticipant);
          hydrateFromSubmission(currentSubmission, currentParticipant);
        }
      } catch {
        if (isActive) {
          setDataMode("local");
        }
      } finally {
        if (isActive) {
          setHydrated(true);
        }
      }
    }

    loadBootstrap();

    return () => {
      isActive = false;
    };
  }, [participants]);

  const results = useMemo(() => searchParticipants(availableParticipants, query), [availableParticipants, query]);
  const submittedSlugs = useMemo(
    () => new Set(submissions.map((submission) => submission.participantSlug)),
    [submissions],
  );
  const currentSubmission = selected
    ? submissions.find((submission) => submission.participantSlug === selected.slug)
    : undefined;
  const completedCount = submissions.length;
  const canEditCurrentSubmission = Boolean(selected && currentSubmission && currentSubmissionSlug === selected.slug);
  const isBlockedSubmission = Boolean(blockedParticipant && !canEditCurrentSubmission);
  const activeStep = getActiveStep(step, isBlockedSubmission);
  const selectedBackNamePath = selected ? getBackNameAssetPath(selected, initialsLanguage) : "";
  const selectedBackNameDraft = backNameDrafts[initialsLanguage];
  const selectedBackNameText = formatBackNameDraft(selectedBackNameDraft);
  const completeSuccessConfetti = useCallback(() => setShowSuccessConfetti(false), []);
  const canContinueWords = words.every((word) => word.trim().length > 0);
  const canContinueBackName = Boolean(selectedBackNameDraft.firstName.trim() && selectedBackNameDraft.lastName.trim());
  const canConfirm = Boolean(selected && size && canContinueWords && canContinueBackName);

  function hydrateFromSubmission(submission: Submission | undefined | null, participant: Participant) {
    setSize(submission?.size ?? null);
    setWords(submission?.words ?? emptyWords);
    setInitialsLanguage(submission?.initialsLanguage ?? "RU");
    setBackNameDrafts(createBackNameDrafts(participant, submission));
    setQuery(participant.displayName);
  }

  function updateBackNameDraft(field: keyof BackNameDraft, value: string) {
    setBackNameDrafts((current) => ({
      ...current,
      [initialsLanguage]: {
        ...current[initialsLanguage],
        [field]: value,
      },
    }));
  }

  function startFlow() {
    if (selected && currentSubmissionSlug === selected.slug && currentSubmission) {
      setBlockedParticipant(selected);
      hydrateFromSubmission(currentSubmission, selected);
      setStep("complete");
      return;
    }

    setStep("identify");
  }

  function chooseParticipant(participant: Participant) {
    const existingSubmission = submissions.find((submission) => submission.participantSlug === participant.slug);
    setSelected(participant);
    setErrorMessage("");
    hydrateFromSubmission(existingSubmission, participant);

    if ((submittedSlugs.has(participant.slug) || participant.status === "submitted") && currentSubmissionSlug !== participant.slug) {
      setBlockedParticipant(participant);
      setStep("complete");
      return;
    }

    if (existingSubmission && currentSubmissionSlug === participant.slug) {
      setBlockedParticipant(participant);
      setStep("complete");
      return;
    }

    setBlockedParticipant(null);
    setStep("size");
  }

  async function submitDesign() {
    if (!selected || !size || !canContinueWords) {
      return;
    }

    const submission: Submission = {
      participantSlug: selected.slug,
      firstName: selected.firstName,
      lastName: selected.lastName,
      size,
      words: [words[0].trim(), words[1].trim(), words[2].trim()],
      initialsLanguage,
      backNameAssetPath: selectedBackNamePath,
      backNameFirstName: selectedBackNameDraft.firstName.trim(),
      backNameLastName: selectedBackNameDraft.lastName.trim(),
      backNameText: selectedBackNameText,
      createdAt: new Date().toISOString(),
    };

    if (dataMode === "supabase") {
      setIsSubmitting(true);
      setErrorMessage("");

      try {
        const isEditingCurrent = currentSubmissionSlug === selected.slug && Boolean(currentSubmission);
        const response = await fetch("/api/submissions", {
          method: isEditingCurrent ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...submission,
            clientSubmissionId: `${selected.slug}-${Date.now()}`,
          }),
        });
        const payload = (await response.json()) as {
          submission?: Submission;
          error?: string;
        };

        if (response.status === 409) {
          if (payload.submission) {
            setSubmissions((current) => upsertSubmission(current, payload.submission!));
          }
          setBlockedParticipant(selected);
          setStep("complete");
          return;
        }

        if (!response.ok || !payload.submission) {
          setErrorMessage(payload.error ?? "Не удалось сохранить дизайн. Попробуй еще раз.");
          return;
        }

        setSubmissions((current) => upsertSubmission(current, payload.submission!));
        setAvailableParticipants((current) =>
          current.map((participant) =>
            participant.slug === selected.slug ? { ...participant, status: "submitted" } : participant,
          ),
        );
        writeCurrentSubmissionSlug(selected.slug);
        setCurrentSubmissionSlug(selected.slug);
        setBlockedParticipant(selected);
        setShowSuccessConfetti(true);
        setStep("complete");
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    const nextSubmissions = upsertSubmission(submissions, submission);
    setSubmissions(nextSubmissions);
    writeStoredSubmissions(nextSubmissions);
    writeCurrentSubmissionSlug(selected.slug);
    setCurrentSubmissionSlug(selected.slug);
    setBlockedParticipant(selected);
    setShowSuccessConfetti(true);
    setStep("complete");
  }

  function editCurrentSubmission() {
    if (!selected || !currentSubmission || currentSubmissionSlug !== selected.slug) {
      return;
    }

    setBlockedParticipant(null);
    setErrorMessage("");
    hydrateFromSubmission(currentSubmission, selected);
    setStep("size");
  }

  function goToInitialsStep() {
    const shouldResetMobileViewport = window.matchMedia("(max-width: 899px)").matches;

    if (shouldResetMobileViewport && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setStep("initials");

    if (!shouldResetMobileViewport) {
      return;
    }

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    window.requestAnimationFrame(() => {
      scrollToTop();
      window.setTimeout(scrollToTop, 220);
    });
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="flowApp">
        {showSuccessConfetti ? <SuccessConfetti onComplete={completeSuccessConfetti} /> : null}
        <div className="flowFrame">
          <TopHeader />

          <AnimatePresence mode="wait">
            {step === "splash" ? (
              <SplashScreen key="splash" participants={availableParticipants} onStart={startFlow} />
            ) : (
              <motion.div
                key="flow"
                className="flowStack"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.36, ease: "easeOut" }}
              >
                {isBlockedSubmission && blockedParticipant ? (
                  <AlreadyCompletedPanel participant={blockedParticipant} />
                ) : (
                  <>
                    <TShirtStage
                      step={step}
                      size={size}
                      words={words}
                      participant={selected}
                      backNameDraft={selectedBackNameDraft}
                    />

                    <section className="flowCard" aria-label="Конструктор футболки">
                      <ProgressStrip activeStep={activeStep} />
                      <AnimatePresence mode="wait">
                        {step === "identify" ? (
                          <IdentifyStep
                            key="identify"
                            query={query}
                            results={results}
                            submittedSlugs={submittedSlugs}
                            onQueryChange={setQuery}
                            onChoose={chooseParticipant}
                          />
                        ) : null}

                        {step === "size" && selected ? (
                          <SizeStep
                            key="size"
                            participant={selected}
                            selectedSize={size}
                            onSelect={setSize}
                            onBack={() => setStep("identify")}
                            onNext={() => setStep("words")}
                          />
                        ) : null}

                        {step === "words" ? (
                          <WordsStep
                            key="words"
                            words={words}
                            onWordsChange={setWords}
                            onBack={() => setStep("size")}
                            onNext={goToInitialsStep}
                          />
                        ) : null}

                        {step === "initials" && selected ? (
                          <InitialsStep
                            key="initials"
                            language={initialsLanguage}
                            backNameDraft={selectedBackNameDraft}
                            onLanguageChange={setInitialsLanguage}
                            onBackNameChange={updateBackNameDraft}
                            onBack={() => setStep("words")}
                            onNext={() => setStep("confirm")}
                          />
                        ) : null}

                        {step === "confirm" && selected && size ? (
                          <ConfirmStep
                            key="confirm"
                            participant={selected}
                            size={size}
                            words={words}
                            initialsLanguage={initialsLanguage}
                            backNameText={selectedBackNameText}
                            isSubmitting={isSubmitting}
                            canConfirm={canConfirm}
                            errorMessage={errorMessage}
                            onBack={() => setStep("initials")}
                            onSubmit={submitDesign}
                          />
                        ) : null}

                        {step === "complete" && selected ? (
                          <CompleteStep
                            key="complete"
                            canEdit={hydrated && canEditCurrentSubmission}
                            onEdit={editCurrentSubmission}
                          />
                        ) : null}
                      </AnimatePresence>
                    </section>
                  </>
                )}

                {!isBlockedSubmission && step === "initials" ? <TelegramHint /> : null}

                <ReadinessBlock
                  participants={availableParticipants}
                  submissions={submissions}
                  completedCount={completedCount}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </MotionConfig>
  );
}

function TopHeader() {
  return (
    <header className="flowHeader">
      <img className="flowLogo" src="/assets/figma/lp7-logo.svg" alt="" />
      <div className="flowHeaderText" aria-label="ЛП-7 Варшава Создатели">
        <span>ЛП-7</span>
        <i />
        <span>ВАРШАВА</span>
        <i />
        <span>СОЗДАТЕЛИ</span>
      </div>
    </header>
  );
}

function SplashScreen({ participants, onStart }: { participants: Participant[]; onStart: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragX = useMotionValue(0);
  const [dragLimit, setDragLimit] = useState(286);
  const fillWidth = useTransform(dragX, (latest) => `${Math.min(dragLimit + 80, Math.max(80, latest + 80))}px`);
  const [isStarting, setIsStarting] = useState(false);
  const [shuffledAvatarParticipants, setShuffledAvatarParticipants] = useState<Participant[]>(() =>
    orderParticipants(participants.filter((participant) => getAvatarFile(participant))),
  );
  const outer = shuffledAvatarParticipants.slice(0, 16);
  const inner = shuffledAvatarParticipants.slice(16, 28);

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      setShuffledAvatarParticipants(shuffleParticipants(participants.filter((participant) => getAvatarFile(participant))));
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [participants]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) {
      return;
    }

    function updateLimit() {
      const currentButton = buttonRef.current;
      if (!currentButton) {
        return;
      }
      setDragLimit(Math.max(0, currentButton.clientWidth - 88));
    }

    updateLimit();
    const observer = new ResizeObserver(updateLimit);
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  function resetDragHandle() {
    animate(dragX, 0, {
      type: "spring",
      stiffness: 520,
      damping: 38,
      mass: 0.9,
    });
  }

  function completeDragStart() {
    if (isStarting) {
      return;
    }

    setIsStarting(true);
    animate(dragX, dragLimit, {
      type: "spring",
      stiffness: 560,
      damping: 42,
      mass: 0.8,
    }).then(onStart);
  }

  return (
    <motion.section
      className="splashScreen"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="welcomeOrbit" aria-hidden="true">
        <div className="orbitMask">
          <OrbitRing participants={outer} radiusPercent={45.1} direction="normal" />
          <OrbitRing participants={inner} radiusPercent={31.7} direction="reverse" />
        </div>
        <strong>
          Привет
          <br />
          Лидер!
        </strong>
      </div>
      <h1 className="splashTitle">Создай свою памятную футболку!</h1>
      <button
        ref={buttonRef}
        className="dragStartButton"
        type="button"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            completeDragStart();
          }
        }}
      >
        <motion.span className="dragStartFill" style={{ width: fillWidth }} aria-hidden="true" />
        <motion.span
          className="dragStartHandle"
          drag={isStarting ? false : "x"}
          dragConstraints={{ left: 0, right: dragLimit }}
          dragElastic={0.04}
          dragMomentum={false}
          style={{ x: dragX }}
          onDragEnd={() => {
            const shouldStart = dragX.get() >= dragLimit * 0.88;

            if (shouldStart) {
              completeDragStart();
              return;
            }

            resetDragHandle();
          }}
        >
          <span>›››</span>
        </motion.span>
        <span className="dragStartLabel">Start</span>
      </button>
    </motion.section>
  );
}

function OrbitRing({
  participants,
  radiusPercent,
  direction,
}: {
  participants: Participant[];
  radiusPercent: number;
  direction: "normal" | "reverse";
}) {
  const orbitRotation = direction === "normal" ? 360 : -360;
  const orbitDuration = direction === "normal" ? 42 : 54;
  const ringRotate = useMotionValue(0);
  const avatarCounterRotate = useTransform(ringRotate, (latest) => -latest);

  useEffect(() => {
    ringRotate.set(0);
    const controls = animate(ringRotate, orbitRotation, {
      duration: orbitDuration,
      ease: "linear",
      repeat: Infinity,
    });

    return () => controls.stop();
  }, [orbitDuration, orbitRotation, ringRotate]);

  return (
    <motion.div
      className="orbitRing"
      style={{ rotate: ringRotate }}
    >
      {participants.map((participant, index) => {
        const avatarFile = getAvatarFile(participant);
        const angle = (360 / participants.length) * index;
        const angleRad = (angle * Math.PI) / 180;
        const x = 50 + Math.cos(angleRad) * radiusPercent;
        const y = 50 + Math.sin(angleRad) * radiusPercent;

        if (!avatarFile) {
          return null;
        }

        return (
          <motion.div
            className="orbitAvatar"
            key={`${participant.slug}-${radiusPercent}`}
            style={{
              left: `calc(${x.toFixed(3)}% - 16px)`,
              top: `calc(${y.toFixed(3)}% - 16px)`,
              opacity: 1,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.055, duration: 0.36, ease: "easeOut" }}
          >
            <motion.span
              className="orbitAvatarImage"
              style={{ rotate: avatarCounterRotate }}
            >
              <img src={`/assets/avatars/${avatarFile}`} alt="" />
            </motion.span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function TShirtStage({
  step,
  size,
  words,
  participant,
  backNameDraft,
}: {
  step: CreatorStep;
  size: ShirtSize | null;
  words: string[];
  participant: Participant | null;
  backNameDraft: BackNameDraft;
}) {
  const variant = getStageVariant(step);
  const showFrontWords = step === "words";
  const showBackName = step === "initials";
  const showConfirm = step === "confirm";

  if (step === "complete" && participant) {
    return (
      <motion.section className="tshirtStage success" layout transition={stageTransition}>
        <img className="successStageGif" src={`/assets/gifs/congrats-${getCongratsGifNumber(participant)}.gif`} alt="" />
      </motion.section>
    );
  }

  if (showConfirm) {
    return (
      <motion.section className="tshirtStage compact" layout transition={stageTransition}>
        {size ? <SizeBadge size={size} /> : null}
        <img className="confirmPreview" src="/assets/figma/shirt-confirm-preview.png" alt="" />
      </motion.section>
    );
  }

  return (
    <motion.section className={`tshirtStage ${variant}`} layout transition={stageTransition}>
      {size ? <SizeBadge size={size} /> : null}
      <motion.img
        className="shirtAsset"
        src={showBackName ? "/assets/figma/shirt-back-zoom.png" : variant === "zoom" ? "/assets/figma/shirt-front-zoom.png" : "/assets/figma/shirt-front.png"}
        alt=""
      />
      {showFrontWords ? (
        <div className="shirtWordOverlay">
          {words.filter(Boolean).map((word, index) => (
            <motion.span
              key={`${index}-${word}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              {word}
            </motion.span>
          ))}
        </div>
      ) : null}
      {showBackName && participant ? (
        <BackNameMark draft={backNameDraft} />
      ) : null}
    </motion.section>
  );
}

function ProgressStrip({ activeStep }: { activeStep: number }) {
  return (
    <div className="progressStrip" aria-label={`Шаг ${activeStep} из 5`}>
      {steps.map((item) => {
        const completed = item < activeStep || activeStep > 5;
        const active = item === activeStep;
        return (
          <motion.div
            layout
            key={item}
            className={completed ? "progressSegment completed" : active ? "progressSegment active" : "progressSegment"}
            style={{ zIndex: item }}
            transition={stageTransition}
          >
            Шаг {item}
          </motion.div>
        );
      })}
    </div>
  );
}

function IdentifyStep({
  query,
  results,
  submittedSlugs,
  onQueryChange,
  onChoose,
}: {
  query: string;
  results: ReturnType<typeof searchParticipants>;
  submittedSlugs: Set<string>;
  onQueryChange: (value: string) => void;
  onChoose: (participant: Participant) => void;
}) {
  return (
    <StepContent>
      <h2>Найди себя</h2>
      <label className="searchField">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Имя, Фамилия"
          autoComplete="name"
        />
      </label>
      <div className="searchResults">
        {query.trim().length < 2 ? (
          <p className="emptySearch">
            Начни вводить имя.
            <br />
            Можно на русском, украинском или английском
          </p>
        ) : results.length ? (
          results.slice(0, 4).map(({ participant, score }, index) => (
            <motion.button
              className="resultCard"
              key={participant.slug}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035, duration: 0.22 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChoose(participant)}
            >
              <Avatar participant={participant} />
              <span>
                <strong>{participant.displayName}</strong>
                <small>{submittedSlugs.has(participant.slug) ? "уже создал(а)" : `${Math.max(0, Math.round((1 - score) * 100))}% совпадение`}</small>
              </span>
              <ChevronRight size={17} />
            </motion.button>
          ))
        ) : (
          <p className="emptySearch">Точно не вижу тебя. Попробуй фамилию или английское написание.</p>
        )}
      </div>
    </StepContent>
  );
}

function SizeStep({
  participant,
  selectedSize,
  onSelect,
  onBack,
  onNext,
}: {
  participant: Participant;
  selectedSize: ShirtSize | null;
  onSelect: (size: ShirtSize) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <StepContent>
      <h2>Выбери свой размер</h2>
      <div className="helloCard">
        <Avatar participant={participant} />
        <span>
          <small>Привет 👋</small>
          <strong>{participant.firstName}</strong>
        </span>
        <span className="helloCardCheck" aria-hidden="true">
          <Check size={16} strokeWidth={3} />
        </span>
      </div>
      <div className="sizeGridNew">
        {sizes.map((item) => (
          <motion.button
            key={item}
            className={selectedSize === item ? "sizeTile selected" : "sizeTile"}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(item)}
          >
            {item}
          </motion.button>
        ))}
      </div>
      <StepButtons>
        <BackButton onClick={onBack} />
        <PrimaryAction disabled={!selectedSize} onClick={onNext}>
          Дальше <ChevronRight size={18} />
        </PrimaryAction>
      </StepButtons>
    </StepContent>
  );
}

function WordsStep({
  words,
  onWordsChange,
  onBack,
  onNext,
}: {
  words: string[];
  onWordsChange: (words: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const nextEmptyIndex = words.findIndex((word) => !word.trim());
  const activeIndex = nextEmptyIndex === -1 ? 2 : nextEmptyIndex;

  return (
    <StepContent>
      <h2 className="wordsTitle">Что создаёшь? [3 слова]</h2>
      <div className="wordIntro">
        <strong>Примеры:</strong>
        <p>Ответственность, Любовь, Лидерство, Значимость, Сила, Забота, Поддержка, и тд...</p>
        <span>
          <Info size={15} /> Каждое слово - до 20 символов
        </span>
      </div>
      <div className="wordInputs">
        {words.map((word, index) => {
          const completed = Boolean(word.trim()) && index < activeIndex || words.every(Boolean);
          return (
            <label className={completed ? "wordInput completed" : index === activeIndex ? "wordInput active" : "wordInput"} key={index}>
              <span>{index + 1}</span>
              <input
                value={word}
                maxLength={20}
                disabled={index > activeIndex}
                placeholder={`Слово #${index + 1}`}
                onChange={(event) => {
                  const next = [...words];
                  next[index] = event.target.value;
                  onWordsChange(next);
                }}
              />
              {completed ? <Check size={18} /> : null}
            </label>
          );
        })}
      </div>
      <StepButtons>
        <BackButton onClick={onBack} />
        <PrimaryAction disabled={!words.every((word) => word.trim())} onClick={onNext}>
          Дальше <ChevronRight size={18} />
        </PrimaryAction>
      </StepButtons>
    </StepContent>
  );
}

function InitialsStep({
  language,
  backNameDraft,
  onLanguageChange,
  onBackNameChange,
  onBack,
  onNext,
}: {
  language: InitialsLanguage;
  backNameDraft: BackNameDraft;
  onLanguageChange: (language: InitialsLanguage) => void;
  onBackNameChange: (field: keyof BackNameDraft, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <StepContent>
      <h2 className="initialsTitle">Инициалы на спине</h2>
      <p className="initialsDescription">
        Всё уже продумано 👌, выбери только на каком языке ты хочешь надпись и верно ли написано имя. На выбор 3 опции:
      </p>
      <div className="languageBadges" aria-label="Язык надписи на спине">
        {languages.map((item) => (
          <button
            key={item}
            className={language === item ? "languageBadge selected" : "languageBadge"}
            type="button"
            onClick={() => onLanguageChange(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="backNameFields">
        <label>
          <span>Имя</span>
          <input
            value={backNameDraft.firstName}
            maxLength={40}
            onChange={(event) => onBackNameChange("firstName", event.target.value)}
          />
        </label>
        <label>
          <span>Фамилия</span>
          <input
            value={backNameDraft.lastName}
            maxLength={40}
            onChange={(event) => onBackNameChange("lastName", event.target.value)}
          />
        </label>
      </div>
      <p className="languagePreviewNote">Смотри на футболку сверху: надпись меняется сразу после выбора языка.</p>
      <StepButtons>
        <BackButton onClick={onBack} />
        <PrimaryAction onClick={onNext}>
          Дальше <ChevronRight size={18} />
        </PrimaryAction>
      </StepButtons>
    </StepContent>
  );
}

function TelegramHint() {
  return (
    <a className="telegramHint flowStackTelegramHint" href="https://t.me/Makkov69" target="_blank" rel="noreferrer">
      <FilledWarningIcon />
      <span className="telegramHintText">Если обнаружил ошибку в своём имени - напиши мне в тг!</span>
      <img className="telegramHintLogo" src="/assets/figma/telegram-icon.svg" alt="" />
    </a>
  );
}

function ConfirmStep({
  participant,
  size,
  words,
  initialsLanguage,
  backNameText,
  isSubmitting,
  canConfirm,
  errorMessage,
  onBack,
  onSubmit,
}: {
  participant: Participant;
  size: ShirtSize;
  words: string[];
  initialsLanguage: InitialsLanguage;
  backNameText: string;
  isSubmitting: boolean;
  canConfirm: boolean;
  errorMessage: string;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <StepContent>
      <h2>Итоговая проверка</h2>
      <dl className="summaryList">
        <div className="summaryGroup">
          <div className="summaryRow">
            <dt>Имя лидера</dt>
            <dd>{participant.displayName}</dd>
          </div>
        </div>
        <div className="summaryGroup">
          <div className="summaryRow">
            <dt>Размер</dt>
            <dd>{size}</dd>
          </div>
        </div>
        <div className="summaryGroup">
          {words.map((word, index) => (
            <div className="summaryRow" key={`${index}-${word}`}>
              <dt>Слово #{index + 1}</dt>
              <dd>{word}</dd>
            </div>
          ))}
        </div>
        <div className="summaryGroup">
          <div className="summaryRow">
            <dt>Язык инициалов (спина)</dt>
            <dd>{initialsLanguage}</dd>
          </div>
          <div className="summaryRow">
            <dt>Надпись на спине</dt>
            <dd>{backNameText}</dd>
          </div>
        </div>
      </dl>
      <StepButtons>
        <BackButton onClick={onBack} />
        <PrimaryAction disabled={!canConfirm || isSubmitting} onClick={onSubmit}>
          <Check size={18} /> {isSubmitting ? "Сохраняю" : "Подтверждаю"}
        </PrimaryAction>
      </StepButtons>
      {errorMessage ? <p className="inlineError">{errorMessage}</p> : null}
    </StepContent>
  );
}

function CompleteStep({
  canEdit,
  onEdit,
}: {
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <StepContent>
      <h2 className="successTitle">Футболка создана!</h2>
      <p className="successCopy">Твой дизайн успешно улетел в общую сетку. Теперь ждем остальных создателей!</p>
      {canEdit ? (
        <button className="editDecisionButton" type="button" onClick={onEdit}>
          <RotateCcw size={18} /> Поменять решение
        </button>
      ) : null}
    </StepContent>
  );
}

function SuccessConfetti({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animation: import("lottie-web").AnimationItem | null = null;
    let fallbackTimeoutId = 0;
    let isCancelled = false;

    async function playConfetti() {
      const lottie = (await import("lottie-web")).default;

      if (!containerRef.current || isCancelled) {
        return;
      }

      animation = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: false,
        autoplay: true,
        path: "/assets/lottie/congrats.json",
        rendererSettings: {
          preserveAspectRatio: "xMidYMin slice",
        },
      });
      animation.addEventListener("complete", onComplete);
      fallbackTimeoutId = window.setTimeout(onComplete, 5200);
    }

    void playConfetti();

    return () => {
      isCancelled = true;
      window.clearTimeout(fallbackTimeoutId);
      animation?.removeEventListener("complete", onComplete);
      animation?.destroy();
    };
  }, [onComplete]);

  return (
    <div className="successConfetti" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  );
}

function AlreadyCompletedPanel({ participant }: { participant: Participant }) {
  return (
    <section className="flowCard duplicatePanel">
      <h2>Вторая футболка не пройдет! 🙅</h2>
      <p>Эта ЛЕГЕНДАРНАЯ футболка уже была сотворена своим СОЗДАТЕЛЕМ! Вторую вселенную пока не запускаем!</p>
      <img src="/assets/gifs/gif-1.gif" alt="" />
      <p className="duplicateName">{participant.displayName}</p>
    </section>
  );
}

function ReadinessBlock({
  participants,
  submissions,
  completedCount,
}: {
  participants: Participant[];
  submissions: Submission[];
  completedCount: number;
}) {
  const submissionBySlug = new Map(submissions.map((submission) => [submission.participantSlug, submission]));
  const sizeCounts = sizes.map((item) => ({
    size: item,
    count: submissions.filter((submission) => submission.size === item).length,
  }));

  return (
    <section className="readinessCard" aria-label="Общая готовность">
      <div className="readinessMeta">
        <div className="readinessHeader">
          <p>Общая готовность</p>
        </div>
        <div className="readinessCounter">
          <strong>{completedCount}</strong>
          <i>/</i>
          <strong>{participants.length}</strong>
        </div>
        <div className="sizeChips">
          {sizeCounts.map((item) => (
            <span key={item.size}>
              <strong>{item.size}</strong>
              <em>{item.count}</em>
            </span>
          ))}
        </div>
      </div>
      <div className="readinessList" aria-label="Список участников">
        <div className="readinessListTrack">
          {participants.map((participant) => {
            const submission = submissionBySlug.get(participant.slug);
            return (
              <motion.div className={submission ? "readinessUser completed" : "readinessUser"} key={participant.slug}>
                <Avatar participant={participant} />
                <span>
                  <strong>{participant.displayName}</strong>
                  <small>{submission ? submission.words.join(" / ") : "Ожидаем создателя"}</small>
                </span>
                {submission ? <b>{submission.size}</b> : null}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StepContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="stepContentNew"
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -12, filter: "blur(5px)" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function StepButtons({ children }: { children: React.ReactNode }) {
  return <div className="stepButtons">{children}</div>;
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button className="backButton" type="button" whileTap={{ scale: 0.96 }} onClick={onClick} aria-label="Назад">
      <ArrowLeft size={22} />
    </motion.button>
  );
}

function PrimaryAction({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      className="primaryAction"
      type="button"
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

function Avatar({ participant, compact = false }: { participant: Participant; compact?: boolean }) {
  const file = getAvatarFile(participant);

  return (
    <span className={compact ? "avatar compact" : "avatar"}>
      {file ? <img src={`/assets/avatars/${file}`} alt="" /> : null}
    </span>
  );
}

function SizeBadge({ size }: { size: ShirtSize }) {
  return <span className="selectedSizeBadge">{size}</span>;
}

function FilledWarningIcon() {
  return (
    <span className="telegramHintWarning" aria-hidden="true">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3.75L29.42 27H2.58L16 3.75Z" fill="#F8BD6B" />
        <path d="M16 11.6V18.25" stroke="#0E0E0E" strokeWidth="2.35" strokeLinecap="round" />
        <path d="M16 23.35H16.02" stroke="#0E0E0E" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function BackNameMark({ draft }: { draft: BackNameDraft }) {
  return (
    <div className="backNameMark">
      <div className="backNameMarkText" aria-label={formatBackNameDraft(draft)}>
        <span>{draft.firstName}</span>
        <span>{draft.lastName}</span>
      </div>
    </div>
  );
}

function getStageVariant(step: CreatorStep) {
  if (step === "identify") {
    return "stepOne";
  }

  if (step === "size") {
    return "size";
  }

  if (step === "words") {
    return "words";
  }

  if (step === "initials") {
    return "back";
  }

  return "zoom";
}

function getActiveStep(step: CreatorStep, isBlocked: boolean) {
  if (isBlocked) {
    return 1;
  }

  if (step === "identify") return 1;
  if (step === "size") return 2;
  if (step === "words") return 3;
  if (step === "initials") return 4;
  if (step === "confirm") return 5;
  if (step === "complete") return 6;
  return 1;
}

function getBackNameAssetPath(participant: Participant, language: InitialsLanguage) {
  return `/assets/generated/back-names/${participant.slug}/${language.toLowerCase()}.svg`;
}

function getBackNameText(participant: Participant, language: InitialsLanguage) {
  const variants = backNameVariantBySlug[participant.slug];
  const localizedName = variants?.[language];

  if (localizedName) {
    return localizedName;
  }

  if (language === "EN") {
    return transliterate(`${participant.firstName} ${participant.lastName}`);
  }

  return `${participant.firstName} ${participant.lastName}`;
}

function createBackNameDrafts(participant: Participant, submission?: Submission | null) {
  const drafts = languages.reduce((current, language) => {
    current[language] = splitBackNameText(getBackNameText(participant, language));
    return current;
  }, {} as Record<InitialsLanguage, BackNameDraft>);

  if (submission?.backNameFirstName || submission?.backNameLastName) {
    drafts[submission.initialsLanguage] = {
      firstName: submission.backNameFirstName || drafts[submission.initialsLanguage].firstName,
      lastName: submission.backNameLastName || drafts[submission.initialsLanguage].lastName,
    };
  }

  return drafts;
}

function splitBackNameText(value: string): BackNameDraft {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function formatBackNameDraft(draft: BackNameDraft) {
  return [draft.firstName.trim(), draft.lastName.trim()].filter(Boolean).join(" ");
}

function transliterate(value: string) {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "h",
    ґ: "g",
    д: "d",
    е: "e",
    ё: "yo",
    є: "ye",
    ж: "zh",
    з: "z",
    и: "y",
    і: "i",
    ї: "yi",
    й: "i",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ь: "",
    ы: "y",
    ъ: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  return value
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();
      const next = map[lower] ?? char;
      return char === lower ? next : next.charAt(0).toUpperCase() + next.slice(1);
    })
    .join("");
}

function upsertSubmission(current: Submission[], submission: Submission) {
  return [...current.filter((item) => item.participantSlug !== submission.participantSlug), submission];
}

function getCongratsGifNumber(participant: Participant) {
  const gifSet = femaleParticipantSlugs.has(participant.slug) ? femaleCongratsGifs : maleCongratsGifs;
  return gifSet[getStableIndex(participant.slug, gifSet.length)];
}

function getStableIndex(value: string, count: number) {
  const hash = value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return hash % count;
}

const stageTransition = {
  type: "spring",
  stiffness: 120,
  damping: 22,
  mass: 0.8,
} as const;
