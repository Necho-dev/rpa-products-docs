'use client';

import { useState } from 'react';
import {
  DefaultCollapsiblePanel,
  type CollapsiblePanelProps,
} from 'fumadocs-openapi/playground/client';
import { defineClientConfig } from 'fumadocs-openapi/ui/client';

function DocsApiPlaygroundPanel({
  open: openProp,
  onOpenChange,
  defaultOpen: _defaultOpen,
  ...props
}: CollapsiblePanelProps) {
  const [localOpen, setLocalOpen] = useState(true);
  const open = openProp === true || localOpen;

  return (
    <DefaultCollapsiblePanel
      {...props}
      open={open}
      onOpenChange={(next) => {
        setLocalOpen(next);
        onOpenChange?.(next);
      }}
    />
  );
}

export const docsApiClient = defineClientConfig({
  playground: {
    components: {
      CollapsiblePanel: DocsApiPlaygroundPanel,
    },
  },
});
