"use client";

import { ArrowUpIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

type PromptInputProps = {
  value: string;
  running: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function PromptInput({
  value,
  running,
  onChange,
  onSubmit,
}: PromptInputProps) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <InputGroup className="min-h-24 rounded-2xl border-border bg-background shadow-sm">
        <InputGroupTextarea
          value={value}
          disabled={running}
          rows={3}
          placeholder="Ask Flowmind to inspect or edit a Webflow site"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <InputGroupAddon align="block-end" className="justify-end px-2 pb-2">
          <InputGroupButton
            type="submit"
            variant="default"
            size="sm"
            disabled={running || value.trim().length === 0}
          >
            {running ? <Spinner data-icon="inline-start" /> : <ArrowUpIcon data-icon="inline-start" />}
            {running ? "Working" : "Send"}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
