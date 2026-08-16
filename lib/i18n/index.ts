import {getRequestConfig} from 'next-intl/server';

import messages from '../../messages/th.json';
import {formats} from './requests';

/**
 * The message file is imported statically, not as `import(\`…/${locale}.json\`)`.
 *
 * There is one locale, so the template bought nothing — and it cost a real bug:
 * a dynamic specifier resolves to a context module the dev server does not treat
 * as an edge from this file, so adding a key to `messages/th.json` did not
 * invalidate anything and every new key rendered as `MISSING_MESSAGE` until the
 * server was restarted. A static import is a tracked edge and hot-reloads.
 *
 * Adding a second locale means a `Record<Locale, Messages>` of static imports
 * here, not a return to the template.
 */
export default getRequestConfig(async () => ({
  locale: 'th',
  formats,
  messages
}));
