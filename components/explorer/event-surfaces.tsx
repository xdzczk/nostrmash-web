import Link from "@/components/app-link";

import { EventLabelSummary } from "@/components/explorer/event-label-summary";
import { EmptyState } from "@/components/explorer/empty-state";
import { Timestamp } from "@/components/explorer/timestamp";
import { ShareBar } from "@/components/relays/share-bar";
import { ErrorPanel } from "@/components/ui/status-panels";
import { SectionCard } from "@/components/ui/section-card";
import { ApiError } from "@/lib/api/errors";
import { getEventGoal, getEventLabels, getEventPoll, getLiveChat } from "@/lib/api/endpoints";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { GOAL_KIND, LIVE_ACTIVITY_KIND, POLL_KIND } from "@/lib/notes/kinds";
import { getLivePresentation } from "@/lib/notes/live-activity";
import { goalSats, pollTypeLabel } from "@/lib/stats/surface-display";
import type { EventRecord } from "@/lib/types/api";
import type {
  EventGoalResponse,
  EventLabelsResponse,
  EventPollResponse,
  LiveChatResponse,
  ZapGoal,
} from "@/lib/types/surfaces";

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Request failed.");
}

function quiet(error: unknown, fallback: string): string | null {
  if (error instanceof ApiError && error.isNotFound) return null;
  return toUserFacingErrorMessage(error, fallback);
}

function eventIdOf(event: EventRecord): string {
  if (typeof event.id === "string" && event.id.length > 0) return event.id;
  if (typeof event.event_id === "string" && event.event_id.length > 0) return event.event_id;
  return "";
}

function liveAddress(event: EventRecord): string | null {
  const presentation = getLivePresentation(event);
  const pubkey = typeof event.pubkey === "string" ? event.pubkey.trim().toLowerCase() : "";
  if (!presentation?.identifier || !/^[0-9a-f]{64}$/.test(pubkey)) return null;
  const kind = typeof event.kind === "number" ? event.kind : LIVE_ACTIVITY_KIND;
  return `${kind}:${pubkey}:${presentation.identifier}`;
}

function PollCard({ poll }: { poll: EventPollResponse }) {
  const options = poll.options ?? [];
  const counts = new Map((poll.counts ?? []).map((count) => [count.option_id, count.votes ?? 0]));
  const rows =
    options.length > 0
      ? options.map((option) => ({
          id: option.id,
          label: option.label,
          votes: counts.get(option.id) ?? 0,
        }))
      : (poll.counts ?? []).map((count) => ({
          id: count.option_id,
          label: count.option_id,
          votes: count.votes ?? 0,
        }));
  if (!poll.question && rows.length === 0) {
    return <EmptyState message="This poll has no options or votes in the index yet." />;
  }
  const max = Math.max(...rows.map((row) => row.votes), 1);
  const type = pollTypeLabel(poll.poll_type);
  return (
    <SectionCard title="Poll" description={type ?? undefined}>
      {poll.question ? <p className="text-ink mb-4 text-sm leading-6">{poll.question}</p> : null}
      {rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-ink-soft text-sm">{row.label}</span>
                <span className="text-ink text-sm font-medium tabular-nums">
                  {row.votes.toLocaleString()}
                </span>
              </div>
              <ShareBar
                value={row.votes}
                max={max}
                label={`${row.label}, ${row.votes.toLocaleString()} votes`}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="Votes have not been tallied for this poll yet." />
      )}
    </SectionCard>
  );
}

function GoalCard({ goal }: { goal: ZapGoal }) {
  const target = goalSats(goal.amount_msats);
  const raised = goal.raised_sats ?? 0;
  const max = target && target > 0 ? target : Math.max(raised, 1);
  return (
    <SectionCard title="Zap goal">
      {goal.summary ? <p className="text-ink-soft mb-3 text-sm leading-6">{goal.summary}</p> : null}
      <p className="text-ink text-sm tabular-nums">
        {raised.toLocaleString()} sats raised
        {target ? ` of ${Math.round(target).toLocaleString()} sats` : ""}
      </p>
      {target ? (
        <ShareBar
          value={raised}
          max={max}
          label={`${raised.toLocaleString()} of ${Math.round(target).toLocaleString()} sats`}
        />
      ) : raised === 0 && target === null ? (
        <EmptyState message="This goal has no target or progress in the index yet." />
      ) : null}
      <p className="mt-3">
        <Link href={`/notes/${encodeURIComponent(goal.event_id)}`} className="text-link text-sm">
          Open goal event
        </Link>
      </p>
    </SectionCard>
  );
}

export async function ProvenanceLabelCount({ eventId }: { eventId: string }) {
  let count = 0;
  try {
    const payload = await getEventLabels(eventId);
    count = new Set(
      (payload.labels ?? [])
        .filter((label) => label.label.trim().length > 0)
        .map((label) => `${label.namespace ?? ""}:${label.label.trim()}`)
    ).size;
  } catch {
    return null;
  }
  if (count === 0) return null;
  return (
    <p className="text-ink-muted text-sm">
      {count.toLocaleString()} distinct {count === 1 ? "label" : "labels"}
    </p>
  );
}

export async function EventSurfaces({ event }: { event: EventRecord }) {
  const id = eventIdOf(event);
  const kind = typeof event.kind === "number" ? event.kind : undefined;
  if (!id) return null;

  const labelsPromise: Promise<EventLabelsResponse | Error> = getEventLabels(id).catch(asError);
  const pollPromise: Promise<EventPollResponse | Error | null> =
    kind === POLL_KIND ? getEventPoll(id).catch(asError) : Promise.resolve(null);
  const goalPromise: Promise<EventGoalResponse | Error | null> =
    kind === GOAL_KIND ? getEventGoal(id).catch(asError) : Promise.resolve(null);
  const address = kind === LIVE_ACTIVITY_KIND ? liveAddress(event) : null;
  const chatPromise: Promise<LiveChatResponse | Error | null> = address
    ? getLiveChat(address).catch(asError)
    : Promise.resolve(null);

  const [labelsResult, pollResult, goalResult, chatResult] = await Promise.all([
    labelsPromise,
    pollPromise,
    goalPromise,
    chatPromise,
  ]);

  const labelsError =
    labelsResult instanceof Error ? quiet(labelsResult, "Labels are unavailable.") : null;
  const labels =
    labelsResult && !(labelsResult instanceof Error) ? (labelsResult.labels ?? []) : [];

  const pollError =
    pollResult instanceof Error ? quiet(pollResult, "This poll is unavailable.") : null;
  const goalError =
    goalResult instanceof Error ? quiet(goalResult, "This goal is unavailable.") : null;
  const chatError =
    chatResult instanceof Error ? quiet(chatResult, "Live chat counts are unavailable.") : null;
  const chat = chatResult && !(chatResult instanceof Error) ? chatResult : null;

  return (
    <div className="mt-4 space-y-4">
      {labelsError ? <ErrorPanel message={labelsError} title="Couldn't load labels" /> : null}
      {labels.length > 0 ? <EventLabelSummary labels={labels} /> : null}
      {kind === POLL_KIND ? (
        pollError ? (
          <ErrorPanel message={pollError} title="Couldn't load this poll" />
        ) : pollResult && !(pollResult instanceof Error) ? (
          <PollCard poll={pollResult} />
        ) : (
          <EmptyState message="This poll has no options or votes in the index yet." />
        )
      ) : null}
      {kind === GOAL_KIND ? (
        goalError ? (
          <ErrorPanel message={goalError} title="Couldn't load this goal" />
        ) : goalResult && !(goalResult instanceof Error) && goalResult.event_id ? (
          <GoalCard goal={{ ...goalResult, event_id: goalResult.event_id }} />
        ) : (
          <EmptyState message="This goal has no target or progress in the index yet." />
        )
      ) : null}
      {kind === LIVE_ACTIVITY_KIND ? (
        <SectionCard title="Live chat">
          {chatError ? (
            <ErrorPanel message={chatError} title="Couldn't load chat counts" />
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-ink tabular-nums">
                {(chat?.chat_count ?? 0).toLocaleString()} chat messages from{" "}
                {(chat?.unique_chatters ?? 0).toLocaleString()} people
              </p>
              {(chat?.chat_count ?? 0) === 0 && (chat?.unique_chatters ?? 0) === 0 ? (
                <p className="text-ink-muted">No chat messages are in the index for this stream.</p>
              ) : null}
              {typeof chat?.last_chat_at === "number" ? (
                <p className="text-ink-faint text-xs">
                  Last message <Timestamp unixSeconds={chat.last_chat_at} />
                </p>
              ) : null}
            </div>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
