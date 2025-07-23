import { people_v1 } from "googleapis";
import { Contact } from "./types";
import { createPeopleService } from "./google-auth";

export class ContactsService {
  private peopleService: people_v1.People;

  constructor(accessToken: string) {
    this.peopleService = createPeopleService(accessToken);
  }

  async getContacts(): Promise<Contact[]> {
    try {
      const response = await this.peopleService.people.connections.list({
        resourceName: "people/me",
        personFields: "names,emailAddresses,phoneNumbers,photos",
        pageSize: 1000,
        sortOrder: "FIRST_NAME_ASCENDING",
      });

      return this.transformContacts(response.data.connections || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      throw new Error("Failed to fetch contacts");
    }
  }

  async searchContacts(query: string): Promise<Contact[]> {
    try {
      const response = await this.peopleService.people.searchContacts({
        query,
        readMask: "names,emailAddresses,phoneNumbers,photos",
        pageSize: 50,
      });

      return this.transformContacts(response.data.results?.map(r => r.person) || []);
    } catch (error) {
      console.error("Error searching contacts:", error);
      throw new Error("Failed to search contacts");
    }
  }

  private transformContacts(people: people_v1.Schema$Person[]): Contact[] {
    return people
      .filter((person) => person.names && person.names.length > 0)
      .map((person) => ({
        id: person.resourceName || "",
        name: person.names?.[0]?.displayName || "Unknown",
        emails: person.emailAddresses?.map((email) => ({
          value: email.value || "",
          type: email.type || "unknown",
        })) || [],
        phoneNumbers: person.phoneNumbers?.map((phone) => ({
          value: phone.value || "",
          type: phone.type || "unknown",
        })) || [],
        photoUrl: person.photos?.[0]?.url,
      }));
  }
}