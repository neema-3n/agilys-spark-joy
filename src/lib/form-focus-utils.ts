import type { FocusEvent } from 'react';

type SelectableField = HTMLInputElement | HTMLTextAreaElement;

export const selectFieldContentOnFocus = (event: FocusEvent<SelectableField>) => {
  event.currentTarget.select();
};
