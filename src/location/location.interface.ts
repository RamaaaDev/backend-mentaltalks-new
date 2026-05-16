export interface ICreateLocationBody {
  location_name: string;
  location_address: string;
  location_addressDetail: string;
  location_navigation: string | null;
  location_photos: string[];
}

export interface IUpdateLocationBody {
  location_name?: string;
  location_address?: string;
  location_addressDetail?: string;
  location_navigation?: string;
  location_photos?: string[];
}

export interface ILocationData {
  location_id: string;
  location_name: string;
  location_address: string;
  location_addressDetail: string;
  location_navigation: string | null;
  location_photos: string[];
  location_createdAt: Date;
  location_updateAt: Date;
}

export interface ILocationResponse {
  message: string;
  data: ILocationData;
}

export interface ILocationListResponse {
  message: string;
  data: ILocationData[];
}

export interface ILocationDeleteResponse {
  message: string;
}
