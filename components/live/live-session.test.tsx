import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveSession } from "@/lib/notes/live-playback";

vi.mock("hls.js", () => {
  class MockHls {
    static isSupported() {
      return true;
    }
    static Events = {
      ERROR: "hlsError",
      MANIFEST_PARSED: "hlsManifestParsed",
    };
    static ErrorTypes = {
      NETWORK_ERROR: "networkError",
      MEDIA_ERROR: "mediaError",
    };
    loadSource() {}
    attachMedia() {}
    on(event: string, callback: () => void) {
      if (event === MockHls.Events.MANIFEST_PARSED) callback();
    }
    startLoad() {}
    recoverMediaError() {}
    destroy() {}
  }
  return { default: MockHls };
});

import {
  LivePlaybackFrame,
  LiveSessionProvider,
  LiveWatchButton,
} from "@/components/live/live-session";

const session: LiveSession = {
  key: "harbor",
  title: "Harbor live",
  streaming: "https://media.example.invalid/live.m3u8",
  href: "/notes/harbor",
  image: "https://media.example.invalid/live.jpg",
  authorLabel: "Harbor",
};

function Harness({ showFrame = true }: { showFrame?: boolean }) {
  return (
    <LiveSessionProvider>
      {showFrame ? (
        <LivePlaybackFrame sessionKey={session.key} title={session.title} image={session.image} />
      ) : null}
      <LiveWatchButton session={session} />
    </LiveSessionProvider>
  );
}

function RemovableFrame() {
  const [showFrame, setShowFrame] = useState(true);
  return (
    <LiveSessionProvider>
      {showFrame ? (
        <LivePlaybackFrame sessionKey={session.key} title={session.title} image={session.image} />
      ) : (
        <p>Other page</p>
      )}
      <LiveWatchButton session={session} />
      <button type="button" onClick={() => setShowFrame(false)}>
        Leave page
      </button>
    </LiveSessionProvider>
  );
}

describe("LiveSessionProvider", () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.pause = vi.fn();
  });

  it("plays inside the card, then keeps the same element while browsing", async () => {
    const user = userEvent.setup();
    render(<RemovableFrame />);

    await user.click(screen.getByRole("button", { name: "Watch" }));
    const inline = await screen.findByRole("group", { name: "Harbor live player" });
    const video = inline.querySelector("video");
    expect(video).toBeInstanceOf(HTMLVideoElement);
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Play in background" }));
    const dock = screen.getByRole("region", { name: "Playing Harbor live" });
    expect(dock.querySelector("video")).toBe(video);
    expect(screen.queryByRole("group", { name: "Harbor live player" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show here" }));
    expect(screen.getByRole("group", { name: "Harbor live player" }).querySelector("video")).toBe(
      video
    );

    await user.click(screen.getByRole("button", { name: "Leave page" }));
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: "Playing Harbor live" }).querySelector("video")
      ).toBe(video);
    });
    expect(screen.getByText("Other page")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Harbor live player" })).not.toBeInTheDocument();
  });

  it("links out when the streaming URL is not a media playlist", () => {
    render(
      <LiveSessionProvider>
        <LiveWatchButton
          session={{
            key: "page",
            title: "A page",
            streaming: "https://example.com/watch",
          }}
        />
      </LiveSessionProvider>
    );
    expect(screen.getByRole("link", { name: "Stream" })).toHaveAttribute(
      "href",
      "https://example.com/watch"
    );
    expect(screen.queryByRole("button", { name: "Watch" })).not.toBeInTheDocument();
  });

  it("stops playback from the dock", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Watch" }));
    await screen.findByRole("group", { name: "Harbor live player" });
    await user.click(screen.getByRole("button", { name: "Play in background" }));
    await user.click(screen.getByRole("button", { name: "Stop stream" }));
    expect(screen.queryByRole("region", { name: "Playing Harbor live" })).not.toBeInTheDocument();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
});
