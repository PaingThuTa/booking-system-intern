import Pusher from "pusher-js";

import { BOOKING_CHANNEL } from "@/lib/realtime-constants";

let client: Pusher | null = null;

export const getRealtimeClient = () => {
  if (client) return client;

  if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
    return null;
  }

  client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  });

  return client;
};

export const subscribeToBookingChannel = (event: string, callback: (data: unknown) => void) => {
  const pusher = getRealtimeClient();
  if (!pusher) return () => undefined;

  const channel = pusher.subscribe(BOOKING_CHANNEL);
  channel.bind(event, callback);

  return () => {
    channel.unbind(event, callback);
  };
};
