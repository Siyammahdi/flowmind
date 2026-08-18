"use client";

import { WebflowConnectForm } from "@/components/agent/webflow-connect-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WebflowSiteSummary, WebflowUserSummary } from "@/lib/webflow/sites";

type ConnectScreenProps = {
  oauthEnabled: boolean;
  onConnected: (sites: WebflowSiteSummary[], user?: WebflowUserSummary) => void;
};

export function ConnectScreen({
  oauthEnabled,
  onConnected,
}: ConnectScreenProps) {
  return (
    <div className="relative flex h-svh flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_70%)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-10">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium tracking-tight">Flowmind</p>
          <h1 className="font-heading text-4xl font-medium tracking-tight">
            Log in to Webflow
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            Sign in with your Webflow profile. The agent can then open and edit
            the projects on that account.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Webflow account</CardTitle>
            <CardDescription>
              One login. Then pick a project and run the agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebflowConnectForm
              oauthEnabled={oauthEnabled}
              onConnected={onConnected}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
