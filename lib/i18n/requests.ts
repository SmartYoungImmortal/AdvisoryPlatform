import {Formats} from 'next-intl';

export const formats = {
  dateTime: {
    short: {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }
  },
  number: {
    precise: {
      maximumFractionDigits: 5
    },
    baht: {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0
    }
  },
  list: {
    enumeration: {
      style: 'long',
      type: 'conjunction'
    }
  },
  displayName: {
    region: {
      type: 'region'
    }
  }
} satisfies Formats;
