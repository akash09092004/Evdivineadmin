import React from "react";
import DropMeList from "./DropMeList";

export default function ContactUser() {
  return (
    <DropMeList
      title="Contact User"
      subtitle="Incoming contact requests ko review, filter aur update karo"
      sectionTitle="Contact User Requests"
      sectionSubtitle="Har message ka detail view aur status action yahin available hai."
      refreshLabel="Refresh"
      loadingLabel="Contact requests loading..."
      enableReplyComposer
    />
  );
}
