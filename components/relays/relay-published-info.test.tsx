import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RelayPublishedInfo } from "@/components/relays/relay-published-info";
import type { Nip11Document } from "@/lib/types/api";

const pubkey = "cd".repeat(32);

const document: Nip11Document = {
  fetched_at: "2026-10-29T12:00:00Z",
  ok: true,
  info: {
    name: "Example Relay",
    description: "Public relay",
    contact: "ops@example.com",
    pubkey,
    software: "https://github.com/hoytech/strfry",
    limitation: { auth_required: false, payment_required: true },
  },
};

describe("RelayPublishedInfo", () => {
  it("shows the relay's own description and links the pubkey", () => {
    render(<RelayPublishedInfo nip11={document} />);

    expect(screen.getByRole("heading", { name: "Example Relay" })).toBeInTheDocument();
    expect(screen.getByText(/what this relay publishes about itself/i)).toBeInTheDocument();
    expect(screen.getByText("Public relay")).toBeInTheDocument();
    expect(screen.getByText("ops@example.com").closest("a")).toBeNull();
    expect(screen.getByRole("link", { name: pubkey })).toHaveAttribute(
      "href",
      `/profiles/${pubkey}`
    );
    expect(screen.getByRole("link", { name: "https://github.com/hoytech/strfry" })).toHaveAttribute(
      "href",
      "https://github.com/hoytech/strfry"
    );
    expect(screen.getByText("Not required")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("keeps a name-only document as a finished section", () => {
    render(
      <RelayPublishedInfo
        nip11={{ fetched_at: "2026-10-29T12:00:00Z", ok: true, info: { name: "Example Relay" } }}
      />
    );
    expect(screen.getByRole("heading", { name: "Example Relay" })).toBeInTheDocument();
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
  });

  it("says nothing when no fetch has completed", () => {
    const { container } = render(<RelayPublishedInfo nip11={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("uses one quiet line for a failed fetch and hides the code", () => {
    const { rerender } = render(
      <RelayPublishedInfo
        nip11={{ fetched_at: "2026-10-29T12:00:00Z", ok: false, error: "http_404" }}
      />
    );
    expect(screen.getByText("This relay does not publish a description.")).toBeInTheDocument();
    expect(screen.queryByText(/http_404/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();

    rerender(
      <RelayPublishedInfo
        nip11={{ fetched_at: "2026-10-29T12:00:00Z", ok: false, error: "timeout" }}
      />
    );
    expect(screen.getByText("The relay description could not be read.")).toBeInTheDocument();
    expect(screen.queryByText(/timeout/)).not.toBeInTheDocument();
  });
});
