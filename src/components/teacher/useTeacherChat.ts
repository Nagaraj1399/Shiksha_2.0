import React, { useEffect, useRef, useState } from 'react';
import {
  type EncodedImageAttachment,
  loadSampleImageAttachment,
  readFileAsImageAttachment,
  SAMPLE_SCIENCE_SYLLABUS_URL,
} from '../../utils/imageHelper';

export interface UseTeacherChatParams {
  isLoading: boolean;
  draftPrompt: string;
  onConsumeDraftPrompt: () => void;
  onSendMessage: (text: string, attachment?: EncodedImageAttachment) => Promise<void>;
  onActivateAssistantTab: () => void;
}

/**
 * Encapsulates composer input, syllabus photo compression, sample syllabus
 * loading, and draft-prompt synchronization for Teacher Aide.
 */
export function useTeacherChat({
  isLoading,
  draftPrompt,
  onConsumeDraftPrompt,
  onSendMessage,
  onActivateAssistantTab,
}: UseTeacherChatParams) {
  const [inputText, setInputText] = useState(draftPrompt);
  const [appliedDraft, setAppliedDraft] = useState(draftPrompt);
  const [attachment, setAttachment] = useState<EncodedImageAttachment | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (draftPrompt !== appliedDraft) {
    setAppliedDraft(draftPrompt);
    if (draftPrompt) {
      setInputText(draftPrompt);
      onActivateAssistantTab();
    }
  }

  useEffect(() => {
    if (draftPrompt) {
      onConsumeDraftPrompt();
      inputRef.current?.focus();
    }
  }, [draftPrompt, onConsumeDraftPrompt]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsCompressing(true);
    try {
      const encoded = await readFileAsImageAttachment(file);
      setAttachment(encoded);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unable to attach syllabus photo.'
      );
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleAttachSampleSyllabus = async () => {
    setUploadError(null);
    setIsCompressing(true);
    try {
      const sample = await loadSampleImageAttachment(
        SAMPLE_SCIENCE_SYLLABUS_URL,
        'class6_science_syllabus.jpg'
      );
      setAttachment(sample);
      if (!inputText.trim()) {
        setInputText(
          'Generate a structured 40-minute bilingual lesson plan and quick diagnostic quiz from this textbook syllabus page, with a separate "## Answer Key" section.'
        );
      }
      inputRef.current?.focus();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not load sample syllabus photo.'
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isCompressing) return;
    const trimmed = inputText.trim();
    if (!trimmed && !attachment) return;
    const currentAttachment = attachment ?? undefined;
    setInputText('');
    setAttachment(null);
    inputRef.current?.focus();
    await onSendMessage(trimmed, currentAttachment);
    inputRef.current?.focus();
  };

  const handleTemplateClick = async (prompt: string) => {
    if (isLoading || isCompressing) return;
    await onSendMessage(prompt);
    inputRef.current?.focus();
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    inputRef.current?.focus();
  };

  return {
    inputText,
    setInputText,
    attachment,
    isCompressing,
    uploadError,
    fileInputRef,
    inputRef,
    handleFileChange,
    handleAttachSampleSyllabus,
    handleSubmit,
    handleTemplateClick,
    handleRemoveAttachment,
  };
}
