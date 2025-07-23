export interface Contact {
  id: string;
  name: string;
  emails: Email[];
  phoneNumbers: PhoneNumber[];
  addresses: Address[];
  organizations: Organization[];
  urls: Url[];
  birthdays: Birthday[];
  photoUrl?: string;
}

export interface Email {
  value: string;
  type?: string;
}

export interface PhoneNumber {
  value: string;
  type?: string;
}

export interface Address {
  formattedValue: string;
  type?: string;
  streetAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export interface Organization {
  name: string;
  title?: string;
  type?: string;
}

export interface Url {
  value: string;
  type?: string;
}

export interface Birthday {
  date: string;
  text?: string;
}