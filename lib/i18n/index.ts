import {getRequestConfig} from 'next-intl/server';

import {formats} from './requests';

export default getRequestConfig(async () => {
  // Static for now, we'll change this later
  const locale = 'th';

  return {
    locale,
    formats,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
