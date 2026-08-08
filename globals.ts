import { formats } from '@/lib/i18n/requests';
import messages from './messages/th.json';

type Locales = readonly ['th'];
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locales[number];
    Messages: typeof messages;
    Formats: typeof formats;
  }
}