import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Image,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { authorize } from "./google-auth";
import { ContactsService } from "./contacts-service";
import { Contact } from "./types";

interface Preferences {
  googleClientId: string;
}

export default function SearchContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (searchText) {
      searchContacts(searchText);
    } else {
      loadContacts();
    }
  }, [searchText]);

  async function loadContacts() {
    try {
      setIsLoading(true);
      const accessToken = await authorize();
      const contactsService = new ContactsService(accessToken);
      const allContacts = await contactsService.getContacts();
      setContacts(allContacts);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load contacts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function searchContacts(query: string) {
    try {
      setIsLoading(true);
      const accessToken = await authorize();
      const contactsService = new ContactsService(accessToken);
      const searchResults = await contactsService.searchContacts(query);
      setContacts(searchResults);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search contacts..."
      throttle
    >
      {contacts.map((contact) => (
        <ContactItem key={contact.id} contact={contact} />
      ))}
    </List>
  );
}

function ContactItem({ contact }: { contact: Contact }) {
  const primaryEmail = contact.emails[0]?.value;
  const primaryPhone = contact.phoneNumbers[0]?.value;

  return (
    <List.Item
      title={contact.name}
      subtitle={primaryEmail || primaryPhone}
      icon={
        contact.photoUrl
          ? { source: contact.photoUrl, mask: Image.Mask.Circle }
          : Icon.Person
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={<ContactDetails contact={contact} />}
          />
          {primaryEmail && (
            <Action.OpenInBrowser
              title="Send Email"
              url={`mailto:${primaryEmail}`}
              icon={Icon.Envelope}
            />
          )}
          {primaryPhone && (
            <Action.CopyToClipboard
              title="Copy Phone Number"
              content={primaryPhone}
              icon={Icon.Phone}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function ContactDetails({ contact }: { contact: Contact }) {
  return (
    <List>
      <List.Section title="Contact Information">
        <List.Item
          title="Name"
          subtitle={contact.name}
          icon={Icon.Person}
        />
      </List.Section>

      {contact.emails.length > 0 && (
        <List.Section title="Email Addresses">
          {contact.emails.map((email, index) => (
            <List.Item
              key={index}
              title={email.type || "Email"}
              subtitle={email.value}
              icon={Icon.Envelope}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Send Email"
                    url={`mailto:${email.value}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={email.value}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {contact.phoneNumbers.length > 0 && (
        <List.Section title="Phone Numbers">
          {contact.phoneNumbers.map((phone, index) => (
            <List.Item
              key={index}
              title={phone.type || "Phone"}
              subtitle={phone.value}
              icon={Icon.Phone}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Phone Number"
                    content={phone.value}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}