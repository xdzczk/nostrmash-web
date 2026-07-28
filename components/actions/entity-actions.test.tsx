import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CopyValueButton } from "@/components/actions/copy-value-button";
import { EntityActions } from "@/components/actions/entity-actions";
import { ToastProvider } from "@/components/ui/toast";

describe("EntityActions", () => {
  it("copies identifier, share link, and embed snippet with toast feedback", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <EntityActions
          kind="note"
          absoluteUrl="https://nostrmash.com/notes/abc"
          identifier="nevent1abc"
          nostrUri="nostr:nevent1abc"
          njumpUrl="https://njump.me/nevent1abc"
          embedHtml="<iframe src='https://nostrmash.com/embed/notes/abc'></iframe>"
        />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /copy nevent/i }));
    await waitFor(() => {
      expect(screen.getByText(/copied note id/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^share$/i }));
    await waitFor(() => {
      expect(screen.getByText(/link copied|shared/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /open in njump/i })).toHaveAttribute(
      "href",
      "https://njump.me/nevent1abc"
    );
    expect(screen.getByRole("link", { name: /damus/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /amethyst/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open in client/i })).toHaveAttribute(
      "href",
      "nostr:nevent1abc"
    );

    await user.click(screen.getByRole("button", { name: /^embed$/i }));
    await waitFor(() => {
      expect(screen.getByText(/embed snippet copied/i)).toBeInTheDocument();
    });
  });
});

describe("CopyValueButton", () => {
  it("shows copied toast after click", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <CopyValueButton value="npub1abc" />
      </ToastProvider>
    );
    await user.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => {
      expect(screen.getByText(/^copied$/i)).toBeInTheDocument();
    });
  });
});
