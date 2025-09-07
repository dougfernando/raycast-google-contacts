import { people_v1 } from "@googleapis/people";
import { Cache } from "@raycast/api";
import { Contact } from "./types";
import { createPeopleService } from "./google-auth";

export class ContactsService {
  private peopleService: people_v1.People;
  private cache: Cache;
  private static readonly CACHE_KEY = "google-contacts";
  private static readonly CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

  constructor(accessToken: string) {
    this.peopleService = createPeopleService(accessToken);
    this.cache = new Cache();
  }

  async getContacts(useCache: boolean = true): Promise<Contact[]> {
    if (useCache) {
      const cachedData = this.cache.get(ContactsService.CACHE_KEY);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const cacheTime = new Date(parsed.timestamp).getTime();
          const now = new Date().getTime();
          
          if (now - cacheTime < ContactsService.CACHE_EXPIRY) {
            console.log("Using cached contacts");
            return parsed.contacts;
          }
        } catch (error) {
          console.warn("Failed to parse cached contacts:", error);
        }
      }
    }

    try {
      console.log("Fetching fresh contacts from API");
      const response = await this.peopleService.people.connections.list({
        resourceName: "people/me",
        personFields: "names,emailAddresses,phoneNumbers,photos,addresses,organizations,urls,birthdays",
        pageSize: 1000,
        sortOrder: "FIRST_NAME_ASCENDING",
      });

      const contacts = this.transformContacts(response.data.connections || []);
      
      if (useCache) {
        this.cache.set(ContactsService.CACHE_KEY, JSON.stringify({
          contacts,
          timestamp: new Date().toISOString()
        }));
      }

      return contacts;
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

  clearCache(): void {
    this.cache.remove(ContactsService.CACHE_KEY);
    console.log("Cache cleared");
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
