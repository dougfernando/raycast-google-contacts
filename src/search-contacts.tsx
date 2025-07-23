import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Image,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { authorize } from "./google-auth";
import { ContactsService } from "./contacts-service";
import { Contact } from "./types";

export default function SearchContacts() {
  console.log("SEARCH-CONTACTS: Component started");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    console.log("SEARCH-CONTACTS: useEffect running");
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
      console.log("SEARCH-CONTACTS: loadContacts started");
      setIsLoading(true);
      console.log("SEARCH-CONTACTS: Starting OAuth authorization...");

      const accessToken = await authorize();
      console.log(
        "SEARCH-CONTACTS: Authorization successful, creating contacts service..."
      );

      const contactsService = new ContactsService(accessToken);
      console.log("SEARCH-CONTACTS: Fetching contacts...");

      const allContacts = await contactsService.getContacts();
      console.log(`Loaded ${allContacts.length} contacts`);

      setContacts(allContacts);
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

  async function searchContacts(query: string) {
    try {
      // setIsLoading(false);
      console.log("Starting search with query:", query);

      const accessToken = await authorize();

      const contactsService = new ContactsService(accessToken);
      const searchResults = await contactsService.searchContacts(query);

      console.log(`Found ${searchResults.length} contacts matching query`);
      setContacts(searchResults);
    } catch (error) {
      console.error("Error in searchContacts:", error);
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