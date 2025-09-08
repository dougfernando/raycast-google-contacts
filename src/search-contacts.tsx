import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Image,
  getPreferenceValues,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { authorize } from "./google-auth";
import { ContactsService } from "./contacts-service";
import { Contact } from "./types";

interface Preferences {
  googleClientId: string;
  googleClientSecret: string;
  useCache: boolean;
}

export default function SearchContacts() {
  console.log("SEARCH-CONTACTS: Component started");

  const preferences = getPreferenceValues<Preferences>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("SEARCH-CONTACTS: useEffect running");
    loadContacts();
  }, []);

  async function loadContacts(forceRefresh = false) {
    try {
      console.log("SEARCH-CONTACTS: loadContacts started");
      setIsLoading(true);

      const contactsService = new ContactsService();
      console.log("SEARCH-CONTACTS: Fetching contacts...");

      const useCache = preferences.useCache && !forceRefresh;
      const fetchedContacts = await contactsService.getContacts(useCache);
      console.log(`Loaded ${fetchedContacts.length} contacts`);

      setContacts(fetchedContacts);
    } catch (error) {
      console.error("Error in loadContacts:", error);
      
      // Provide more helpful error messages
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes("OAuth credentials not configured")) {
          errorMessage = "Please configure your Google OAuth credentials in preferences";
        } else if (error.message.includes("authentication")) {
          errorMessage = "Authentication failed. Please try again";
        }
      }
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load contacts",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function debugAuth() {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Checking authentication...",
      });

      const token = await authorize();
      
      showToast({
        style: Toast.Style.Success,
        title: "Authentication successful",
        message: `Token obtained (${token.substring(0, 10)}...)`,
      });
    } catch (error) {
      console.error("Debug auth error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function refreshContacts() {
    try {
      const contactsService = new ContactsService();
      contactsService.clearCache();
      
      showToast({
        style: Toast.Style.Success,
        title: "Cache cleared",
        message: "Refreshing contacts...",
      });
      
      await loadContacts(true);
    } catch (error) {
      console.error("Error refreshing contacts:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }


  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search contacts..."
      filtering
      actions={
        <ActionPanel>
          <Action
            title="Refresh Contacts"
            icon={Icon.ArrowClockwise}
            onAction={refreshContacts}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Debug Authentication"
            icon={Icon.Bug}
            onAction={debugAuth}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
        </ActionPanel>
      }
    >
      {contacts.map((contact) => (
        <ContactItem key={contact.id} contact={contact} refreshContacts={refreshContacts} />
      ))}
    </List>
  );
}

function ContactItem({ contact, refreshContacts }: { contact: Contact; refreshContacts: () => void }) {
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

  // Create searchable keywords for Raycast's fuzzy finder
  const keywords = [
    contact.name,
    ...contact.emails.map(email => email.value),
    ...contact.phoneNumbers.map(phone => phone.value),
    ...contact.organizations.map(org => [org.name, org.title].filter(Boolean)).flat(),
    ...contact.addresses.map(addr => addr.formattedValue),
  ].filter(Boolean).join(' ');

  return (
    <List.Item
      title={contact.name}
      subtitle={subtitle}
      keywords={[keywords]}
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
          <Action
            title="Refresh Contacts"
            icon={Icon.ArrowClockwise}
            onAction={refreshContacts}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
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