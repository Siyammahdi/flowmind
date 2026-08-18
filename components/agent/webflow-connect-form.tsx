"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { WebflowSiteSummary, WebflowUserSummary } from "@/lib/webflow/sites";

type WebflowConnectFormProps = {
  oauthEnabled: boolean;
  onConnected: (sites: WebflowSiteSummary[], user?: WebflowUserSummary) => void;
};

export function WebflowConnectForm({
  oauthEnabled,
  onConnected,
}: WebflowConnectFormProps) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(!oauthEnabled);

  async function connectWithToken() {
    setSaving(true);
    try {
      const response = await fetch("/api/webflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const body = (await response.json()) as {
        message?: string;
        sites?: WebflowSiteSummary[];
        user?: WebflowUserSummary | null;
      };
      if (!response.ok) {
        throw new Error(body.message || "Unable to connect to Webflow.");
      }
      onConnected(body.sites ?? [], body.user ?? undefined);
      setToken("");
      toast.success("Webflow project connected");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to connect to Webflow. Please reconnect and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <a
        href="/api/webflow/oauth"
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        Log in with Webflow
      </a>
      <p className="text-sm leading-6 text-muted-foreground">
        Sign in with your Webflow profile and pick the sites the agent can
        edit. Completes on the deployed Flowmind URL.
      </p>
      <FieldSeparator>or</FieldSeparator>
      {showToken ? (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="webflow-token">Site API token</FieldLabel>
            <Input
              id="webflow-token"
              type="password"
              autoComplete="off"
              value={token}
              placeholder="Paste a site token"
              onChange={(event) => setToken(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && token.trim()) {
                  event.preventDefault();
                  void connectWithToken();
                }
              }}
            />
            <FieldDescription>
              Only needed if login is unavailable. Create a token in Site
              settings → Apps & integrations → API access.
            </FieldDescription>
          </Field>
          <Button
            variant="secondary"
            onClick={() => void connectWithToken()}
            disabled={saving || token.trim().length === 0}
          >
            {saving ? <Spinner data-icon="inline-start" /> : null}
            {saving ? "Connecting" : "Connect with token"}
          </Button>
        </FieldGroup>
      ) : (
        <Button variant="ghost" onClick={() => setShowToken(true)}>
          Use a site token instead
        </Button>
      )}
    </div>
  );
}
