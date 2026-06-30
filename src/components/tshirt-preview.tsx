"use client";

import { motion } from "motion/react";
import type { ShirtSize } from "@/lib/types";

type ShirtPreviewProps = {
  firstName: string;
  lastName: string;
  size?: ShirtSize;
  words: string[];
  compact?: boolean;
};

export function TShirtPreview({ firstName, lastName, size, words, compact = false }: ShirtPreviewProps) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "ТВОЕ ИМЯ";
  const filledWords = words.map((word) => word.trim()).filter(Boolean);

  return (
    <motion.div
      className={compact ? "shirtPreview compact" : "shirtPreview"}
      layout
      aria-label="Предпросмотр футболки"
    >
      <div className="shirtShape">
        <div className="shirtNeck" />
        <div className="shirtSleeve left" />
        <div className="shirtSleeve right" />
        <div className="shirtBody">
          <div className="shirtTopline">ЛП-7</div>
          <div className="shirtTeam">СОЗДАТЕЛИ</div>
          <div className="shirtName">{fullName}</div>
          <div className="shirtWords">
            {(filledWords.length ? filledWords : ["смелость", "ясность", "действие"]).slice(0, 3).map((word, index) => (
              <span key={`${index}-${word}`}>{word}</span>
            ))}
          </div>
          <div className="shirtMotto">СОЗДАЙ СЕБЯ, ЧТОБЫ СОЗДАТЬ МИР!</div>
          {size ? <div className="shirtSize">{size}</div> : null}
        </div>
      </div>
    </motion.div>
  );
}
