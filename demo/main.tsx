import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChatStep } from "../src/chat-step/ui/ChatStep";
import { httpTransport } from "../src/chat-step/client/http-transport";
import type { Session } from "../src/chat-step/types";
import { VisualResult } from "../src/features/visual/VisualResult";
import {
  canCompleteVisual,
  type VisualDraft,
} from "../src/features/visual/model";
import { codexHttpTransport } from "../src/codex-connection/client/http-transport";
import { TemplateTabs } from "./template-tabs";
import { ConnectionSource } from "./connection-source";
import { ConnectionExample } from "./connection-example";
import { TemplateGallery } from "./template-gallery";
import { SourceGuide } from "./source-guide";
import "../src/chat-step/ui/chat-step.css";
import "./demo.css";
function Demo() {
  const [route, setRoute] = useState(location.hash);
  const kind = route.startsWith("#style") ? "style" : "character";
  const connectionPage = route.startsWith("#connection");
  const guide = route.endsWith("/source") || route === "#source";
  const gallery = !["#character", "#style", "#connection", "#source"].some(path => route === path || route.startsWith(path + "/"));
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [finished, setFinished] = useState<Session<VisualDraft>>();
  useEffect(() => {
    const sync = () => setRoute(location.hash);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => setFinished(undefined), [kind]);
  useEffect(() => {
    void fetch("/api/bootstrap")
      .then((r) => r.json())
      .then((data) => setToken(data.token))
      .catch((e) => setError(e.message));
  }, []);
  const transport = useMemo(
    () => httpTransport<VisualDraft>(`/api/steps/${kind}`, token),
    [kind, token],
  );
  const connectionTransport = useMemo(() => codexHttpTransport("/api/codex", token), [token]);
  return (
    <div className="demo-app">
      <header className="demo-header">
        <a className="demo-brand" href="#templates">
          <span aria-hidden="true">◒</span> Agent templates
        </a>
      </header>
      {gallery ? <TemplateGallery /> : <TemplateTabs
        base={connectionPage ? "connection" : kind}
        source={guide}
        sourcePanel={connectionPage ? <ConnectionSource /> : <SourceGuide />}
      >
        {error ? <p role="alert">{error}</p> : !token ? <p role="status">Loading demo…</p> : connectionPage ?
          <ConnectionExample transport={connectionTransport} token={token} /> : (
          <main>
            <div className="demo-variants" aria-label="Chat examples">
              <button aria-pressed={kind === "character"} onClick={() => { location.hash = "character"; }}>Character example</button>
              <button aria-pressed={kind === "style"} onClick={() => { location.hash = "style"; }}>Style example</button>
            </div>
            <ol className="demo-stepper" aria-label="Example workflow">
              <li>
                1 <span>Choose a starting point</span>
              </li>
              <li aria-current="step">
                2 <span>Create your {kind}</span>
              </li>
              <li>
                3 <span>Use your result</span>
              </li>
            </ol>
            {finished ? (
              <section className="demo-finished">
                <h1>Your {kind} is ready.</h1>
                <p>
                  This example’s completion callback received the selected
                  result. Your app can save it or advance its stepper here.
                </p>
                <img
                  src={
                    finished.result.versions.find(
                      (v) => v.id === finished.result.selectedId,
                    )?.url
                  }
                  alt="Accepted result"
                />
                <button onClick={() => setFinished(undefined)}>
                  Keep refining
                </button>
              </section>
            ) : (
              <ChatStep
                key={kind}
                transport={transport}
                title={`Create your ${kind}`}
                description={
                  kind === "character"
                    ? "Find the personality. Shape the details. Make it yours."
                    : "Explore a visual direction, then refine it on one sample."
                }
                resultTitle={
                  kind === "character" ? "Your character" : "Your style sample"
                }
                empty={
                  <div className="demo-welcome">
                    <span aria-hidden="true">◒</span>
                    <h3>
                      {kind === "character"
                        ? "Who are we bringing to life?"
                        : "What should it feel like?"}
                    </h3>
                    <p>
                      {kind === "character"
                        ? "Tell me a little about your character, or ask for ideas. We can discuss it before drawing anything."
                        : "Ask about different styles, or describe a look. When you ask for a sample, it will appear alongside our conversation."}
                    </p>
                    <p className="demo-hint">
                      Try:{" "}
                      {kind === "character"
                        ? "“What personality would suit a little pink blob?”"
                        : "“What would make this feel calmer?”"}
                    </p>
                  </div>
                }
                result={(props) => <VisualResult {...props} />}
                canComplete={canCompleteVisual}
                completeLabel={`Use this ${kind}`}
                onComplete={setFinished}
              />
            )}
            <p className="demo-note">
              Live demo · Messages use your local Codex account. Images are
              generated only when requested.
            </p>
          </main>
        )}
      </TemplateTabs>}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>,
);
