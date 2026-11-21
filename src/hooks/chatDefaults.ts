import { WELCOME_MESSAGE_IDS } from '../../shared/config';
import type { ChatMessage } from '../../shared/types';

/** Formats the current local time in `en-IN` 12-hour format for chat message timestamps. */
export function formatNowTime(): string {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Creates the initial bilingual welcome message for Student Tutor chats. */
export function createInitialStudentMessages(): ChatMessage[] {
  return [
    {
      id: WELCOME_MESSAGE_IDS.STUDENT,
      role: 'assistant',
      text: 'Namaste! Main Shiksha-Agent hoon. Aap mujhse Math, Science ya kisi bhi subject ka sawal Hindi, Tamil, Marathi ya English mein pooch sakte ho — ya apni notebook ki photo bhej sakte ho.\n\nMain seedha jawab dene ke bajay chhote-chhote sawalon se aapki madad karunga taaki aap khud solve kar sako!',
      timestamp: formatNowTime(),
    },
  ];
}

/** Creates the initial welcome message for Teacher Aide chats. */
export function createInitialTeacherMessages(): ChatMessage[] {
  return [
    {
      id: WELCOME_MESSAGE_IDS.TEACHER,
      role: 'assistant',
      text: 'Welcome to Shiksha-Agent Teacher Aide.\n\nShare a grade level and topic, or attach a textbook syllabus photo to generate a time-boxed lesson plan, printable bilingual worksheet with a separate-page answer key, or targeted student intervention.',
      timestamp: formatNowTime(),
    },
  ];
}
