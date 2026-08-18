"use client";

import { PlayIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
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
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <InputGroup className="min-h-20 rounded-2xl bg-muted py-1 shadow-none backdrop-blur-sm">
        <InputGroupTextarea
          value={value}
          disabled={running}
          rows={2}
          placeholder="Describe a change for this Webflow project"
          className="px-4 pt-3 text-base leading-6"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <InputGroupAddon align="block-end" className="justify-end px-2 pb-2">
          <Button
            type="submit"
            disabled={running || value.trim().length === 0}
          >
            {running ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PlayIcon data-icon="inline-start" />
            )}
            {running ? "Working" : "Run agent"}
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
