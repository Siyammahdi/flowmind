"use client";

import { toast } from "sonner";

import { WebflowConnectForm } from "@/components/agent/webflow-connect-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WebflowSiteSummary, WebflowUserSummary } from "@/lib/webflow/sites";

type WebflowConnectDialogProps = {
  open: boolean;
  oauthEnabled: boolean;
  connected: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (sites: WebflowSiteSummary[], user?: WebflowUserSummary) => void;
  onDisconnected: () => void;
};

export function WebflowConnectDialog({
  open,
  oauthEnabled,
  connected,
  onOpenChange,
  onConnected,
  onDisconnected,
}: WebflowConnectDialogProps) {
  async function disconnect() {
    await fetch("/api/webflow", { method: "DELETE" }); 
    onDisconnected();
    onOpenChange(false);
    toast.success("Webflow disconnected");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {connected ? "Webflow account" : "Log in to Webflow"}
          </DialogTitle>
          <DialogDescription>
            {connected
              ? "Switch accounts or disconnect this Webflow profile. "
              : "Log in so the agent can access your Webflow projects."}
          </DialogDescription>
        </DialogHeader>
        <WebflowConnectForm
          oauthEnabled={oauthEnabled}
          onConnected={(sites, user) => {
            onConnected(sites, user);
            onOpenChange(false);
          }}
        />
        {connected ? (
          <Button variant="outline" onClick={() => void disconnect()}>
            Log out of Webflow
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
