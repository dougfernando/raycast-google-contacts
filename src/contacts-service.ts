import { people_v1 } from "@googleapis/people";
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
        personFields: "names,emailAddresses,phoneNumbers,photos,addresses,organizations,urls,birthdays",
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
        readMask: "names,emailAddresses,phoneNumbers,photos,addresses,organizations,urls,birthdays",
        pageSize: 50,
      });

      return this.transformContacts(
        response.data.results?.map((r) => r.person).filter((p): p is people_v1.Schema$Person => !!p) || []
      );
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
        emails:
          person.emailAddresses?.map((email) => ({
            value: email.value || "",
            type: email.type || "unknown",
          })) || [],
        phoneNumbers:
          person.phoneNumbers?.map((phone) => ({
            value: phone.value || "",
            type: phone.type || "unknown",
          })) || [],
        addresses:
          person.addresses?.map((address) => ({
            formattedValue: address.formattedValue || "",
            type: address.type || "unknown",
            streetAddress: address.streetAddress || undefined,
            city: address.city || undefined,
            region: address.region || undefined,
            postalCode: address.postalCode || undefined,
            country: address.country || undefined,
          })) || [],
        organizations:
          person.organizations?.map((org) => ({
            name: org.name || "",
            title: org.title,
            type: org.type || "unknown",
          })) || [],
        urls:
          person.urls?.map((url) => ({
            value: url.value || "",
            type: url.type || "unknown",
          })) || [],
        birthdays:
          person.birthdays?.map((birthday) => {
            const date = birthday.date;
            let dateString = "";
            if (date?.month && date?.day) {
              dateString = `${date.month}/${date.day}`;
              if (date.year) {
                dateString += `/${date.year}`;
              }
            }
            return {
              date: dateString,
              text: birthday.text,
            };
          }) || [],
        photoUrl: person.photos?.[0]?.url,
      }));
  }
}
