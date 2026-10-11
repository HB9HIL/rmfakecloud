import { useCallback, useEffect, useRef, useState } from "react";

import { getScreenshareOffer, getScreenshareRoom, sendScreenshareAnswer } from "../../api";
import type { SignalPayload } from "../../types";
import { FrameAssembler, hello, MSG, parseMessage, shutdown } from "./protocol";

export type Status = "waiting" | "connecting" | "streaming" | "error" | "disconnected";

const unwrap = (p?: SignalPayload) => (p?.type === "webtrc" && p.payload ? p.payload : p);

// The tablet offers a WebRTC data channel through the signaling rooms of the server.
// Frames are drawn into canvasRef, the pen position moves cursorRef.
export function useScreenShare() {
  const [status, setStatus] = useState<Status>("waiting");
  const [error, setError] = useState("");
  const [size, setSize] = useState({ width: 0, height: 0 });
  // manual rotation in degrees, the tablet's rotation messages add to it
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  const cleanup = useCallback(() => {
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
  }, []);

  // back to waiting for the tablet, unless the user ended the session
  const lost = useCallback(() => setStatus((s) => (s === "disconnected" ? s : "waiting")), []);

  const attachChannel = useCallback(
    (dc: RTCDataChannel) => {
      dc.binaryType = "arraybuffer";
      dcRef.current = dc;

      const canvas = canvasRef.current;
      let ctx: CanvasRenderingContext2D | null = null;
      let screenWidth = 0;
      let screenHeight = 0;
      let penX = 0;
      let penY = 0;
      let tabletRotation = 0;
      const assembler = new FrameAssembler();

      const resize = (w: number, h: number) => {
        screenWidth = w;
        screenHeight = h;
        if (!canvas) return;
        canvas.width = w;
        canvas.height = h;
        setSize({ width: w, height: h });
      };

      // the canvas is rotated by css, so rotate the pen position around its center
      const moveCursor = () => {
        const cursor = cursorRef.current;
        if (!cursor || !canvas) return;
        if (penX === 0 && penY === 0) {
          cursor.style.display = "none";
          return;
        }
        const rect = canvas.getBoundingClientRect();
        const rot = ((rotationRef.current % 360) + 360) % 360;
        const sideways = rot === 90 || rot === 270;
        const scaleX = (sideways ? rect.height : rect.width) / canvas.width;
        const scaleY = (sideways ? rect.width : rect.height) / canvas.height;
        const cx = (penX - canvas.width / 2) * scaleX;
        const cy = (penY - canvas.height / 2) * scaleY;
        const rad = (rot * Math.PI) / 180;
        const x = rect.left + rect.width / 2 + cx * Math.cos(rad) - cy * Math.sin(rad);
        const y = rect.top + rect.height / 2 + cx * Math.sin(rad) + cy * Math.cos(rad);
        cursor.style.display = "block";
        cursor.style.left = `${x - 4}px`;
        cursor.style.top = `${y - 4}px`;
      };

      dc.onopen = () => {
        dc.send(hello());
        // which path the stream takes (host, srflx or the TURN relay), for debugging
        pcRef.current?.getStats().then((stats) =>
          stats.forEach((s) => {
            if (s.type === "candidate-pair" && s.state === "succeeded") {
              console.log("[screenshare] peer:", stats.get(s.remoteCandidateId)?.address, s.nominated ? "(active)" : "");
            }
          }),
        );
      };

      dc.onmessage = (e) => {
        if (!(e.data instanceof ArrayBuffer)) return;
        const complete = assembler.process(e.data);
        if (!complete) return;
        try {
          const msg = parseMessage(complete);
          switch (msg.type) {
            case MSG.HANDSHAKE:
              resize(msg.width, msg.height);
              ctx = canvas?.getContext("2d", { willReadFrequently: true }) ?? null;
              setStatus("streaming");
              break;
            case MSG.FRAMEBUFFER:
              if (!ctx) break;
              for (const r of msg.rects) {
                const { width: w, height: h } = r.imageData;
                // a full frame in another size, e.g. after the tablet rotated
                if (r.x === 0 && r.y === 0 && w >= screenWidth * 0.9 && h >= screenHeight * 0.9) resize(w, h);
                ctx.putImageData(r.imageData, r.x, r.y);
              }
              break;
            case MSG.CURSOR:
              if (!ctx) break;
              penX = msg.x;
              penY = msg.y;
              moveCursor();
              break;
            case MSG.ROTATION:
              if (msg.degrees !== tabletRotation) {
                // shortest way to the new orientation
                const delta = ((msg.degrees - tabletRotation + 540) % 360) - 180;
                tabletRotation = msg.degrees;
                setRotation((r) => r + delta);
              }
              break;
          }
        } catch (err) {
          console.error("[screenshare] message error:", err);
          assembler.reset();
        }
      };

      dc.onclose = lost;
    },
    [lost],
  );

  const join = useCallback(async () => {
    try {
      setStatus("connecting");
      const offer = await getScreenshareOffer();

      pcRef.current?.close();
      const pc = new RTCPeerConnection({
        iceServers: offer.iceServers?.map((s) => ({
          urls: (s.url || s.urls)!,
          username: s.username,
          credential: s.credential,
        })),
      });
      pcRef.current = pc;
      pc.ondatachannel = (e) => attachChannel(e.channel);
      // Don't trickle ICE candidates. The tablet crashes on mDNS candidates.
      // The SDP answer already contains our ICE info for LAN connectivity.
      pc.onicecandidate = () => {};
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          cleanup();
          lost();
        }
      };

      const messages = offer.messages ?? [];
      const offerMsg = messages.find((m) => unwrap(m.payload)?.type === "offer");
      if (!offerMsg) throw new Error("No offer received from device");
      const sdp = unwrap(offerMsg.payload)!;
      await pc.setRemoteDescription({ type: "offer", sdp: sdp.description || sdp.sdp });

      for (const m of messages) {
        const inner = unwrap(m.payload);
        if (inner?.type === "candidate") {
          await pc.addIceCandidate({ candidate: inner.candidate, sdpMid: inner.mid || "0" });
        }
      }

      await pc.setLocalDescription(await pc.createAnswer());

      // wait for ICE gathering, so the relay candidates are in the SDP
      if (pc.iceGatheringState !== "complete") {
        await new Promise<void>((resolve) => {
          const check = () => {
            if (pc.iceGatheringState !== "complete") return;
            pc.removeEventListener("icegatheringstatechange", check);
            resolve();
          };
          pc.addEventListener("icegatheringstatechange", check);
          setTimeout(resolve, 5000);
        });
      }

      await sendScreenshareAnswer(offer.roomId, offerMsg.clientId, {
        type: "webtrc",
        payload: { type: "answer", description: pc.localDescription!.sdp },
      });
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }, [attachChannel, cleanup, lost]);

  // poll for a room the tablet opened
  useEffect(() => {
    if (status !== "waiting") return;
    const id = setInterval(() => {
      getScreenshareRoom()
        .then(() => {
          clearInterval(id);
          join();
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(id);
  }, [status, join]);

  useEffect(() => cleanup, [cleanup]);

  const disconnect = () => {
    if (dcRef.current?.readyState === "open") dcRef.current.send(shutdown());
    cleanup();
    setStatus("disconnected");
  };

  const reconnect = () => setStatus("waiting");
  const rotate = (degrees: number) => setRotation((r) => r + degrees);

  return { status, error, size, rotation, rotate, disconnect, reconnect, canvasRef, cursorRef };
}
