import PusherServer from "pusher";

import {
  BLOCK_CHANGED_EVENT,
  BOOKING_CHANNEL,
  BOOKING_CREATED_EVENT,
  BOOKING_UPDATED_EVENT,
} from "@/lib/realtime-constants";

const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;

const isRealtimeConfigured =
  Boolean(PUSHER_APP_ID) && Boolean(PUSHER_KEY) && Boolean(PUSHER_SECRET) && Boolean(PUSHER_CLUSTER);

let pusher: PusherServer | null = null;

if (isRealtimeConfigured) {
  pusher = new PusherServer({
    appId: PUSHER_APP_ID!,
    key: PUSHER_KEY!,
    secret: PUSHER_SECRET!,
    cluster: PUSHER_CLUSTER!,
    useTLS: true,
  });
}

export const notifyBookingEvent = async <TPayload extends object>(event: string, payload: TPayload) => {
  if (!pusher) {
    return;
  }

  await pusher.trigger(BOOKING_CHANNEL, event, payload);
};

export const notifyBookingCreated = async <TPayload extends object>(payload: TPayload) =>
  notifyBookingEvent(BOOKING_CREATED_EVENT, payload);

export const notifyBookingUpdated = async <TPayload extends object>(payload: TPayload) =>
  notifyBookingEvent(BOOKING_UPDATED_EVENT, payload);

export const notifyBlockChanged = async <TPayload extends object>(payload: TPayload) =>
  notifyBookingEvent(BLOCK_CHANGED_EVENT, payload);
