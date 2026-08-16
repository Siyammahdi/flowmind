"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { WebflowSiteSummary } from "@/lib/webflow/sites";

type WebflowConnectDialogProps = {
  open: boolean;
  oauthEnabled: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (sites: WebflowSiteSummary[]) => void;
};

export function WebflowConnectDialog({
  open,
  oauthEnabled,
  onOpenChange,
  onConnected,
}: WebflowConnectDialogProps) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

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
      };
      if (!response.ok) {
        throw new Error(body.message || "Unable to connect to Webflow.");
      }
      onConnected(body.sites ?? []);
      setToken("");
      onOpenChange(false);
      toast.success("Webflow connected");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to connect to Webflow. Please reconnect your Webflow account and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Webflow</DialogTitle>
          <DialogDescription>
            Paste a Site API token. Workspace tokens from Workspace API access
            cannot list or edit sites.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="webflow-token">Site API token</FieldLabel>
            <Input
              id="webflow-token"
              type="password"
              autoComplete="off"
              value={token}
              placeholder="Paste the site token"
              onChange={(event) => setToken(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <div className="text-sm leading-6 text-muted-foreground">
          <p>Create a Site token here:</p>
          <ol className="mt-2 list-decimal pl-5">
            <li>Open the Webflow site you want Flowmind to use.</li>
            <li>Go to Site settings → Apps & integrations.</li>
            <li>Scroll to API access and generate a token with sites:read and sites:write.</li>
          </ol>
          <p className="mt-3">
            You will not find “MCP Bridge App” in the marketplace. After the official
            Webflow MCP login window, it can appear under Designer → Apps on that
            site. Style and layout edits usually do not need it.
          </p>
        </div>
        <DialogFooter>
          {oauthEnabled ? (
            <a href="/api/webflow/oauth" className={buttonVariants({ variant: "outline" })}>
              Continue with Webflow
            </a>
          ) : null}
          <Button
            onClick={connectWithToken}
            disabled={saving || token.trim().length === 0}
          >
            {saving ? <Spinner data-icon="inline-start" /> : null}
            {saving ? "Connecting" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
