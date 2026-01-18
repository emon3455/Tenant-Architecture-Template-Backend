export interface IGenericResponse<T> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
    counts?: {
      ADMIN: number;
      CLIENT: number;
      CREW: number;
    };
  };
  data: T;
}

export const objectIdRegex = /^[a-f\d]{24}$/i;