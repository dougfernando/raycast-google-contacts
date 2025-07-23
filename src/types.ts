export interface Contact {
  id: string;
  name: string;
  emails: Email[];
  phoneNumbers: PhoneNumber[];
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