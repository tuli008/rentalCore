import { getEventWithDetails, updateEvent, deleteEvent } from "@/app/actions/events";
import EventDetailPage from "@/app/components/events/EventDetailPage";
import { notFound } from "next/navigation";

export default async function EventDetailPageRoute({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const eventId = resolvedParams.id;

  if (!eventId) {
    notFound();
  }

  const { event, inventory, crew, tasks } = await getEventWithDetails(eventId);

  if (!event) {
    notFound();
  }

  return (
    <EventDetailPage
      event={event}
      inventory={inventory}
      crew={crew}
      tasks={tasks}
      updateEvent={updateEvent}
      deleteEvent={deleteEvent}
    />
  );
}
