import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RelayRankRow } from "@/components/relays/relay-rank-row";

describe("RelayRankRow", () => {
  it("uses a published name as the label and keeps the host route", () => {
    render(
      <ul>
        <RelayRankRow
          host="relay.example.com"
          rank={1}
          value="120"
          detail="relay.example.com · people list this relay"
          label="Example Relay"
          iconSrc="https://cdn.example/icon.png"
        />
      </ul>
    );

    const link = screen.getByRole("link", { name: /Example Relay/ });
    expect(link).toHaveAttribute("href", "/relays/relay.example.com");
    expect(link).not.toHaveTextContent("relay.example.com");
    expect(screen.getByText("relay.example.com · people list this relay")).toBeInTheDocument();
    const icon = document.querySelector("img");
    expect(icon).toHaveAttribute("src", "https://cdn.example/icon.png");
    expect(icon).toHaveAttribute("alt", "");
    expect(icon).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("leaves rows without a name addressed by host", () => {
    render(
      <ul>
        <RelayRankRow
          host="relay.example.com"
          value="120"
          detail="people list this relay"
          iconSrc="https://cdn.example/icon.png"
        />
      </ul>
    );

    expect(screen.getByRole("link", { name: "relay.example.com" })).toHaveAttribute(
      "href",
      "/relays/relay.example.com"
    );
    expect(document.querySelector("img")).toBeNull();
  });
});
