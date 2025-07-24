import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Image,
  Cache,
  LaunchProps,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { authorize } from "./google-auth";
import { ContactsService } from "./contacts-service";
import { Contact } from "./types";

const cache = new Cache();

interface Preferences {
  useCache: boolean;
}

export default function SearchContacts(props: LaunchProps) {
  console.log("SEARCH-CONTACTS: Component started");

  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    console.log("SEARCH-CONTACTS: initial load");
    loadContacts();
  }, []);

  useEffect(() => {
    if (searchText) {
      setIsLoading(true);
      const searchResults = allContacts.filter((contact) => {
        const nameMatch = contact.name.toLowerCase().includes(searchText.toLowerCase());
        const emailMatch = contact.emails.some((e) => e.value.toLowerCase().includes(searchText.toLowerCase()));
        const phoneMatch = contact.phoneNumbers.some((p) => p.value.toLowerCase().includes(searchText.toLowerCase()));
        return nameMatch || emailMatch || phoneMatch;
      });
      setContacts(searchResults);
      setIsLoading(false);
    } else {
      setContacts(allContacts);
    }
  }, [searchText, allContacts]);

  async function loadContacts(forceRefresh = false) {
    try {
      console.log("SEARCH-CONTACTS: loadContacts started");
      setIsLoading(true);

      if (preferences.useCache && !forceRefresh) {
        const cachedContacts = cache.get("contacts");
        if (cachedContacts) {
          console.log("SEARCH-CONTACTS: Loading contacts from cache");
          const parsedContacts = JSON.parse(cachedContacts);
          setAllContacts(parsedContacts);
          setContacts(parsedContacts);
          setIsLoading(false);
          return;
        }
      }

      console.log("SEARCH-CONTACTS: Starting OAuth authorization...");
      const accessToken = await authorize();
      console.log("SEARCH-CONTACTS: Authorization successful, creating contacts service...");

      const contactsService = new ContactsService(accessToken);
      console.log("SEARCH-CONTACTS: Fetching contacts...");

      const fetchedContacts = await contactsService.getContacts();
      console.log(`Loaded ${fetchedContacts.length} contacts`);

      if (preferences.useCache) {
        cache.set("contacts", JSON.stringify(fetchedContacts));
      }
      setAllContacts(fetchedContacts);
      setContacts(fetchedContacts);
    } catch (error) {
      console.error("Error in loadContacts:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load contacts",
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
        <ContactItem key={contact.id} contact={contact} onRefresh={() => loadContacts(true)} />
      ))}
    </List>
  );
}

function ContactItem({ contact, onRefresh }: { contact: Contact, onRefresh: () => void }) {
  const primaryEmail = contact.emails[0]?.value;
  const primaryPhone = contact.phoneNumbers[0]?.value;
  const primaryOrg = contact.organizations[0];
  
  let subtitle = primaryEmail || primaryPhone;
  if (primaryOrg && primaryOrg.name) {
    subtitle = primaryOrg.title ? `${primaryOrg.title} at ${primaryOrg.name}` : primaryOrg.name;
    if (primaryEmail || primaryPhone) {
      subtitle += ` • ${primaryEmail || primaryPhone}`;
    }
  }

  return (
    <List.Item
      title={contact.name}
      subtitle={subtitle}
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
            <Action.CopyToClipboard
              title="Copy Email"
              content={primaryEmail}
              icon={Icon.Envelope}
            />
          )}
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
          <Action
            title="Force Refresh"
            icon={Icon.RotateClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["ctrl"], key: "k" }}
          />
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
          icon={
            contact.photoUrl
              ? { source: contact.photoUrl, mask: Image.Mask.Circle }
              : Icon.Person
          }
        />
        {contact.birthdays.length > 0 && (
          <List.Item
            title="Birthday"
            subtitle={contact.birthdays[0].date || contact.birthdays[0].text || "Unknown"}
            icon={Icon.Calendar}
          />
        )}
      </List.Section>

      {contact.organizations.length > 0 && (
        <List.Section title="Work">
          {contact.organizations.map((org, index) => (
            <List.Item
              key={index}
              title={org.title || "Position"}
              subtitle={org.name}
              icon={Icon.Building}
            />
          ))}
        </List.Section>
      )}

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

      {contact.addresses.length > 0 && (
        <List.Section title="Addresses">
          {contact.addresses.map((address, index) => (
            <List.Item
              key={index}
              title={address.type || "Address"}
              subtitle={address.formattedValue}
              icon={Icon.Map}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Address"
                    content={address.formattedValue}
                  />
                  <Action.OpenInBrowser
                    title="Open in Maps"
                    url={`https://maps.google.com/maps?q=${encodeURIComponent(address.formattedValue)}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {contact.urls.length > 0 && (
        <List.Section title="Websites">
          {contact.urls.map((url, index) => (
            <List.Item
              key={index}
              title={url.type || "Website"}
              subtitle={url.value}
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Website"
                    url={url.value}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={url.value}
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