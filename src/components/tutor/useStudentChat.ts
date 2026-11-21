import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_HINT_LEVEL, MAX_MESSAGE_CHARS } from '../../../shared/config';
import type {
  ChatMessage,
  HintLevel,
  PublicStudentProfile,
  SpeechLanguageCode,
} from '../../../shared/types';
import {
  type EncodedImageAttachment,
  loadSampleImageAttachment,
  readFileAsImageAttachment,
  SAMPLE_MATH_HOMEWORK_URL,
} from '../../utils/imageHelper';
import {
  type BrowserSpeechRecognition,
  combineLiveTranscript,
  formatSpeechError,
  getSpeechRecognitionConstructor,
  inferSpeechLanguageFromProfile,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  pickMatchingVoice,
  stripMarkdownForSpeech,
} from '../../utils/speech';

const HINT_LADDER_PROMPTS: Record<HintLevel, string> = {
  1: "I'm stuck on this problem. Please give me a Level 1 guiding question without giving the answer.",
  2: "I'm still stuck. Please show me a Level 2 similar worked example with different numbers, without solving my exact problem.",
  3: "I'm still stuck. Please show me ONLY the very first step (Level 3 hint) and let me finish the rest without revealing the final answer.",
};

export interface UseStudentChatParams {
  students: PublicStudentProfile[];
  selectedStudentId: string;
  onSelectStudentId: (id: string) => void;
  onSendMessage: (
    text: string,
    attachment?: EncodedImageAttachment,
    hintLevel?: HintLevel
  ) => Promise<void>;
  onResetChat: () => void;
  draftPrompt: string;
  onConsumeDraftPrompt?: () => void;
  isLoading: boolean;
}

/**
 * Encapsulates composer state, Web Speech API dictation/read-aloud, canvas
 * image compression, draft prompt sync, and 3-level Hint Ladder state for the
 * Student Tutor workspace.
 */
export function useStudentChat({
  students,
  selectedStudentId,
  onSelectStudentId,
  onSendMessage,
  onResetChat,
  draftPrompt,
  onConsumeDraftPrompt,
  isLoading,
}: UseStudentChatParams) {
  const initialStudent =
    students.find((s) => s.id === selectedStudentId) ?? students[0];
  const activeStudentKey = initialStudent
    ? `${initialStudent.id}:${initialStudent.preferredLanguage}`
    : '';

  const [inputText, setInputText] = useState(draftPrompt);
  const [appliedDraft, setAppliedDraft] = useState(draftPrompt);
  const [attachment, setAttachment] = useState<EncodedImageAttachment | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [trackedStudentId, setTrackedStudentId] = useState(selectedStudentId);
  const [trackedStudentKey, setTrackedStudentKey] = useState(activeStudentKey);
  const [speechLang, setSpeechLang] = useState<SpeechLanguageCode>(() =>
    inferSpeechLanguageFromProfile(initialStudent?.preferredLanguage)
  );
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const baseInputBeforeSpeechRef = useRef<string>('');

  const speechRecognitionSupported = isSpeechRecognitionSupported();
  const speechSynthesisSupported = isSpeechSynthesisSupported();
  const hasAnyVoiceFeature = speechRecognitionSupported || speechSynthesisSupported;

  if (draftPrompt !== appliedDraft) {
    setAppliedDraft(draftPrompt);
    if (draftPrompt) {
      setInputText(draftPrompt);
    }
  }

  if (selectedStudentId !== trackedStudentId) {
    setTrackedStudentId(selectedStudentId);
    setHintLevel(0);
  }

  if (activeStudentKey && activeStudentKey !== trackedStudentKey) {
    setTrackedStudentKey(activeStudentKey);
    setSpeechLang(inferSpeechLanguageFromProfile(initialStudent?.preferredLanguage));
  }

  const activeStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? students[0],
    [students, selectedStudentId]
  );

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignore already-stopped recognition instances
      }
    }
    setIsListening(false);
  }, []);

  const stopReadingAloud = useCallback(() => {
    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  }, []);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // Ignore teardown errors
        }
      }
      if (isSpeechSynthesisSupported()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (draftPrompt && onConsumeDraftPrompt) {
      onConsumeDraftPrompt();
      inputRef.current?.focus();
    }
  }, [draftPrompt, onConsumeDraftPrompt]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
      inputRef.current?.focus();
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) return;

    setSpeechError(null);
    stopReadingAloud();

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = speechLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      baseInputBeforeSpeechRef.current = inputText.trim();

      recognition.onresult = (event) => {
        const nextText = combineLiveTranscript(
          baseInputBeforeSpeechRef.current,
          event.results
        ).slice(0, MAX_MESSAGE_CHARS);
        setInputText(nextText);
      };

      recognition.onerror = (event) => {
        const message = formatSpeechError(event.error);
        if (message) {
          setSpeechError(message);
        }
        recognitionRef.current = null;
        setIsListening(false);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);
        inputRef.current?.focus();
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setSpeechError(
        'Could not start voice input. Please check microphone permissions and try again.'
      );
    }
  };

  const handleToggleReadAloud = useCallback(
    (msg: ChatMessage) => {
      if (!isSpeechSynthesisSupported()) return;

      const synth = window.speechSynthesis;
      const wasSpeakingThis = speakingMessageId === msg.id;
      synth.cancel();

      if (wasSpeakingThis) {
        setSpeakingMessageId(null);
        return;
      }

      const spokenText = stripMarkdownForSpeech(msg.text);
      if (!spokenText) return;

      setSpeechError(null);
      const utterance = new window.SpeechSynthesisUtterance(spokenText);
      utterance.lang = speechLang;

      const voices = typeof synth.getVoices === 'function' ? synth.getVoices() : [];
      const matchedVoice = pickMatchingVoice(voices, speechLang);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onend = () => {
        setSpeakingMessageId((current) => (current === msg.id ? null : current));
      };
      utterance.onerror = () => {
        setSpeakingMessageId((current) => (current === msg.id ? null : current));
      };

      setSpeakingMessageId(msg.id);
      synth.speak(utterance);
    },
    [speakingMessageId, speechLang]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsCompressing(true);
    try {
      const encoded = await readFileAsImageAttachment(file);
      setAttachment(encoded);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to attach photo.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleAttachSampleHomework = async () => {
    setUploadError(null);
    setIsCompressing(true);
    try {
      const sample = await loadSampleImageAttachment(
        SAMPLE_MATH_HOMEWORK_URL,
        'math_homework_notebook.jpg'
      );
      setAttachment(sample);
      if (!inputText.trim()) {
        setInputText('Please check my notebook photo and help me solve problem 1.');
      }
      inputRef.current?.focus();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not load sample homework photo.'
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isCompressing || !activeStudent) return;
    const trimmed = inputText.trim();
    if (!trimmed && !attachment) return;
    if (isListening) {
      stopListening();
    }
    const currentAttachment = attachment ?? undefined;
    setInputText('');
    setAttachment(null);
    setSpeechError(null);
    setHintLevel(0);
    inputRef.current?.focus();
    await onSendMessage(trimmed, currentAttachment);
    inputRef.current?.focus();
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isLoading || isCompressing || !activeStudent) return;
    setHintLevel(0);
    await onSendMessage(prompt);
    inputRef.current?.focus();
  };

  const handleImStuck = async () => {
    if (isLoading || isCompressing || !activeStudent || hintLevel >= MAX_HINT_LEVEL) {
      return;
    }
    const nextLevel = (hintLevel + 1) as HintLevel;
    setHintLevel(nextLevel);
    await onSendMessage(HINT_LADDER_PROMPTS[nextLevel], undefined, nextLevel);
    inputRef.current?.focus();
  };

  const handleChangeStudent = (id: string) => {
    stopListening();
    stopReadingAloud();
    onSelectStudentId(id);
  };

  const handleReset = () => {
    stopListening();
    stopReadingAloud();
    setHintLevel(0);
    onResetChat();
  };

  const handleChangeSpeechLang = (nextLang: SpeechLanguageCode) => {
    setSpeechLang(nextLang);
    if (isListening) {
      stopListening();
    }
    if (speakingMessageId) {
      stopReadingAloud();
    }
  };

  const handleChangeInputText = (value: string) => {
    if (isListening) {
      stopListening();
    }
    setInputText(value);
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    inputRef.current?.focus();
  };

  return {
    activeStudent,
    inputText,
    attachment,
    isCompressing,
    uploadError,
    speechError,
    hintLevel,
    speechLang,
    isListening,
    speakingMessageId,
    speechRecognitionSupported,
    speechSynthesisSupported,
    hasAnyVoiceFeature,
    fileInputRef,
    inputRef,
    handleToggleListening,
    handleToggleReadAloud,
    handleFileChange,
    handleAttachSampleHomework,
    handleSubmit,
    handleQuickPrompt,
    handleImStuck,
    handleChangeStudent,
    handleReset,
    handleChangeSpeechLang,
    handleChangeInputText,
    handleRemoveAttachment,
  };
}
