import { useEffect, useEffectEvent } from "react";

// server-sent events of the web ui (internal/ui/events.go): what to reload
// "open" also fires after a reconnect, events in between are lost
export type ServerEvent = "documents" | "passcode" | "open";

// one connection per tab, shared by everyone listening
let source: EventSource | null = null;
let listeners = 0;

export function useServerEvent(name: ServerEvent, onEvent: () => void) {
  const handler = useEffectEvent(onEvent);

  useEffect(() => {
    source ??= new EventSource("/ui/api/events");
    listeners++;
    const listener = () => handler();
    source.addEventListener(name, listener);
    return () => {
      source?.removeEventListener(name, listener);
      if (--listeners === 0) {
        source?.close();
        source = null;
      }
    };
  }, [name]);
}
