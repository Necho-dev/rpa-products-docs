'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckIcon, ChevronDownIcon, CopyIcon, ExternalLinkIcon, ServerIcon } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { cn } from '@/lib/cn';

interface Props {
  mcpUrl: string;
  className?: string;
}

export function AddMcpButton({ mcpUrl, className }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(mcpUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ color: 'secondary', size: 'sm' }),
          'gap-2 data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground',
          className,
        )}
      >
        <ServerIcon className="size-3.5 text-fd-muted-foreground" />
        MCP
        <ChevronDownIcon className="size-3.5 text-fd-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col p-1 min-w-[200px]">
        <button
          onClick={handleCopy}
          className="text-sm p-2 rounded-lg inline-flex items-center gap-2 hover:text-fd-accent-foreground hover:bg-fd-accent [&_svg]:size-4 w-full text-left"
        >
          {copied ? (
            <CheckIcon className="text-green-500" />
          ) : (
            <CopyIcon />
          )}
          Copy MCP Server URL
        </button>
        <Link
          href="/mcp/deeplink"
          target="_blank"
          className="text-sm p-2 rounded-lg inline-flex items-center gap-2 hover:text-fd-accent-foreground hover:bg-fd-accent [&_svg]:size-4"
        >
          <ExternalLinkIcon />
          Add MCP Server
          <ExternalLinkIcon className="text-fd-muted-foreground size-3.5 ms-auto" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}
