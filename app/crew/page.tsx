import { getCrewMembers } from "@/app/actions/crew";
import CrewMembersPage from "../components/crew/CrewMembersPage";
import { createCrewMember, updateCrewMember, deleteCrewMember } from "../actions/crew";

export default async function CrewPage() {
  const crewMembers = await getCrewMembers();

  return (
    <CrewMembersPage
      initialCrewMembers={crewMembers}
      createCrewMember={createCrewMember}
      updateCrewMember={updateCrewMember}
      deleteCrewMember={deleteCrewMember}
    />
  );
}

